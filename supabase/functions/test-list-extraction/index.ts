import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = 'https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=xcover';
    
    console.log('Fetching list page...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const html = await response.text();
    console.log(`Fetched ${html.length} characters`);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }
    
    // 提取产品链接
    const productLinks: string[] = [];
    
    // 尝试多种选择器
    const selectors = [
      '.makers ul li a',
      '.product-item a',
      'a[href*=".php"]',
      '.review-item a',
    ];
    
    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      console.log(`Selector "${selector}" found ${elements.length} elements`);
      
      for (const link of elements) {
        const href = link.getAttribute('href');
        const text = link.textContent?.trim();
        console.log(`  Link: ${href} - Text: ${text}`);
        
        if (href && href.includes('.php') && !href.includes('results.php')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.gsmarena.com/${href}`;
          if (!productLinks.includes(fullUrl)) {
            productLinks.push(fullUrl);
          }
        }
      }
    }
    
    console.log(`Total unique product links: ${productLinks.length}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        totalLinks: productLinks.length,
        links: productLinks.slice(0, 20),
        htmlLength: html.length,
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