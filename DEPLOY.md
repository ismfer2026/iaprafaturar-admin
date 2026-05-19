# 🚀 Guia de Deploy - iaprafaturar Admin

Instruções para deploy em produção via Vercel, Netlify, Docker ou servidores privados.

---

## 📋 Pré-requisitos

- ✅ Variáveis de ambiente configuradas
- ✅ Build local funcionando (`npm run build`)
- ✅ Supabase configurado e acessível

---

## 🎯 Opção 1: Vercel (Recomendado)

### Vantagens
- ✅ Deploy automático em push
- ✅ Previewe em PRs
- ✅ Escalabilidade automática
- ✅ CDN global
- ✅ Certificado SSL grátis

### Setup

1. **Conectar repositório**
   ```bash
   # Visite https://vercel.com
   # 1. Sign in com GitHub
   # 2. "Add New" → "Project"
   # 3. Selecione repositório
   # 4. Vercel detectará Vite automaticamente
   ```

2. **Configurar variáveis**
   - Acesse "Settings" → "Environment Variables"
   - Adicione:
     ```
     VITE_SUPABASE_URL=...
     VITE_SUPABASE_ANON_KEY=...
     ```

3. **Deploy automático**
   ```bash
   # Push para main dispara deploy automático
   git push origin main
   ```

### Resultado
- URL: `seu-projeto.vercel.app`
- Build time: ~2 minutos
- Uptime: 99.99%

---

## 🎯 Opção 2: Netlify

### Setup

1. **Conectar repositório**
   ```bash
   # Visite https://netlify.com
   # 1. "New site from Git"
   # 2. Selecione GitHub
   # 3. Escolha repositório
   ```

2. **Configurar build**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Variáveis de ambiente**
   - "Site settings" → "Build & deploy" → "Environment"
   - Adicionar variáveis

4. **Deploy**
   ```bash
   git push origin main
   # Deploy automático disparado
   ```

### Resultado
- URL: `seu-projeto.netlify.app`
- Preview em PRs automático

---

## 🎯 Opção 3: Docker + Cloud Run (Google)

### Build e test local

```bash
# Build image
docker build -t iaprafaturar-admin:latest .

# Run locally
docker run -p 3000:3000 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_ANON_KEY=... \
  iaprafaturar-admin:latest

# Acesse http://localhost:3000
```

### Deploy no Google Cloud Run

```bash
# 1. Autenticar
gcloud auth login
gcloud config set project SEU_PROJECT_ID

# 2. Build e push
gcloud builds submit --tag gcr.io/SEU_PROJECT/iaprafaturar-admin:latest

# 3. Deploy
gcloud run deploy iaprafaturar-admin \
  --image gcr.io/SEU_PROJECT/iaprafaturar-admin:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars VITE_SUPABASE_URL=...,VITE_SUPABASE_ANON_KEY=...

# 4. Resultado
# URL: https://iaprafaturar-admin-XXXXX.run.app
```

---

## 🎯 Opção 4: AWS S3 + CloudFront

### Setup S3

```bash
# 1. Criar bucket
aws s3 mb s3://iaprafaturar-admin

# 2. Enable static website hosting
aws s3 website s3://iaprafaturar-admin \
  --index-document index.html \
  --error-document index.html

# 3. Upload build
aws s3 sync dist/ s3://iaprafaturar-admin/

# 4. Criar CloudFront distribution
# → Use S3 como origin
# → Cache behavior: Cache everything
# → SSL: AWS Certificate Manager (grátis)
```

---

## 🎯 Opção 5: Servidor Privado (VPS/Dedicated)

### Com Docker Compose (Recomendado)

```bash
# 1. SSH no servidor
ssh root@seu-servidor.com

# 2. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Clone repositório
git clone https://github.com/seu-repo/iaprafaturar-admin
cd iaprafaturar-admin

# 4. Criar .env com variáveis
cp .env.example .env
# Edite .env com valores reais

# 5. Deploy
docker-compose up -d

# 6. Resultado
# Acesso via http://seu-servidor.com
# Nginx roda em porta 80
# Admin roda em porta 3000 (internal)
```

### Com PM2 + Nginx

```bash
# 1. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar PM2
npm install -g pm2

# 3. Setup da app
git clone https://github.com/seu-repo/iaprafaturar-admin
cd iaprafaturar-admin
npm install
npm run build

# 4. Criar pm2 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'iaprafaturar-admin',
    script: './node_modules/.bin/serve',
    args: '-s dist -l 3000',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# 5. Start com PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 6. Configurar Nginx (reverse proxy)
sudo apt-get install nginx
sudo tee /etc/nginx/sites-available/admin << 'EOF'
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 7. SSL (Certbot)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## ✅ Checklist Pre-Deploy

- [ ] Build local passou (`npm run build`)
- [ ] i18n scan sem warnings (`npm run i18n:scan`)
- [ ] Variáveis de ambiente configuradas
- [ ] Supabase acessível (test RLS)
- [ ] CORS configurado no Supabase
- [ ] Teste de autenticação funciona
- [ ] TODOs resolvidos (0 no código)
- [ ] Commits feitos e pushed

---

## 🔄 CI/CD Automático

### GitHub Actions (Incluído)

O arquivo `.github/workflows/deploy.yml` automatiza:

1. **Build** - Compila a aplicação
2. **Type check** - Valida tipos TypeScript
3. **i18n check** - Verifica traduções
4. **Deploy** - Publica em produção (main push)

Descomente a opção de deploy desejada no workflow.

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| "Supabase connection refused" | Validar VITE_SUPABASE_URL e ANON_KEY |
| "Cannot find module" | Limpar cache: `rm -rf dist node_modules` |
| "CORS error" | Configurar CORS no Supabase dashboard |
| "Build timeout" | Aumentar timeout no CI/CD (padrão 10min) |
| "Port already in use" | `lsof -i :3000` e matar processo |

---

## 📊 Monitoramento Pós-Deploy

### Recomendações

- **Uptime Monitoring:** UptimeRobot ou Pingdom
- **Error Tracking:** Sentry ou Rollbar
- **Analytics:** Plausible ou Mixpanel
- **Performance:** Datadog ou New Relic

### Logs

```bash
# Docker
docker logs -f iaprafaturar-admin

# PM2
pm2 logs iaprafaturar-admin

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔐 Security Checklist

- [ ] HTTPS ativado (SSL/TLS)
- [ ] CORS restricto a domínios válidos
- [ ] Variáveis sensíveis em secrets/env
- [ ] Headers de segurança configurados
- [ ] Rate limiting ativo
- [ ] Dependências atualizadas

---

## 📈 Performance

### Métricas Esperadas

- **FCP (First Contentful Paint):** < 2s
- **LCP (Largest Contentful Paint):** < 2.5s
- **CLS (Cumulative Layout Shift):** < 0.1
- **TTFB (Time to First Byte):** < 600ms

### Otimizações

```bash
# Compressão Gzip (Nginx ativa por padrão)
# Cache headers (1 dia para assets)
# Code splitting (Vite automático)
# Image optimization (use WebP)
```

---

## 🎯 Próximos Passos

1. ✅ Escolha uma opção de deploy (Vercel recomendado)
2. ✅ Configure variáveis de ambiente
3. ✅ Execute primeiro deploy
4. ✅ Teste fluxo completo em produção
5. ✅ Configure monitoring
6. ✅ Documente runbooks

---

**Versão:** 1.0.0  
**Última atualização:** Maio 2026  
**Status:** ✅ Pronto para produção
