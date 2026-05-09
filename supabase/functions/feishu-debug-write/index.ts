import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Feishu Debug Write (All Fields) ===');
    
    // 从数据库读取最新产品
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: products, error: dbError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (dbError || !products || products.length === 0) {
      throw new Error('无法读取产品数据');
    }
    
    const product = products[0];
    console.log('Product from DB:', product.name);
    
    // 获取飞书配置
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

    // 获取token
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.code !== 0) {
      throw new Error(`Token failed: ${tokenData.msg}`);
    }

    const accessToken = tokenData.tenant_access_token;

    // 准备所有字段
    const fields: any = {};
    
    // 基本信息
    if (product.name) {
      fields['产品型号'] = product.name;
      fields['产品名称'] = product.name;
    }
    if (product.brand) fields['品牌'] = product.brand;
    if (product.release_date) fields['发布时间'] = product.release_date;
    if (product.dimensions) fields['尺寸'] = product.dimensions;
    if (product.weight) fields['重量'] = product.weight;
    
    // 显示屏
    if (product.display_size) fields['屏幕尺寸'] = product.display_size;
    if (product.display_resolution) fields['分辨率'] = product.display_resolution;
    if (product.display_type) fields['屏幕类型'] = product.display_type;
    if (product.display_protection) fields['屏幕保护'] = product.display_protection;
    
    // 性能
    if (product.os) fields['操作系统'] = product.os;
    if (product.chipset) fields['芯片'] = product.chipset;
    if (product.cpu) fields['CPU'] = product.cpu;
    if (product.gpu) fields['GPU'] = product.gpu;
    
    // 存储
    if (product.ram) fields['RAM'] = product.ram;
    if (product.storage) fields['ROM'] = product.storage;
    
    // 相机
    if (product.main_camera) fields['主摄'] = product.main_camera;
    if (product.selfie_camera) fields['前摄'] = product.selfie_camera;
    if (product.video) fields['视频格式'] = product.video;
    
    // 电池
    if (product.battery) fields['电池容量'] = product.battery;
    if (product.battery_life) fields['续航时间'] = product.battery_life;
    if (product.charging) fields['充电功率'] = product.charging;
    
    // 布尔值字段 - 必须转换为"是"/"否"
    if (product.wireless_charging !== null && product.wireless_charging !== undefined) {
      fields['无线充电'] = product.wireless_charging ? '是' : '否';
    }
    
    // 网络与连接
    if (product.waterproof_rating) fields['防水防尘'] = product.waterproof_rating;
    if (product.network) fields['网络制式'] = product.network;
    
    if (product.nfc !== null && product.nfc !== undefined) {
      fields['NFC'] = product.nfc ? '是' : '否';
    }
    
    if (product.usb_type) fields['USB类型'] = product.usb_type;
    
    if (product.audio_jack !== null && product.audio_jack !== undefined) {
      fields['3.5mm耳机孔'] = product.audio_jack ? '是' : '否';
    }
    
    // 其他信息
    if (product.colors) {
      const colorsData = typeof product.colors === 'object' ? product.colors : {};
      const colorArray = colorsData.colors || [];
      if (Array.isArray(colorArray) && colorArray.length > 0) {
        fields['颜色'] = colorArray.join(', ');
      }
    }
    
    if (product.price) fields['价格'] = product.price;
    
    if (product.special_features) {
      const featuresData = typeof product.special_features === 'object' ? product.special_features : {};
      const featureArray = featuresData.features || [];
      if (Array.isArray(featureArray) && featureArray.length > 0) {
        fields['特殊功能'] = featureArray.join(', ');
      }
    }
    
    // 元数据
    fields['数据来源'] = product.detail_url || 'https://www.gsmarena.com';
    fields['抓取时间'] = new Date().toLocaleString('zh-CN');
    
    console.log('Total fields to write:', Object.keys(fields).length);
    console.log('Fields:', JSON.stringify(fields, null, 2));

    // 写入飞书
    const writeUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
    
    const writeResponse = await fetch(writeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    const writeData = await writeResponse.json();
    console.log('Feishu response:', JSON.stringify(writeData, null, 2));

    if (writeData.code === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '✅ 完整数据写入成功',
          record_id: writeData.data?.record?.record_id,
          fields_count: Object.keys(fields).length,
          fields: Object.keys(fields),
          sample_data: {
            '品牌': fields['品牌'],
            '屏幕尺寸': fields['屏幕尺寸'],
            '操作系统': fields['操作系统'],
            'CPU': fields['CPU'],
            'RAM': fields['RAM'],
            '主摄': fields['主摄'],
            '电池容量': fields['电池容量'],
            '防水防尘': fields['防水防尘'],
            'NFC': fields['NFC'],
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `${writeData.msg} (code: ${writeData.code})`,
          response: writeData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error:', error);
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