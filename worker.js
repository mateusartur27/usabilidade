// Cloudflare Worker para API de métricas
// Deploy: wrangler deploy

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Endpoint para registrar clique
    if (url.pathname === '/api/click' && request.method === 'POST') {
      try {
        const data = await request.json();
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const country = request.cf?.country || 'unknown';
        const city = request.cf?.city || 'unknown';
        
        // Salva no KV Storage
        const timestamp = Date.now();
        const key = `click_${timestamp}_${ip.replace(/\./g, '_')}`;
        
        const clickData = {
          ...data,
          ip: ip,
          country: country,
          city: city,
          timestamp: new Date().toISOString(),
          cfData: {
            colo: request.cf?.colo,
            timezone: request.cf?.timezone,
          }
        };
        
        await env.CLICKS.put(key, JSON.stringify(clickData), {
          expirationTtl: 86400 * 30 // 30 dias
        });
        
        // Incrementa contador total
        const totalKey = 'total_clicks';
        const currentTotal = await env.CLICKS.get(totalKey) || '0';
        await env.CLICKS.put(totalKey, String(parseInt(currentTotal) + 1));
        
        return new Response(JSON.stringify({ success: true, clicks: parseInt(currentTotal) + 1 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Endpoint para incrementar visitantes
    if (url.pathname === '/api/visitor' && request.method === 'POST') {
      try {
        const visitorKey = 'total_visitors';
        const currentTotal = await env.CLICKS.get(visitorKey) || '0';
        await env.CLICKS.put(visitorKey, String(parseInt(currentTotal) + 1));
        
        return new Response(JSON.stringify({ success: true, visitors: parseInt(currentTotal) + 1 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Endpoint para obter estatísticas
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      try {
        const list = await env.CLICKS.list({ prefix: 'click_' });
        const ips = new Set();
        const countries = {};
        
        // Processa os cliques
        for (const key of list.keys) {
          try {
            const value = await env.CLICKS.get(key.name);
            if (value) {
              const click = JSON.parse(value);
              ips.add(click.ip);
              
              const country = click.country || 'unknown';
              countries[country] = (countries[country] || 0) + 1;
            }
          } catch (e) {
            console.error('Error parsing click:', e);
          }
        }
        
        // Pega totais
        const totalClicks = parseInt(await env.CLICKS.get('total_clicks') || '0');
        const totalVisitors = parseInt(await env.CLICKS.get('total_visitors') || '0') || Math.round(totalClicks / 0.75);
        
        return new Response(JSON.stringify({
          totalClicks: totalClicks,
          totalVisitors: totalVisitors,
          uniqueIPs: ips.size,
          clickRate: totalVisitors > 0 ? Math.round((totalClicks / totalVisitors) * 100) : 0,
          countries: countries,
          lastUpdate: new Date().toISOString()
        }), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60' // Cache por 1 minuto
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not found', { 
      status: 404,
      headers: corsHeaders
    });
  }
};
