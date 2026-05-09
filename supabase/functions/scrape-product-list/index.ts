import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GLM extraction (same as before)
async function extractWithGLM(text: string, productName?: string) {
  const apiKey = Deno.env.get('GLM_API_KEY');
  const trimmedText = text.substring(0, 15000);
  
  const prompt = `你是产品信息提取助手。从以下文本提取产品信息，返回 JSON（只返回 JSON，无其他文字）：

${trimmedText}

JSON 格式：{"name":"产品全名","brand":"品牌","release_date":"发布时间","dimensions":"尺寸","weight":"重量","display_size":"屏幕尺寸","display_resolution":"分辨率","display_type":"屏幕类型","display_protection":"屏幕保护","os":"系统","chipset":"芯片","cpu":"CPU","gpu":"GPU","ram":"内存","storage":"存储","main_camera":"主摄","selfie_camera":"前摄","video":"视频","battery":"电池","battery_life":"续航","charging":"充电","wireless_charging":true/false,"network":"网络","waterproof_rating":"防水等级","nfc":true/false,"usb_type":"USB","audio_jack":true/false,"colors":["颜色"],"price":"价格","special_features":["特性"]}`;

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });

  const result = await response.json();
  const content = result.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const productData = JSON.parse(jsonMatch[0]);
  
  if (!productData.name && productName) {
    productData.name = productName;
  }

  return productData;
}

// Feishu sync (complete field mapping)
async function syncToFeishu(product: any, sourceUrl: string) {
  let appId = Deno.env.get('FEISHU_APP_ID');
  let appSecret = Deno.env.get('FEISHU_APP_SECRET');
  let appToken = Deno.env.get('FEISHU_APP_TOKEN');
  let tableId = Deno.env.get('FEISHU_TABLE_ID');

  if (tableId?.includes('&')) tableId = tableId.split('&')[0];
  if (tableId?.includes('?')) tableId = tableId.split('?')[0];

  const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.tenant_access_token;

  const fields: any = {};
  if (product.name) {
    fields['产品型号'] = product.name;
    fields['产品名称'] = product.name;
  }
  if (product.brand) fields['品牌'] = product.brand;
  if (product.release_date) fields['发布时间'] = product.release_date;
  if (product.dimensions) fields['尺寸'] = product.dimensions;
  if (product.weight) fields['重量'] = product.weight;
  if (product.display_size) fields['屏幕尺寸'] = product.display_size;
  if (product.display_resolution) fields['分辨率'] = product.display_resolution;
  if (product.display_type) fields['屏幕类型'] = product.display_type;
  if (product.display_protection) fields['屏幕保护'] = product.display_protection;
  if (product.os) fields['操作系统'] = product.os;
  if (product.chipset) fields['芯片'] = product.chipset;
  if (product.cpu) fields['CPU'] = product.cpu;
  if (product.gpu) fields['GPU'] = product.gpu;
  if (product.ram) fields['RAM'] = product.ram;
  if (product.storage) fields['ROM'] = product.storage;
  if (product.main_camera) fields['主摄'] = product.main_camera;
  if (product.selfie_camera) fields['前摄'] = product.selfie_camera;
  if (product.video) fields['视频格式'] = product.video;
  if (product.battery) fields['电池容量'] = product.battery;
  if (product.battery_life) fields['续航时间'] = product.battery_life;
  if (product.charging) fields['充电功率'] = product.charging;
  if (product.wireless_charging !== null && product.wireless_charging !== undefined) {
    fields['无线充电'] = product.wireless_charging ? '是' : '否';
  }
  if (product.waterproof_rating) fields['防水防尘'] = product.waterproof_rating;
  if (product.network) fields['网络制式'] = product.network;
  if (product.nfc !== null && product.nfc !== undefined) {
    fields['NFC'] = product.nfc ? '是' : '否';
  }
  if (product.usb_type) fields['USB类型'] = product.usb_type;
  if (product.audio_jack !== null && product.audio_jack !== undefined) {
    fields['3.5mm耳机孔'] = product.audio_jack ? '是' : '否';
  }
  if (product.colors) {
    if (Array.isArray(product.colors)) {
      fields['颜色'] = product.colors.join(', ');
    } else if (typeof product.colors === 'string') {
      fields['颜色'] = product.colors;
    }
  }
  if (product.price) fields['价格'] = product.price;
  if (product.special_features) {
    if (Array.isArray(product.special_features)) {
      fields['特殊功能'] = product.special_features.join(', ');
    } else if (typeof product.special_features === 'string') {
      fields['特殊功能'] = product.special_features;
    }
  }
  fields['数据来源'] = sourceUrl;
  fields['抓取时间'] = new Date().toLocaleString('zh-CN');

  const addResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );

  const addData = await addResponse.json();
  if (addData.code !== 0) throw new Error(`Feishu failed: ${addData.msg}`);

  return { action: 'created', record: addData.data.record };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    console.log('Fetching list page:', url);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract product links
    const productLinks: string[] = [];
    const links = doc.querySelectorAll('a[href*=".php"]');
    
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && !href.includes('results.php') && !href.includes('compare.php')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.gsmarena.com/${href}`;
        if (!productLinks.includes(fullUrl) && fullUrl.includes('gsmarena.com')) {
          productLinks.push(fullUrl);
        }
      }
    }
    
    console.log(`Found ${productLinks.length} product links`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const linksToProcess = productLinks.slice(0, 16);
    let successCount = 0;
    
    for (let i = 0; i < linksToProcess.length; i++) {
      const productUrl = linksToProcess[i];
      console.log(`[${i+1}/${linksToProcess.length}] Processing: ${productUrl}`);
      
      try {
        if (i > 0) await new Promise(r => setTimeout(r, 3000));
        
        const productResponse = await fetch(productUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        
        const productHtml = await productResponse.text();
        const textContent = productHtml
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const productData = await extractWithGLM(textContent);
        const feishuResult = await syncToFeishu(productData, productUrl);
        
        await supabase.from('products').insert({
          ...productData,
          colors: productData.colors ? { colors: productData.colors } : null,
          special_features: productData.special_features ? { features: productData.special_features } : null,
          feishu_synced: true,
          feishu_record_id: feishuResult.record.record_id,
          detail_url: productUrl,
        });
        
        successCount++;
        console.log(`✅ [${successCount}] ${productData.name}`);
        
      } catch (error) {
        console.error(`❌ Failed: ${productUrl}`, error);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        totalLinks: productLinks.length,
        processed: linksToProcess.length,
        succeeded: successCount,
        message: `成功抓取 ${successCount}/${linksToProcess.length} 个产品并同步到飞书`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});