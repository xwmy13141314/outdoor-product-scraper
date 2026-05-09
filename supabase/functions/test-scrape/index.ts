import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 使用 GLM-4 提取产品信息
async function extractWithGLM(text: string, productName?: string) {
  try {
    const apiKey = Deno.env.get('GLM_API_KEY');
    
    if (!apiKey) {
      throw new Error('GLM_API_KEY not configured');
    }

    console.log('🤖 Calling GLM-4 API...');
    
    const trimmedText = text.substring(0, 15000);

    const prompt = `你是产品信息提取助手。从以下文本提取产品信息，返回 JSON（只返回 JSON，无其他文字）：

${trimmedText}

JSON 格式：
{
  "name": "产品全名",
  "brand": "品牌",
  "release_date": "发布时间",
  "dimensions": "尺寸",
  "weight": "重量",
  "display_size": "屏幕尺寸",
  "display_resolution": "分辨率",
  "display_type": "屏幕类型",
  "display_protection": "屏幕保护",
  "os": "系统",
  "chipset": "芯片",
  "cpu": "CPU",
  "gpu": "GPU",
  "ram": "内存",
  "storage": "存储",
  "main_camera": "主摄",
  "selfie_camera": "前摄",
  "video": "视频",
  "battery": "电池",
  "battery_life": "续航",
  "charging": "充电",
  "wireless_charging": true/false,
  "network": "网络",
  "waterproof_rating": "防水等级",
  "nfc": true/false,
  "usb_type": "USB",
  "audio_jack": true/false,
  "colors": ["颜色"],
  "price": "价格",
  "special_features": ["特性"]
}`;

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GLM API error:', response.status, errorText);
      throw new Error(`GLM API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.choices || !result.choices[0]) {
      console.error('Invalid GLM response structure:', JSON.stringify(result));
      throw new Error('Invalid response from GLM API');
    }

    const content = result.choices[0].message.content;

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response. Full content:', content);
      throw new Error('Failed to extract JSON from GLM response');
    }

    const productData = JSON.parse(jsonMatch[0]);
    
    if (!productData.name && productName) {
      productData.name = productName;
    }

    console.log('✅ Successfully extracted product:', productData.name);
    return productData;

  } catch (error) {
    console.error('❌ Error in extractWithGLM:', error);
    throw error;
  }
}

// 飞书同步函数 - 与debug-write完全相同的逻辑
async function syncToFeishu(product: any, sourceUrl: string) {
  try {
    let appId = Deno.env.get('FEISHU_APP_ID');
    let appSecret = Deno.env.get('FEISHU_APP_SECRET');
    let appToken = Deno.env.get('FEISHU_APP_TOKEN');
    let tableId = Deno.env.get('FEISHU_TABLE_ID');

    if (tableId && tableId.includes('&')) {
      tableId = tableId.split('&')[0];
    }
    if (tableId && tableId.includes('?')) {
      tableId = tableId.split('?')[0];
    }

    if (!appId || !appSecret || !appToken || !tableId) {
      throw new Error('Feishu credentials not configured');
    }

    console.log('📊 Getting Feishu access token...');
    
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.code !== 0) {
      throw new Error(`Feishu token failed: ${tokenData.msg || 'Unknown error'}`);
    }

    const accessToken = tokenData.tenant_access_token;
    console.log('✅ Access token obtained');

    // 准备所有字段 - 与debug-write完全相同
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
    
    console.log('📝 Writing to Feishu with', Object.keys(fields).length, 'fields');
    
    const writeUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
    
    const addResponse = await fetch(writeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    const addData = await addResponse.json();
    console.log('Feishu write response code:', addData.code);
    
    if (addData.code !== 0) {
      throw new Error(`Feishu write failed: ${addData.msg} (code: ${addData.code})`);
    }

    console.log('✅ Feishu sync successful, record ID:', addData.data?.record?.record_id);
    return { action: 'created', record: addData.data.record };
    
  } catch (error) {
    console.error('❌ Feishu sync error:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Test Scrape Started (v3 - Full Fields) ===');
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📍 Target URL:', url);

    // Step 1: Fetch
    console.log('📥 Step 1: Fetching page...');
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Step 1 Complete: ${html.length} characters`);

    // Step 2: Extract text
    console.log('📝 Step 2: Extracting text...');
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`✅ Step 2 Complete: ${textContent.length} characters`);

    // Step 3: AI extraction with GLM
    console.log('🤖 Step 3: AI extraction with GLM-4...');
    const product = await extractWithGLM(textContent, 'Samsung Galaxy XCover7 Pro');
    console.log(`✅ Step 3 Complete: ${product.name}`);

    // Step 4: Feishu sync
    console.log('📊 Step 4: Syncing to Feishu...');
    let feishuResult = null;
    let feishuError = null;
    try {
      feishuResult = await syncToFeishu(product, url);
      console.log(`✅ Step 4 Complete: ${feishuResult.action}`);
    } catch (error) {
      console.error('⚠️ Step 4 Failed - Feishu sync error:', error);
      feishuError = (error as Error).message;
      feishuResult = { action: 'failed', error: feishuError };
    }

    // Step 5: Database
    console.log('💾 Step 5: Saving to database...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error: dbError } = await supabase.from('products').insert({
      name: product.name,
      brand: product.brand,
      release_date: product.release_date,
      dimensions: product.dimensions,
      weight: product.weight,
      display_size: product.display_size,
      display_resolution: product.display_resolution,
      display_type: product.display_type,
      display_protection: product.display_protection,
      os: product.os,
      chipset: product.chipset,
      cpu: product.cpu,
      gpu: product.gpu,
      ram: product.ram,
      storage: product.storage,
      main_camera: product.main_camera,
      selfie_camera: product.selfie_camera,
      video: product.video,
      battery: product.battery,
      battery_life: product.battery_life,
      charging: product.charging,
      wireless_charging: product.wireless_charging,
      network: product.network,
      waterproof_rating: product.waterproof_rating,
      nfc: product.nfc,
      usb_type: product.usb_type,
      audio_jack: product.audio_jack,
      colors: product.colors ? { colors: product.colors } : null,
      price: product.price,
      special_features: product.special_features ? { features: product.special_features } : null,
      feishu_synced: feishuResult?.action === 'created',
      feishu_record_id: feishuResult?.record?.record_id,
    });

    console.log(dbError ? `⚠️ Database failed: ${dbError.message}` : '✅ Step 5 Complete: Saved');

    console.log('=== ✅✅✅ All Steps Complete ===');

    return new Response(
      JSON.stringify({
        success: true,
        steps: {
          fetch: { size: html.length },
          extract: { size: textContent.length },
          ai: { product: product.name },
          feishu: { 
            action: feishuResult?.action || 'unknown',
            error: feishuError,
            success: feishuResult?.action === 'created'
          },
          database: { saved: !dbError },
        },
        product,
        feishu: feishuResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Test failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        stack: (error as Error).stack,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});