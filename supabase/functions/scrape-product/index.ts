import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function randomDelay(min = 1000, max = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 使用 GLM-4 提取产品信息
async function extractWithGLM(text: string, productName?: string) {
  const apiKey = Deno.env.get('GLM_API_KEY');
  
  if (!apiKey) {
    throw new Error('GLM_API_KEY not configured');
  }

  console.log('Calling GLM-4 API for product extraction...');
  
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
    throw new Error(`GLM API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from GLM response');
  }

  const productData = JSON.parse(jsonMatch[0]);
  
  if (!productData.name && productName) {
    productData.name = productName;
  }

  console.log('GLM extraction successful:', productData.name);
  return productData;
}

// 飞书同步
async function syncToFeishu(product: any, sourceUrl: string) {
  let appId = Deno.env.get('FEISHU_APP_ID');
  let appSecret = Deno.env.get('FEISHU_APP_SECRET');
  let appToken = Deno.env.get('FEISHU_APP_TOKEN');
  let tableId = Deno.env.get('FEISHU_TABLE_ID');

  // 清理 tableId，移除可能的 URL 参数
  if (tableId && tableId.includes('&')) {
    tableId = tableId.split('&')[0];
    console.log('Table ID cleaned (removed URL params)');
  }
  if (tableId && tableId.includes('?')) {
    tableId = tableId.split('?')[0];
  }

  if (!appId || !appSecret || !appToken || !tableId) {
    console.warn('Feishu credentials not configured, skipping sync');
    return { action: 'skipped', error: 'Credentials not configured' };
  }

  console.log('Syncing to Feishu...');
  
  const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.code !== 0) {
    throw new Error(`Feishu token failed: ${tokenData.msg}`);
  }

  // 准备飞书字段
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
  
  // 布尔值字段
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
  
  // 处理 colors - 可能是数组或对象
  if (product.colors) {
    if (Array.isArray(product.colors)) {
      fields['颜色'] = product.colors.join(', ');
    } else if (typeof product.colors === 'string') {
      fields['颜色'] = product.colors;
    }
  }
  
  if (product.price) fields['价格'] = product.price;
  
  // 处理 special_features - 可能是数组或对象
  if (product.special_features) {
    if (Array.isArray(product.special_features)) {
      fields['特殊功能'] = product.special_features.join(', ');
    } else if (typeof product.special_features === 'string') {
      fields['特殊功能'] = product.special_features;
    }
  }
  
  // 元数据
  fields['数据来源'] = sourceUrl;
  fields['抓取时间'] = new Date().toLocaleString('zh-CN');

  console.log('Writing to Feishu with', Object.keys(fields).length, 'fields');

  const addResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.tenant_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );

  const addData = await addResponse.json();
  
  if (addData.code !== 0) {
    throw new Error(`Feishu add failed: ${addData.msg}`);
  }

  console.log('Feishu sync successful');
  return { action: 'created', record: addData.data.record };
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectPageType(doc: any): string {
  const listIndicators = [
    doc.querySelectorAll('.makers ul li').length > 3,
    doc.querySelectorAll('.product-item').length > 3,
  ];
  
  if (listIndicators.some(indicator => indicator)) {
    return 'product_list';
  }
  
  const detailIndicators = [
    doc.querySelector('.specs-photo-main') !== null,
    doc.querySelector('table.specs') !== null,
  ];
  
  if (detailIndicators.some(indicator => indicator)) {
    return 'product_detail';
  }
  
  return 'unknown';
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) await randomDelay(2000, 5000);
      else await randomDelay(500, 1500);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      if (response.ok) {
        console.log(`Fetched successfully on attempt ${attempt}`);
        return response;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) throw lastError;
    }
  }

  throw lastError || new Error('Failed to fetch');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, useAI = true, syncToFeishu: enableFeishu = true } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting scrape for:', url);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: scrapeRecord, error: insertError } = await supabase
      .from('product_scrapes')
      .insert({ url, status: 'pending' })
      .select()
      .single();

    if (insertError) throw insertError;

    try {
      const response = await fetchWithRetry(url, 3);
      const html = await response.text();
      console.log(`Fetched ${html.length} characters`);

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      if (!doc) throw new Error('Failed to parse HTML');

      const pageType = detectPageType(doc);
      const titleEl = doc.querySelector('title');
      const title = titleEl ? titleEl.textContent?.trim() : '';

      let resultData: any = null;
      let feishuSyncResult: any = null;
      let productsCount = 0;

      if (pageType === 'product_list') {
        console.log('Processing product list page...');
        
        // 提取产品链接
        const productLinks: string[] = [];
        const linkElements = doc.querySelectorAll('.makers ul li a, .product-item a');
        
        for (const link of linkElements) {
          const href = link.getAttribute('href');
          if (href && href.includes('.php')) {
            const fullUrl = href.startsWith('http') ? href : `https://www.gsmarena.com/${href}`;
            if (!productLinks.includes(fullUrl)) {
              productLinks.push(fullUrl);
            }
          }
        }

        console.log(`Found ${productLinks.length} product links`);
        
        // 限制最多20个产品
        const linksToProcess = productLinks.slice(0, 20);
        const products: any[] = [];
        
        // 逐个抓取产品
        for (let i = 0; i < linksToProcess.length; i++) {
          const productUrl = linksToProcess[i];
          console.log(`Processing ${i + 1}/${linksToProcess.length}: ${productUrl}`);
          
          try {
            // 延迟避免反爬
            if (i > 0) await randomDelay(2000, 4000);
            
            // 抓取产品页面
            const productResponse = await fetchWithRetry(productUrl, 2);
            const productHtml = await productResponse.text();
            const productDoc = parser.parseFromString(productHtml, 'text/html');
            
            if (!productDoc) continue;
            
            const productTitle = productDoc.querySelector('title')?.textContent?.trim() || '';
            
            // AI提取
            if (useAI) {
              const textContent = extractTextContent(productHtml);
              const productData = await extractWithGLM(textContent, productTitle);
              
              products.push(productData);
              
              // 飞书同步
              let productFeishuResult = null;
              if (enableFeishu) {
                try {
                  productFeishuResult = await syncToFeishu(productData, productUrl);
                } catch (feishuError) {
                  console.error(`Feishu sync error for ${productData.name}:`, feishuError);
                  productFeishuResult = { action: 'failed', error: (feishuError as Error).message };
                }
              }
              
              // 保存到数据库
              await supabase.from('products').insert({
                scrape_id: scrapeRecord.id,
                name: productData.name,
                brand: productData.brand,
                release_date: productData.release_date,
                dimensions: productData.dimensions,
                weight: productData.weight,
                display_size: productData.display_size,
                display_resolution: productData.display_resolution,
                display_type: productData.display_type,
                display_protection: productData.display_protection,
                os: productData.os,
                chipset: productData.chipset,
                cpu: productData.cpu,
                gpu: productData.gpu,
                ram: productData.ram,
                storage: productData.storage,
                main_camera: productData.main_camera,
                selfie_camera: productData.selfie_camera,
                video: productData.video,
                battery: productData.battery,
                battery_life: productData.battery_life,
                charging: productData.charging,
                wireless_charging: productData.wireless_charging,
                network: productData.network,
                waterproof_rating: productData.waterproof_rating,
                nfc: productData.nfc,
                usb_type: productData.usb_type,
                audio_jack: productData.audio_jack,
                colors: productData.colors ? { colors: productData.colors } : null,
                price: productData.price,
                special_features: productData.special_features ? { features: productData.special_features } : null,
                feishu_synced: productFeishuResult?.action === 'created',
                feishu_record_id: productFeishuResult?.record?.record_id,
                detail_url: productUrl,
              });
              
              productsCount++;
              console.log(`✅ Processed ${productsCount}/${linksToProcess.length}: ${productData.name}`);
            }
          } catch (productError) {
            console.error(`Error processing ${productUrl}:`, productError);
            // 继续处理下一个产品
          }
        }
        
        resultData = { products, count: productsCount };
        
      } else if (pageType === 'product_detail' && useAI) {
        console.log('Processing product detail with AI...');
        
        const textContent = extractTextContent(html);
        const productData = await extractWithGLM(textContent, title);
        
        resultData = { product: productData };

        // 飞书同步
        if (enableFeishu) {
          try {
            feishuSyncResult = await syncToFeishu(productData, url);
          } catch (feishuError) {
            console.error('Feishu sync error:', feishuError);
            feishuSyncResult = { action: 'failed', error: (feishuError as Error).message };
          }
        }

        // 保存到数据库
        await supabase.from('products').insert({
          scrape_id: scrapeRecord.id,
          name: productData.name,
          brand: productData.brand,
          release_date: productData.release_date,
          dimensions: productData.dimensions,
          weight: productData.weight,
          display_size: productData.display_size,
          display_resolution: productData.display_resolution,
          display_type: productData.display_type,
          display_protection: productData.display_protection,
          os: productData.os,
          chipset: productData.chipset,
          cpu: productData.cpu,
          gpu: productData.gpu,
          ram: productData.ram,
          storage: productData.storage,
          main_camera: productData.main_camera,
          selfie_camera: productData.selfie_camera,
          video: productData.video,
          battery: productData.battery,
          battery_life: productData.battery_life,
          charging: productData.charging,
          wireless_charging: productData.wireless_charging,
          network: productData.network,
          waterproof_rating: productData.waterproof_rating,
          nfc: productData.nfc,
          usb_type: productData.usb_type,
          audio_jack: productData.audio_jack,
          colors: productData.colors ? { colors: productData.colors } : null,
          price: productData.price,
          special_features: productData.special_features ? { features: productData.special_features } : null,
          feishu_synced: feishuSyncResult?.action === 'created',
          feishu_record_id: feishuSyncResult?.record?.record_id,
        });
        
        productsCount = 1;
      }

      // 更新抓取记录
      await supabase.from('product_scrapes').update({
        title,
        content: JSON.stringify(resultData, null, 2),
        html_content: html.substring(0, 100000),
        status: 'success',
        page_type: pageType,
        product_data: resultData,
        products_count: productsCount,
        scraped_at: new Date().toISOString(),
        feishu_synced: pageType === 'product_list' ? productsCount > 0 : feishuSyncResult?.action === 'created',
        feishu_sync_status: pageType === 'product_list' ? `batch_${productsCount}` : (feishuSyncResult ? `${feishuSyncResult.action}` : null),
        feishu_sync_action: pageType === 'product_list' ? 'batch' : feishuSyncResult?.action,
        feishu_record_id: feishuSyncResult?.record?.record_id,
      }).eq('id', scrapeRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          id: scrapeRecord.id,
          title,
          pageType,
          data: resultData,
          productsCount,
          feishuSync: feishuSyncResult,
          message: pageType === 'product_list' 
            ? `成功抓取 ${productsCount} 个产品并同步到飞书` 
            : `成功抓取并提取产品信息${feishuSyncResult?.action === 'created' ? '，已同步到飞书' : ''}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (scrapeError) {
      console.error('Scrape error:', scrapeError);

      await supabase.from('product_scrapes').update({
        status: 'failed',
        error_message: (scrapeError as Error).message,
      }).eq('id', scrapeRecord.id);

      throw scrapeError;
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});