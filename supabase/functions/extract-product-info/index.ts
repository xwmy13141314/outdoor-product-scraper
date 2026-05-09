import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutdoorProduct {
  name: string;
  brand?: string;
  release_date?: string;
  dimensions?: string;
  weight?: string;
  display_size?: string;
  display_resolution?: string;
  display_type?: string;
  display_protection?: string;
  os?: string;
  chipset?: string;
  cpu?: string;
  cpu_details?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  main_camera?: string;
  selfie_camera?: string;
  video?: string;
  battery?: string;
  battery_life?: string;
  charging?: string;
  fast_charging?: string;
  wireless_charging?: boolean;
  network?: string;
  waterproof_rating?: string;
  nfc?: boolean;
  usb_type?: string;
  audio_jack?: boolean;
  colors?: string[];
  price?: string;
  special_features?: string[];
}

async function extractProductInfo(text: string, productName?: string): Promise<OutdoorProduct | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not configured');
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  console.log('Preparing to call Claude API...');
  console.log(`Text length: ${text.length} characters`);
  console.log(`Product name hint: ${productName || 'none'}`);

  const trimmedText = text.substring(0, 15000);

  const prompt = `你是一个专业的产品信息提取助手。请从以下网页文本中提取户外电子产品的详细信息。

**重要规则：**
1. 只提取实际存在的信息，没有的字段返回 null
2. 防水等级（如 IP68、IP69K）提取到 waterproof_rating 字段
3. 续航时间统一格式（如 "待机 500 小时" 或 "使用 24 小时"）
4. 充电功率带单位（如 "15W"、"25W"）
5. 所有布尔值字段如果明确提到才设为 true，否则 false
6. 尺寸格式：长x宽x高 单位
7. 重量格式：数值 单位
8. 显示器尺寸格式：数值英寸
9. 分辨率格式：宽x高像素

**网页文本：**
${trimmedText}

请严格按照以下 JSON Schema 返回数据（只返回 JSON，不要其他解释）：

{
  "name": "产品全名",
  "brand": "品牌名",
  "release_date": "发布时间",
  "dimensions": "尺寸（长x宽x高）",
  "weight": "重量",
  "display_size": "屏幕尺寸",
  "display_resolution": "屏幕分辨率",
  "display_type": "屏幕类型（如 PLS LCD, AMOLED）",
  "display_protection": "屏幕保护（如 Gorilla Glass）",
  "os": "操作系统",
  "chipset": "芯片组",
  "cpu": "CPU",
  "cpu_details": "CPU详细信息",
  "gpu": "GPU",
  "ram": "运行内存",
  "storage": "存储容量",
  "main_camera": "主摄像头",
  "selfie_camera": "前置摄像头",
  "video": "视频录制",
  "battery": "电池容量",
  "battery_life": "续航时间",
  "charging": "充电功率",
  "fast_charging": "快充技术",
  "wireless_charging": true/false,
  "network": "网络制式",
  "waterproof_rating": "防水等级（如 IP68）",
  "nfc": true/false,
  "usb_type": "USB类型",
  "audio_jack": true/false,
  "colors": ["颜色1", "颜色2"],
  "price": "价格",
  "special_features": ["特殊功能1", "特殊功能2"]
}`;

  try {
    console.log('Calling Claude API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    console.log(`Claude API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error response:', errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Claude API response received successfully');

    if (!result.content || !result.content[0]) {
      console.error('Invalid response structure:', JSON.stringify(result));
      throw new Error('Invalid response structure from Claude API');
    }

    const content = result.content[0].text;
    console.log('Extracted content preview:', content.substring(0, 200));

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response. Full content:', content);
      throw new Error('Failed to extract JSON from Claude response');
    }

    const productData: OutdoorProduct = JSON.parse(jsonMatch[0]);
    
    // 数据清理和验证
    if (!productData.name && productName) {
      productData.name = productName;
    }

    console.log('Successfully extracted product data:', productData.name);
    return productData;

  } catch (error) {
    console.error('Error in extractProductInfo:', error);
    console.error('Error stack:', (error as Error).stack);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Extract Product Info Function Started ===');
    
    const requestBody = await req.json();
    console.log('Request received with text length:', requestBody.text?.length || 0);
    
    const { text, productName } = requestBody;

    if (!text) {
      console.error('No text provided in request');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Text is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracting product info from ${text.length} characters of text`);

    const productData = await extractProductInfo(text, productName);

    console.log('=== Extraction Successful ===');
    console.log('Product name:', productData?.name);

    return new Response(
      JSON.stringify({
        success: true,
        data: productData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Function Error ===');
    console.error('Error message:', (error as Error).message);
    console.error('Error stack:', (error as Error).stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        details: (error as Error).stack,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});