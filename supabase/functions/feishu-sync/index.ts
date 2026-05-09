import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class FeishuConnector {
  private appId: string;
  private appSecret: string;
  private appToken: string;
  private tableId: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(appId: string, appSecret: string, appToken: string, tableId: string) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.appToken = appToken;
    this.tableId = tableId;
    console.log('FeishuConnector initialized');
    console.log(`App Token: ${appToken.substring(0, 10)}...`);
    console.log(`Table ID: ${tableId.substring(0, 10)}...`);
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      console.log('Using cached access token');
      return this.accessToken;
    }

    console.log('Fetching new Feishu access token...');

    try {
      const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: this.appId,
          app_secret: this.appSecret,
        }),
      });

      console.log(`Token request status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text();
        console.error('Token request failed:', error);
        throw new Error(`Failed to get access token: ${error}`);
      }

      const data = await response.json();
      console.log('Token response:', JSON.stringify(data));
      
      if (data.code !== 0) {
        console.error('Feishu API error:', data);
        throw new Error(`Feishu API error: ${data.msg}`);
      }

      this.accessToken = data.tenant_access_token;
      this.tokenExpiry = Date.now() + (data.expire - 300) * 1000;

      console.log('Access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  async findRecordByModel(productName: string): Promise<any | null> {
    const token = await this.getAccessToken();
    console.log(`Searching for product: ${productName}`);

    try {
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables/${this.tableId}/records/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            field_names: ['产品型号', '产品名称', '品牌'],
            filter: {
              conjunction: 'or',
              conditions: [
                {
                  field_name: '产品型号',
                  operator: 'is',
                  value: [productName],
                },
                {
                  field_name: '产品名称',
                  operator: 'is',
                  value: [productName],
                },
              ],
            },
          }),
        }
      );

      console.log(`Search response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text();
        console.error('Search error:', error);
        return null;
      }

      const data = await response.json();
      console.log('Search response:', JSON.stringify(data));

      if (data.code !== 0) {
        console.error('Feishu search error:', data.msg);
        return null;
      }

      if (data.data.items && data.data.items.length > 0) {
        console.log(`Found existing record for: ${productName}`);
        return data.data.items[0];
      }

      console.log(`No existing record found for: ${productName}`);
      return null;
    } catch (error) {
      console.error('Search exception:', error);
      return null;
    }
  }

  transformProductData(product: any, sourceUrl?: string): any {
    console.log('Transforming product data...');
    
    const fields: any = {
      '产品型号': product.name || '',
      '产品名称': product.name || '',
      '品牌': product.brand || '',
      '发布时间': product.release_date || '',
      '尺寸': product.dimensions || '',
      '重量': product.weight || '',
      '屏幕尺寸': product.display_size || '',
      '分辨率': this.combineDisplayInfo(product),
      'OS': product.os || '',
      '芯片CPU': this.combineCpuInfo(product),
      '存储': this.combineStorageInfo(product),
      '前摄': product.selfie_camera || '',
      '主摄': product.main_camera || '',
      '视频规格': product.video || '',
      '电池容量': product.battery || '',
      '续航': product.battery_life || '',
      '充电功率': this.combineChargingInfo(product),
      '防水防尘': product.waterproof_rating || '',
      '网络': product.network || '',
      'NFC': product.nfc ? '是' : '否',
      'USB': product.usb_type || '',
      '颜色': Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || ''),
      '其他': this.combineOtherFeatures(product),
    };

    if (sourceUrl) {
      fields['数据来源'] = sourceUrl;
    }

    fields['抓取时间'] = new Date().toISOString();

    // 移除空值
    Object.keys(fields).forEach(key => {
      if (fields[key] === '' || fields[key] === null || fields[key] === undefined) {
        delete fields[key];
      }
    });

    console.log('Transformed fields:', Object.keys(fields));
    return { fields };
  }

  private combineDisplayInfo(product: any): string {
    const parts = [];
    if (product.display_resolution) parts.push(product.display_resolution);
    if (product.display_type) parts.push(product.display_type);
    if (product.display_protection) parts.push(product.display_protection);
    return parts.join(', ');
  }

  private combineCpuInfo(product: any): string {
    const parts = [];
    if (product.chipset) parts.push(product.chipset);
    if (product.cpu && product.cpu !== product.chipset) parts.push(product.cpu);
    return parts.join(', ');
  }

  private combineStorageInfo(product: any): string {
    const parts = [];
    if (product.ram) parts.push(`RAM: ${product.ram}`);
    if (product.storage) parts.push(`ROM: ${product.storage}`);
    return parts.join(', ');
  }

  private combineChargingInfo(product: any): string {
    const parts = [];
    if (product.charging) parts.push(product.charging);
    if (product.fast_charging) parts.push(product.fast_charging);
    if (product.wireless_charging) parts.push('无线充电');
    return parts.join(', ');
  }

  private combineOtherFeatures(product: any): string {
    const features = [];
    if (product.audio_jack) features.push('3.5mm耳机孔');
    if (product.special_features && Array.isArray(product.special_features)) {
      features.push(...product.special_features);
    }
    if (product.price) features.push(`价格: ${product.price}`);
    return features.join(', ');
  }

  async addRecord(product: any, sourceUrl?: string): Promise<any> {
    const token = await this.getAccessToken();
    const recordData = this.transformProductData(product, sourceUrl);

    console.log('Adding new record to Feishu:', product.name);
    console.log('Record data:', JSON.stringify(recordData));

    try {
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables/${this.tableId}/records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(recordData),
        }
      );

      console.log(`Add record response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text();
        console.error('Add record error:', error);
        throw new Error(`Failed to add record: ${error}`);
      }

      const data = await response.json();
      console.log('Add record response:', JSON.stringify(data));

      if (data.code !== 0) {
        throw new Error(`Feishu API error: ${data.msg}`);
      }

      console.log('Record added successfully:', data.data.record.record_id);
      return data.data.record;
    } catch (error) {
      console.error('Error adding record:', error);
      throw error;
    }
  }

  async updateRecord(recordId: string, product: any, sourceUrl?: string): Promise<any> {
    const token = await this.getAccessToken();
    const recordData = this.transformProductData(product, sourceUrl);

    console.log('Updating existing record in Feishu:', recordId);

    try {
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.appToken}/tables/${this.tableId}/records/${recordId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(recordData),
        }
      );

      console.log(`Update record response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text();
        console.error('Update record error:', error);
        throw new Error(`Failed to update record: ${error}`);
      }

      const data = await response.json();
      console.log('Update record response:', JSON.stringify(data));

      if (data.code !== 0) {
        throw new Error(`Feishu API error: ${data.msg}`);
      }

      console.log('Record updated successfully');
      return data.data.record;
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  }

  async syncProduct(product: any, sourceUrl?: string): Promise<{ action: 'created' | 'updated' | 'skipped', record: any }> {
    if (!product.name) {
      throw new Error('Product name is required for sync');
    }

    console.log('=== Starting Product Sync ===');
    console.log(`Product: ${product.name}`);

    const existingRecord = await this.findRecordByModel(product.name);

    if (existingRecord) {
      console.log('Existing record found, updating...');
      const updatedRecord = await this.updateRecord(existingRecord.record_id, product, sourceUrl);
      return { action: 'updated', record: updatedRecord };
    } else {
      console.log('No existing record, creating new...');
      const newRecord = await this.addRecord(product, sourceUrl);
      return { action: 'created', record: newRecord };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Feishu Sync Function Started ===');
    
    const { product, sourceUrl, action = 'sync' } = await req.json();
    
    console.log('Request data:', { 
      productName: product?.name,
      sourceUrl,
      action 
    });

    if (!product) {
      console.error('No product data provided');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Product data is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appId = Deno.env.get('FEISHU_APP_ID');
    const appSecret = Deno.env.get('FEISHU_APP_SECRET');
    const appToken = Deno.env.get('FEISHU_APP_TOKEN');
    const tableId = Deno.env.get('FEISHU_TABLE_ID');

    console.log('Environment check:', {
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
      hasAppToken: !!appToken,
      hasTableId: !!tableId,
    });

    if (!appId || !appSecret || !appToken || !tableId) {
      throw new Error('Feishu credentials not configured');
    }

    const connector = new FeishuConnector(appId, appSecret, appToken, tableId);

    let result;

    switch (action) {
      case 'sync':
        result = await connector.syncProduct(product, sourceUrl);
        break;
      case 'add':
        result = { action: 'created', record: await connector.addRecord(product, sourceUrl) };
        break;
      case 'search':
        const existingRecord = await connector.findRecordByModel(product.name);
        result = { action: 'searched', record: existingRecord };
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('=== Sync Successful ===');
    console.log(`Action: ${result.action}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Feishu Sync Error ===');
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