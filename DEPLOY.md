# 🚀 Deploy na Vercel - Guia Completo

## ✅ Pré-requisitos

- [x] Código no GitHub: `lucianfialho/safeplace`
- [x] Banco Neon configurado com PostGIS
- [x] Conta na Vercel

---

## 📝 Passo a Passo

### 1. Acessar Vercel e Importar Projeto

1. Acesse: https://vercel.com/new
2. Clique em **"Import Git Repository"**
3. Selecione **`lucianfialho/safeplace`**
4. Clique em **"Import"**

### 2. Configurar Build Settings

A Vercel deve detectar automaticamente:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

✅ Mantenha as configurações padrão.

### 3. Configurar Environment Variables

**⚠️ IMPORTANTE**: Adicione TODAS essas variáveis antes de fazer o deploy!

Clique em **"Environment Variables"** e adicione:

#### Database (Neon)
```
DATABASE_URL=postgresql://neondb_owner:npg_hX3Tk2ejQHCp@ep-shiny-mud-aczk5ic2-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require

DIRECT_DATABASE_URL=postgresql://neondb_owner:npg_hX3Tk2ejQHCp@ep-shiny-mud-aczk5ic2.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

#### Next.js
```
NEXT_PUBLIC_API_URL=https://seu-dominio.vercel.app
```
⚠️ **Você vai atualizar isso depois do primeiro deploy!**

#### Cron Secret (Importante!)
```
CRON_SECRET=gere-um-secret-aleatorio-aqui-123456
```
🔐 Gere um secret aleatório forte. Exemplo:
```bash
openssl rand -base64 32
```

#### Opcional (pode adicionar depois)
```
NEXT_PUBLIC_MAPBOX_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 4. Fazer Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. ✅ Deploy concluído!

---

## 🔧 Configurações Pós-Deploy

### 1. Atualizar NEXT_PUBLIC_API_URL

Depois do primeiro deploy:

1. Copie sua URL da Vercel (ex: `https://safeplace-xyz.vercel.app`)
2. Vá em **Settings > Environment Variables**
3. Edite `NEXT_PUBLIC_API_URL` e coloque sua URL
4. **Redeploy** o projeto

### 2. Verificar Cron Job

1. Vá em **Settings > Cron Jobs**
2. Você deve ver: `/api/cron/scrape-ott` com schedule `0 * * * *`
3. ✅ O cron vai rodar automaticamente a cada hora!

### 3. Testar Cron Manualmente

```bash
curl https://seu-dominio.vercel.app/api/cron/scrape-ott \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

Deve retornar:
```json
{
  "success": true,
  "recordsFound": 20,
  "recordsNew": 5,
  "recordsDuplicate": 15,
  "durationMs": 18500,
  "timestamp": "2025-11-03T..."
}
```

---

## 📊 Monitoramento

### Ver Logs do Cron

1. Vá em **Deployments > [Latest] > Functions**
2. Clique em `api/cron/scrape-ott.func`
3. Veja logs em tempo real

### Ver Dados no Neon

1. Acesse https://console.neon.tech
2. Abra o SQL Editor
3. Execute:
```sql
SELECT COUNT(*) FROM incidents;
SELECT * FROM incidents ORDER BY occurred_at DESC LIMIT 10;
```

### Vercel Analytics

1. Vá em **Analytics**
2. Veja requests, performance, etc.

---

## 🐛 Troubleshooting

### Cron não está rodando

**Problema**: Cron jobs não executam
**Solução**:
1. Verifique se `vercel.json` foi commitado
2. Verifique `CRON_SECRET` está configurado
3. Faça um redeploy

### Database connection error

**Problema**: `Error connecting to database`
**Solução**:
1. Verifique `DATABASE_URL` está correto
2. Certifique-se que termina com `?sslmode=require`
3. Teste conexão no Neon Console

### PostGIS errors

**Problema**: `type "incident_type" does not exist`
**Solução**: Rode os SQLs no Neon:
1. `prisma/create-enums.sql`
2. `prisma/add-postgis-columns.sql`

### Build fails

**Problema**: Build falha na Vercel
**Solução**:
1. Rode `npm run build` localmente primeiro
2. Verifique erros de TypeScript
3. Certifique-se que todas as dependências estão no `package.json`

---

## ✅ Checklist Final

Após deploy, verifique:

- [ ] Site abre em `https://seu-dominio.vercel.app`
- [ ] Cron job configurado (Settings > Cron Jobs)
- [ ] Todas env vars configuradas
- [ ] Teste manual do cron funciona
- [ ] Logs do cron aparecem (Functions > Logs)
- [ ] Dados estão sendo salvos no Neon
- [ ] Nenhum erro em Vercel Logs

---

## 🎯 Próximos Passos

Após confirmar que o cron está funcionando:

1. **Esperar alguns dias** para coletar dados
2. **Desenvolver o Safety Score Engine**
3. **Criar as API Routes**
4. **Construir o Frontend**

---

## 💰 Custos

**Vercel Free Tier:**
- ✅ 100 GB bandwidth
- ✅ Cron jobs incluídos
- ✅ Serverless Functions incluídas

**Neon Free Tier:**
- ✅ 0.5 GB storage
- ✅ 100 compute hours/mês
- ✅ PostGIS incluído

**Total: $0/mês** 🎉

---

## 🆘 Precisa de Ajuda?

- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Issues: https://github.com/lucianfialho/safeplace/issues
