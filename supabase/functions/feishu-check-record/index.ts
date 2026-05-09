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
    const { recordId } = await req.json();
    
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

    // 查询记录
    const recordUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`;
    
    const response = await fetch(recordUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    console.log('Record query result:', JSON.stringify(data));

    return new Response(
      JSON.stringify({
        success: data.code === 0,
        exists: data.code === 0,
        record: data.data,
        error: data.code !== 0 ? data.msg : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
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