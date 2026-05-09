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
    console.log('=== Checking Latest Feishu Records ===');
    
    let appId = Deno.env.get('FEISHU_APP_ID');
    let appSecret = Deno.env.get('FEISHU_APP_SECRET');
    let appToken = Deno.env.get('FEISHU_APP_TOKEN');
    let tableId = Deno.env.get('FEISHU_TABLE_ID');

    if (tableId && tableId.includes('&')) {
      tableId = tableId.split('&')[0];
    }

    // 获取token
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.tenant_access_token;

    // 列出最近的记录
    const listUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=10`;
    
    const response = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    console.log('List records response:', JSON.stringify(data));

    if (data.code === 0) {
      const records = data.data?.items || [];
      const recordList = records.map((r: any) => ({
        record_id: r.record_id,
        product_name: r.fields['产品型号'] || r.fields['产品名称'],
        created_time: r.created_time,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          total: records.length,
          records: recordList,
          message: `飞书表格中共有 ${records.length} 条记录`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: data.msg,
          code: data.code,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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