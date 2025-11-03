# 🚫 Botão Proibido - Teste de Usabilidade

Um experimento divertido de usabilidade que demonstra o paradoxo da curiosidade humana.

## 📊 Funcionalidades

- ✨ Design responsivo para mobile, tablet e desktop
- 📱 Rastreamento de cliques com métricas reais
- 🌍 Captura de IP e geolocalização dos usuários
- 📈 Estatísticas em tempo real
- 🎨 Interface moderna e atraente

## 🚀 Deploy no Cloudflare Pages

### Opção 1: Via GitHub (Recomendado)

1. Faça push do código para o GitHub
2. Acesse [Cloudflare Pages](https://pages.cloudflare.com/)
3. Clique em "Create a project"
4. Conecte seu repositório GitHub
5. Configure o build:
   - Build command: (deixe vazio)
   - Build output directory: `/`
6. Deploy!

### Opção 2: Via Wrangler CLI

```bash
npm install -g wrangler
wrangler pages publish . --project-name=usabilidade
```

## 🔧 API com Cloudflare Workers (Opcional)

Para métricas reais completas, você pode criar um Cloudflare Worker:

### Arquivo: `worker.js`

```javascript
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
      const data = await request.json();
      const ip = request.headers.get('CF-Connecting-IP');
      
      // Salva no KV Storage
      const key = `click_${Date.now()}_${ip}`;
      await env.CLICKS.put(key, JSON.stringify({
        ...data,
        ip: ip,
        timestamp: new Date().toISOString()
      }));
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Endpoint para obter estatísticas
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const list = await env.CLICKS.list();
      const clicks = [];
      const ips = new Set();
      
      for (const key of list.keys) {
        const value = await env.CLICKS.get(key.name);
        const click = JSON.parse(value);
        clicks.push(click);
        ips.add(click.ip);
      }
      
      // Pega total de visitantes (você pode implementar um contador separado)
      const totalVisitors = Math.round(clicks.length / 0.75); // Estima que 75% clicam
      
      return new Response(JSON.stringify({
        totalClicks: clicks.length,
        totalVisitors: totalVisitors,
        uniqueIPs: ips.size,
        clicks: clicks.slice(-10) // Últimos 10 cliques
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
```

### Configurar Worker:

1. Crie um KV Namespace no Cloudflare:
   ```bash
   wrangler kv:namespace create "CLICKS"
   ```

2. Crie `wrangler.toml`:
   ```toml
   name = "usabilidade-api"
   main = "worker.js"
   compatibility_date = "2024-01-01"

   [[kv_namespaces]]
   binding = "CLICKS"
   id = "SEU_KV_ID_AQUI"
   ```

3. Deploy:
   ```bash
   wrangler deploy
   ```

## 📱 Recursos Responsivos

- Desktop: Layout completo com animações
- Tablet: Textos e espaçamentos otimizados
- Mobile: Interface compacta e touch-friendly

## 🎯 Como Funciona

1. Usuário visita o site e vê o botão "Não clique nesse botão"
2. Ao clicar, o sistema registra:
   - IP do usuário
   - Timestamp
   - Geolocalização (país e cidade)
   - User Agent
   - Resolução da tela
3. Redireciona para página de "erro" mostrando estatísticas
4. Calcula a porcentagem real de usuários que clicaram

## 📝 Licença

MIT - Sinta-se livre para usar e modificar!
