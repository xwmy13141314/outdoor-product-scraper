import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Feishu Simple Write Test v3 ===');
    
    let appId = Deno.env.get('FEISHU_APP_ID');
    let appSecret = Deno.env.get('FEISHU_APP_SECRET');
    let appToken = Deno.env.get('FEISHU_APP_TOKEN');
    let tableId = Deno.env.get('FEISHU_TABLE_ID');

    // 清理 tableId
    if (tableId && tableId.includes('&')) {
      tableId = tableId.split('&')[0];
    }
    if (tableId && tableId.includes('?')) {
      tableId = tableId.split('?')[0];
    }

    console.log(`Config: appId=${appId?.substring(0,8)}..., tableId=${tableId}`);

    // 获取token
    console.log('Getting token...');
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response code:', tokenData.code);

    if (tokenData.code !== 0) {
      throw new Error(`Token failed: ${tokenData.msg}`);
    }

    const accessToken = tokenData.tenant_access_token;

    // 使用正确的飞书字段名
    const testFields = {
      '产品型号': `完整测试-${Date.now()}`,
      '产品名称': 'Samsung Galaxy XCover7 Pro',
      '品牌': 'Samsung',
      '发布时间': '2024年5月',
      '屏幕尺寸': '6.6英寸',
      '防水防尘': 'IP68',
      '数据来源': 'https://www.gsmarena.com/test',
      '抓取时间': new Date().toLocaleString('zh-CN'),
    };

    console.log('Writing fields:', JSON.stringify(testFields, null, 2));

    const writeUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
    console.log('Write URL:', writeUrl);

    const writeResponse = await fetch(writeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: testFields }),
    });

    console.log('Write response status:', writeResponse.status);
    const writeData = await writeResponse.json();
    console.log('Write response:', JSON.stringify(writeData, null, 2));

    if (writeData.code === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '✅ 写入成功！',
          record_id: writeData.data?.record?.record_id,
          fields: testFields,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `写入失败: ${writeData.msg} (code: ${writeData.code})`,
          full_response: writeData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
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