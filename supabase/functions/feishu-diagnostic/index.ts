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
    console.log('=== Feishu Diagnostic Started ===');
    
    // 检查环境变量
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

    const diagnosticInfo = {
      credentials: {
        appId: appId ? `${appId.substring(0, 10)}...` : 'NOT SET',
        appSecret: appSecret ? 'SET' : 'NOT SET',
        appToken: appToken || 'NOT SET',
        tableId: tableId || 'NOT SET',
      },
      steps: [] as string[],
    };

    console.log('Credentials:', diagnosticInfo.credentials);

    if (!appId || !appSecret || !appToken || !tableId) {
      throw new Error('❌ 飞书配置不完整');
    }
    diagnosticInfo.steps.push('✅ 步骤1: 所有配置已设置');

    // 获取 Token
    console.log('Getting access token...');
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response:', tokenData);

    if (tokenData.code !== 0) {
      throw new Error(`❌ Token获取失败: ${tokenData.msg}`);
    }

    const accessToken = tokenData.tenant_access_token;
    diagnosticInfo.steps.push('✅ 步骤2: Access Token 获取成功');
    console.log('Access token obtained');

    // 直接尝试写入测试数据
    console.log('Attempting to write test record...');
    const testData = {
      fields: {
        '产品型号': `测试-${Date.now()}`,
      }
    };

    const writeUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
    console.log('Write URL:', writeUrl);
    console.log('Test data:', JSON.stringify(testData));

    const writeResponse = await fetch(writeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log(`Write response status: ${writeResponse.status}`);
    const writeText = await writeResponse.text();
    console.log('Write response (raw):', writeText);

    let writeData;
    try {
      writeData = JSON.parse(writeText);
    } catch (e) {
      throw new Error(`API返回格式错误: ${writeText.substring(0, 100)}`);
    }

    console.log('Write response (parsed):', JSON.stringify(writeData));

    if (writeData.code === 0) {
      diagnosticInfo.steps.push('✅ 步骤3: 测试记录写入成功！');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: '🎉 飞书连接成功！已写入测试记录。',
          steps: diagnosticInfo.steps,
          record_id: writeData.data?.record?.record_id,
          note: '请检查飞书表格，应该能看到一条新的测试记录。',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      diagnosticInfo.steps.push(`❌ 步骤3: 写入失败 - ${writeData.msg} (code: ${writeData.code})`);
      
      let errorGuide = '';
      
      // 详细的错误处理
      if (writeData.code === 99991668 || writeData.code === 99991663) {
        errorGuide = `
🔧 **应用权限未生效！**

请按以下步骤操作：
1️⃣ 打开飞书开放平台：https://open.feishu.cn/app
2️⃣ 找到您的应用
3️⃣ 进入"权限管理"，确保已勾选：
   ✅ 查看、评论、编辑和管理多维表格
4️⃣ **重要**：点击"创建新版本" → "申请发布" → "发布"
5️⃣ 等待几分钟让权限生效
6️⃣ 重新测试
        `;
      } else if (writeData.code === 1254104) {
        errorGuide = `
🔧 **字段名称不匹配！**

飞书表格中没有"产品型号"字段。
请确保表格第一列的字段名是：产品型号
        `;
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `${writeData.msg} (code: ${writeData.code})`,
          steps: diagnosticInfo.steps,
          guide: errorGuide,
          credentials: diagnosticInfo.credentials,
          fullResponse: writeData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Diagnostic exception:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        steps: [],
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});