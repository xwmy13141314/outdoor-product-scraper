import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, CheckCircle, XCircle, Search, Package, List, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Product {
  id?: string;
  name: string;
  brand?: string;
  image_url?: string;
  detail_url?: string;
  
  // 基本信息
  release_date?: string;
  dimensions?: string;
  weight?: string;
  
  // 显示屏
  display_size?: string;
  display_resolution?: string;
  display_type?: string;
  display_protection?: string;
  
  // 性能
  os?: string;
  chipset?: string;
  cpu?: string;
  cpu_details?: string;
  gpu?: string;
  
  // 存储
  ram?: string;
  storage?: string;
  
  // 相机
  main_camera?: string;
  selfie_camera?: string;
  video?: string;
  
  // 电池
  battery?: string;
  battery_life?: string;
  charging?: string;
  fast_charging?: string;
  wireless_charging?: boolean;
  
  // 网络
  network?: string;
  
  // 防水防尘
  waterproof_rating?: string;
  
  // 其他特性
  nfc?: boolean;
  usb_type?: string;
  audio_jack?: boolean;
  colors?: string[];
  price?: string;
  special_features?: string[];
  features?: Record<string, unknown>;
}

interface ScrapeResult {
  id: string;
  title: string;
  pageType: string;
  data: {
    products?: Product[];
    product?: Product;
    count?: number;
  } | null;
  success: boolean;
  feishuSync?: {
    success: boolean;
    action?: string;
    error?: string;
  };
}

interface ScrapeHistory {
  id: string;
  url: string;
  title: string | null;
  status: string;
  page_type: string | null;
  products_count: number;
  created_at: string;
  error_message: string | null;
  feishu_synced: boolean;
  feishu_sync_action: string | null;
  feishu_sync_status: string | null;
}

const Index = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScrapeHistory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [testingFeishu, setTestingFeishu] = useState(false);
  const [feishuTestResult, setFeishuTestResult] = useState<string | null>(null);
  const [testingScrape, setTestingScrape] = useState(false);
  const [testingSimpleWrite, setTestingSimpleWrite] = useState(false);
  const [testingDebugWrite, setTestingDebugWrite] = useState(false);

  const handleScrape = async () => {
    if (!url) {
      setError('请输入有效的 URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('scrape-product', {
        body: { url },
      });

      if (functionError) throw functionError;

      if (data.success) {
        setResult(data);
        loadHistory();
        
        // 加载产品数据
        if (data.id) {
          loadProducts(data.id);
        }
      } else {
        setError(data.error || '抓取失败');
      }
    } catch (err) {
      console.error('Scrape error:', err);
      setError((err as Error).message || '网络请求失败，请检查 URL 是否正确');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('product_scrapes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const loadProducts = async (scrapeId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('scrape_id', scrapeId);

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadHistoryProducts = async (scrapeId: string) => {
    await loadProducts(scrapeId);
    
    // 同时加载该记录的数据
    const { data } = await supabase
      .from('product_scrapes')
      .select('*')
      .eq('id', scrapeId)
      .single();
    
    if (data) {
      setResult({
        id: data.id,
        title: data.title || '',
        pageType: data.page_type || 'unknown',
        data: data.product_data || null,
        success: true,
      });
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const testFeishuConnection = async () => {
    setTestingFeishu(true);
    setFeishuTestResult(null);

    try {
      console.log('Running Feishu diagnostic...');

      const { data, error } = await supabase.functions.invoke('feishu-diagnostic', {
        body: {},
      });

      console.log('Diagnostic response:', { data, error });

      if (error) {
        console.error('Diagnostic error:', error);
        setFeishuTestResult(`❌ 诊断失败: ${error.message}`);
      } else if (data && data.success) {
        console.log('Diagnostic success:', data);
        const stepsList = (data.steps || []).join('\n');
        
        setFeishuTestResult(
          `${data.message}\n\n诊断步骤:\n${stepsList}\n\n记录ID: ${data.record_id || 'N/A'}\n\n⚠️ 请立即检查飞书表格是否有新记录！`
        );
      } else if (data && !data.success) {
        console.error('Diagnostic failed:', data);
        const stepsList = (data.steps || []).join('\n');
        const guide = data.guide || '';
        
        setFeishuTestResult(
          `❌ 诊断失败: ${data.error}\n\n诊断步骤:\n${stepsList}\n\n${guide}`
        );
      } else {
        setFeishuTestResult(`⚠️ 未知响应: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('Diagnostic exception:', err);
      setFeishuTestResult(`❌ 异常: ${(err as Error).message}`);
    } finally {
      setTestingFeishu(false);
    }
  };

  const testFullScrape = async () => {
    setTestingScrape(true);
    setError(null);
    setFeishuTestResult(null);

    try {
      const testUrl = 'https://www.gsmarena.com/samsung_galaxy_xcover7_pro-13780.php';
      
      console.log('Testing full scrape flow for:', testUrl);

      const { data, error: functionError } = await supabase.functions.invoke('test-scrape', {
        body: { url: testUrl },
      });

      if (functionError) {
        console.error('Test scrape error:', functionError);
        setFeishuTestResult(`❌ 测试失败: ${functionError.message}`);
      } else if (data && data.success) {
        console.log('Test scrape success:', data);
        
        let feishuStatus = '未知';
        if (data.steps.feishu.action === 'created') {
          feishuStatus = '✅ 新增成功';
        } else if (data.steps.feishu.action === 'failed') {
          feishuStatus = `❌ 失败 - ${data.steps.feishu.error || '未知错误'}`;
        } else {
          feishuStatus = data.steps.feishu.action;
        }
        
        setFeishuTestResult(
          `✅ 完整流程测试成功！\n` +
          `1. 抓取: ${data.steps.fetch.size} 字符\n` +
          `2. 提取: ${data.steps.extract.size} 字符\n` +
          `3. AI识别: ${data.steps.ai.product}\n` +
          `4. 飞书同步: ${feishuStatus}\n` +
          `5. 数据库: ${data.steps.database.saved ? '已保存' : '保存失败'}`
        );
        setResult({
          id: 'test',
          title: data.product.name,
          pageType: 'product_detail',
          data: { product: data.product },
          success: true,
          feishuSync: data.feishu,
        });
      } else {
        setFeishuTestResult(`⚠️ 测试返回异常: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('Test exception:', err);
      setFeishuTestResult(`❌ 测试异常: ${(err as Error).message}`);
    } finally {
      setTestingScrape(false);
    }
  };

  const testSimpleFeishuWrite = async () => {
    setTestingSimpleWrite(true);
    setFeishuTestResult(null);

    try {
      console.log('Testing simple Feishu write...');

      const { data, error } = await supabase.functions.invoke('feishu-simple-write', {
        body: {},
      });

      console.log('Simple write response:', { data, error });

      if (error) {
        console.error('Simple write error:', error);
        setFeishuTestResult(`❌ 简单写入失败: ${error.message}`);
      } else if (data && data.success) {
        console.log('Simple write success:', data);
        setFeishuTestResult(
          `✅ 飞书简单写入成功！\n\n` +
          `记录ID: ${data.record_id || 'N/A'}\n\n` +
          `⚠️ 请检查飞书表格是否有新记录！`
        );
      } else {
        setFeishuTestResult(`❌ 写入失败: ${data?.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('Simple write exception:', err);
      setFeishuTestResult(`❌ 异常: ${(err as Error).message}`);
    } finally {
      setTestingSimpleWrite(false);
    }
  };

  const testDebugFeishuWrite = async () => {
    setTestingDebugWrite(true);
    setFeishuTestResult(null);

    try {
      console.log('Testing debug Feishu write...');

      const { data, error } = await supabase.functions.invoke('feishu-debug-write', {
        body: {},
      });

      console.log('Debug write response:', { data, error });

      if (error) {
        console.error('Debug write error:', error);
        setFeishuTestResult(`❌ 调试写入失败: ${error.message}`);
      } else if (data && data.success) {
        console.log('Debug write success:', data);
        setFeishuTestResult(
          `✅ 数据库→飞书写入成功！\n\n` +
          `写入字段数: ${data.fields_count}\n` +
          `字段: ${data.fields.join(', ')}\n\n` +
          `记录ID: ${data.record_id || 'N/A'}\n\n` +
          `⚠️ 请检查飞书表格所有字段是否都有数据！`
        );
      } else {
        setFeishuTestResult(`❌ 写入失败: ${data?.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('Debug write exception:', err);
      setFeishuTestResult(`❌ 异常: ${(err as Error).message}`);
    } finally {
      setTestingDebugWrite(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 头部 */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Globe className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              户外电子产品竞品分析工具
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            智能识别产品列表与详情页，自动提取结构化产品数据
          </p>
        </div>

        {/* 输入区域 */}
        <Card className="mb-6 border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  输入产品页面 URL
                </CardTitle>
                <CardDescription>
                  支持产品列表页和产品详情页，使用 Claude AI 自动提取结构化数据（包括防水等级、续航时间等）
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testFullScrape}
                  disabled={testingScrape}
                >
                  {testingScrape ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    '🧪 测试完整流程'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testDebugFeishuWrite}
                  disabled={testingDebugWrite}
                >
                  {testingDebugWrite ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      调试中...
                    </>
                  ) : (
                    '🐛 调试飞书写入'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testSimpleFeishuWrite}
                  disabled={testingSimpleWrite}
                >
                  {testingSimpleWrite ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      写入中...
                    </>
                  ) : (
                    '📝 测试飞书写入'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testFeishuConnection}
                  disabled={testingFeishu}
                >
                  {testingFeishu ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      诊断中...
                    </>
                  ) : (
                    '🔍 诊断飞书连接'
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="url"
                placeholder="https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=xcover"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                className="flex-1 h-12 text-base"
                disabled={loading}
              />
              <Button 
                onClick={handleScrape} 
                disabled={loading || !url}
                size="lg"
                className="px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    抓取中...
                  </>
                ) : (
                  '开始抓取'
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <Alert className="mt-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  正在抓取页面并使用 AI 提取结构化产品数据（防水等级、续航等）...
                </AlertDescription>
              </Alert>
            )}

            {feishuTestResult && (
              <Alert className={`mt-4 ${feishuTestResult.startsWith('✅') ? 'border-green-500 bg-green-50' : feishuTestResult.startsWith('❌') ? 'border-red-500 bg-red-50' : ''}`}>
                <AlertDescription className="font-medium whitespace-pre-line">
                  {feishuTestResult}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 结果展示 */}
        {result && (
          <Card className="border-2 mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    抓取成功
                  </CardTitle>
                  <CardDescription className="text-base">
                    {result.title}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {result.pageType === 'product_list' ? '产品列表' : 
                     result.pageType === 'product_detail' ? '产品详情' : '未知类型'}
                  </Badge>
                  {result.data && result.data.count !== undefined && (
                    <Badge variant="outline">
                      {result.data.count} 个产品
                    </Badge>
                  )}
                  {result.feishuSync && result.feishuSync.success && (
                    <Badge variant="default" className="bg-green-500">
                      已同步飞书 ({result.feishuSync.action === 'created' ? '新增' : '更新'})
                    </Badge>
                  )}
                  {result.feishuSync && !result.feishuSync.success && (
                    <Badge variant="destructive">
                      飞书同步失败
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 产品列表展示 */}
              {result.pageType === 'product_list' && result.data && result.data.products && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <List className="w-5 h-5" />
                    提取的产品列表 ({result.data.products.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.data.products.map((product, index) => (
                      <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {product.image_url && (
                          <div className="aspect-video bg-muted flex items-center justify-center p-4">
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="max-h-full object-contain"
                              crossOrigin="anonymous"
                            />
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
                          {product.brand && (
                            <Badge variant="secondary" className="w-fit">{product.brand}</Badge>
                          )}
                        </CardHeader>
                        {product.detail_url && (
                          <CardContent className="pt-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => {
                                setUrl(product.detail_url!);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <Info className="w-4 h-4 mr-2" />
                              查看详情
                            </Button>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 产品详情展示 */}
              {result.pageType === 'product_detail' && result.data && result.data.product && (
                <div className="space-y-6">
                  <div className="flex gap-6">
                    {result.data.product.image_url && (
                      <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center p-4 flex-shrink-0">
                        <img 
                          src={result.data.product.image_url} 
                          alt={result.data.product.name}
                          className="max-h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{result.data.product.name}</h3>
                      {result.data.product.brand && (
                        <Badge className="mb-4">{result.data.product.brand}</Badge>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        {result.data.product.release_date && (
                          <div>
                            <p className="text-sm text-muted-foreground">发布时间</p>
                            <p className="font-medium">{result.data.product.release_date}</p>
                          </div>
                        )}
                        {result.data.product.display_size && (
                          <div>
                            <p className="text-sm text-muted-foreground">屏幕</p>
                            <p className="font-medium">{result.data.product.display_size}</p>
                            {result.data.product.display_type && (
                              <p className="text-xs text-muted-foreground">{result.data.product.display_type}</p>
                            )}
                          </div>
                        )}
                        {result.data.product.waterproof_rating && (
                          <div>
                            <p className="text-sm text-muted-foreground">防水等级</p>
                            <p className="font-medium text-primary">{result.data.product.waterproof_rating}</p>
                          </div>
                        )}
                        {result.data.product.battery && (
                          <div>
                            <p className="text-sm text-muted-foreground">电池</p>
                            <p className="font-medium">{result.data.product.battery}</p>
                            {result.data.product.battery_life && (
                              <p className="text-xs text-muted-foreground">{result.data.product.battery_life}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 详细规格 */}
                  <Tabs defaultValue="specs" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="specs">详细规格</TabsTrigger>
                      <TabsTrigger value="features">特性</TabsTrigger>
                      <TabsTrigger value="json">JSON</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="specs" className="mt-4">
                      <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/30">
                        <div className="space-y-6">
                          {/* 显示屏 */}
                          {(result.data.product.display_size || result.data.product.display_resolution) && (
                            <div>
                              <h4 className="font-semibold mb-3 text-primary">显示屏</h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {result.data.product.display_size && (
                                  <div>
                                    <span className="text-muted-foreground">尺寸: </span>
                                    <span>{result.data.product.display_size}</span>
                                  </div>
                                )}
                                {result.data.product.display_resolution && (
                                  <div>
                                    <span className="text-muted-foreground">分辨率: </span>
                                    <span>{result.data.product.display_resolution}</span>
                                  </div>
                                )}
                                {result.data.product.display_type && (
                                  <div>
                                    <span className="text-muted-foreground">类型: </span>
                                    <span>{result.data.product.display_type}</span>
                                  </div>
                                )}
                                {result.data.product.display_protection && (
                                  <div>
                                    <span className="text-muted-foreground">保护: </span>
                                    <span>{result.data.product.display_protection}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 性能 */}
                          {(result.data.product.chipset || result.data.product.cpu) && (
                            <div>
                              <h4 className="font-semibold mb-3 text-primary">性能</h4>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                {result.data.product.os && (
                                  <div>
                                    <span className="text-muted-foreground">操作系统: </span>
                                    <span>{result.data.product.os}</span>
                                  </div>
                                )}
                                {result.data.product.chipset && (
                                  <div>
                                    <span className="text-muted-foreground">芯片: </span>
                                    <span>{result.data.product.chipset}</span>
                                  </div>
                                )}
                                {result.data.product.cpu && (
                                  <div>
                                    <span className="text-muted-foreground">CPU: </span>
                                    <span>{result.data.product.cpu}</span>
                                  </div>
                                )}
                                {result.data.product.gpu && (
                                  <div>
                                    <span className="text-muted-foreground">GPU: </span>
                                    <span>{result.data.product.gpu}</span>
                                  </div>
                                )}
                                {result.data.product.ram && (
                                  <div>
                                    <span className="text-muted-foreground">运行内存: </span>
                                    <span>{result.data.product.ram}</span>
                                  </div>
                                )}
                                {result.data.product.storage && (
                                  <div>
                                    <span className="text-muted-foreground">存储: </span>
                                    <span>{result.data.product.storage}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 相机 */}
                          {(result.data.product.main_camera || result.data.product.selfie_camera) && (
                            <div>
                              <h4 className="font-semibold mb-3 text-primary">相机</h4>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                {result.data.product.main_camera && (
                                  <div>
                                    <span className="text-muted-foreground">主摄: </span>
                                    <span>{result.data.product.main_camera}</span>
                                  </div>
                                )}
                                {result.data.product.selfie_camera && (
                                  <div>
                                    <span className="text-muted-foreground">前摄: </span>
                                    <span>{result.data.product.selfie_camera}</span>
                                  </div>
                                )}
                                {result.data.product.video && (
                                  <div>
                                    <span className="text-muted-foreground">视频: </span>
                                    <span>{result.data.product.video}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 电池 */}
                          {result.data.product.battery && (
                            <div>
                              <h4 className="font-semibold mb-3 text-primary">电池</h4>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">容量: </span>
                                  <span>{result.data.product.battery}</span>
                                </div>
                                {result.data.product.battery_life && (
                                  <div>
                                    <span className="text-muted-foreground">续航: </span>
                                    <span>{result.data.product.battery_life}</span>
                                  </div>
                                )}
                                {result.data.product.charging && (
                                  <div>
                                    <span className="text-muted-foreground">充电: </span>
                                    <span>{result.data.product.charging}</span>
                                  </div>
                                )}
                                {result.data.product.fast_charging && (
                                  <div>
                                    <span className="text-muted-foreground">快充: </span>
                                    <span>{result.data.product.fast_charging}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 其他规格 */}
                          <div>
                            <h4 className="font-semibold mb-3 text-primary">其他规格</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {result.data.product.dimensions && (
                                <div>
                                  <span className="text-muted-foreground">尺寸: </span>
                                  <span>{result.data.product.dimensions}</span>
                                </div>
                              )}
                              {result.data.product.weight && (
                                <div>
                                  <span className="text-muted-foreground">重量: </span>
                                  <span>{result.data.product.weight}</span>
                                </div>
                              )}
                              {result.data.product.network && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">网络: </span>
                                  <span>{result.data.product.network}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="features" className="mt-4">
                      <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/30">
                        <div className="space-y-4">
                          {result.data.product.waterproof_rating && (
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-sm">
                                {result.data.product.waterproof_rating}
                              </Badge>
                              <span className="text-sm text-muted-foreground">防水防尘</span>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3">
                            {result.data.product.nfc && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm">NFC</span>
                              </div>
                            )}
                            {result.data.product.wireless_charging && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm">无线充电</span>
                              </div>
                            )}
                            {result.data.product.audio_jack && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm">3.5mm 耳机孔</span>
                              </div>
                            )}
                            {result.data.product.usb_type && (
                              <div>
                                <span className="text-sm text-muted-foreground">USB: </span>
                                <span className="text-sm">{result.data.product.usb_type}</span>
                              </div>
                            )}
                          </div>

                          {result.data.product.colors && result.data.product.colors.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">可选颜色</h4>
                              <div className="flex gap-2 flex-wrap">
                                {result.data.product.colors.map((color, idx) => (
                                  <Badge key={idx} variant="outline">{color}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {result.data.product.special_features && result.data.product.special_features.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">特殊功能</h4>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {result.data.product.special_features.map((feature, idx) => (
                                  <li key={idx}>{feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.data.product.price && (
                            <div className="pt-4 border-t">
                              <span className="text-sm text-muted-foreground">参考价格: </span>
                              <span className="text-lg font-bold text-primary">{result.data.product.price}</span>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="json" className="mt-4">
                      <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/30">
                        <pre className="text-xs font-mono">
                          {JSON.stringify(result.data.product, null, 2)}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 从数据库加载的产品列表 */}
        {products.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                已保存的产品数据
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    {product.image_url && (
                      <div className="aspect-video bg-muted flex items-center justify-center p-4">
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="max-h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm line-clamp-2">{product.name}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        {product.brand && <Badge variant="secondary" className="text-xs">{product.brand}</Badge>}
                        {product.storage && <Badge variant="outline" className="text-xs">{product.storage}</Badge>}
                      </div>
                    </CardHeader>
                    {(product.main_camera || product.battery) && (
                      <CardContent className="pt-0 text-xs text-muted-foreground">
                        {product.main_camera && <p>相机: {product.main_camera}</p>}
                        {product.battery && <p>电池: {product.battery}</p>}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 历史记录 */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>抓取历史</CardTitle>
              <CardDescription>点击记录查看详细数据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => loadHistoryProducts(item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title || item.url}</p>
                      <p className="text-sm text-muted-foreground truncate">{item.url}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {item.page_type && (
                        <Badge variant="outline" className="text-xs">
                          {item.page_type === 'product_list' ? '列表' : '详情'}
                        </Badge>
                      )}
                      {item.products_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {item.products_count} 个
                        </Badge>
                      )}
                      {item.feishu_synced && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          飞书
                        </Badge>
                      )}
                      <Badge
                        variant={
                          item.status === 'success'
                            ? 'default'
                            : item.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {item.status === 'success'
                          ? '成功'
                          : item.status === 'failed'
                          ? '失败'
                          : '处理中'}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI 功能说明 */}
        <Card className="mt-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              AI 智能提取功能
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                使用 <strong>Claude AI</strong> 从杂乱的网页文本中智能提取以下结构化信息：
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>基本信息：</strong>发布时间、尺寸、重量</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>显示屏：</strong>尺寸、分辨率、类型、保护</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>性能：</strong>OS、芯片、CPU、GPU</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>存储：</strong>RAM、ROM 容量</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>相机：</strong>主摄、前摄、视频规格</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>电池：</strong>容量、续航、充电功率</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>防水防尘：</strong>IP68/IP69K 等级</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>网络：</strong>支持的网络制式</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>其他：</strong>NFC、USB、颜色、价格</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-background rounded-lg border">
                <p className="text-sm">
                  <strong>智能处理：</strong>
                </p>
                <ul className="text-sm mt-2 space-y-1 ml-4">
                  <li>• 防水等级（IP68、IP69K）统一提取到 waterproof_rating 字段</li>
                  <li>• 续航时间自动统一格式（如"待机 500 小时"）</li>
                  <li>• 充电功率带单位（如"15W"、"25W"）</li>
                  <li>• 所有数据严格按照 JSON Schema 结构化输出</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
