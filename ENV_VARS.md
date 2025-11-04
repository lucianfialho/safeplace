# Variáveis de Ambiente - SafePlace

Este documento lista todas as variáveis de ambiente necessárias para o projeto.

## Variáveis Obrigatórias

### Database (Neon PostgreSQL)

```bash
# URL de conexão do banco de dados PostgreSQL
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# URL direta para conexão (sem pooling) - necessária para migrações
DIRECT_URL="postgresql://user:password@host/database?sslmode=require"
```

**Como obter:**
1. Acesse [Neon Console](https://console.neon.tech/)
2. Selecione seu projeto
3. Na aba "Dashboard", copie a connection string
4. Para `DIRECT_URL`, use a mesma string mas troque o endpoint de pooling pelo endpoint direto

## Variáveis Opcionais

### Aplicação

```bash
# URL pública da aplicação (necessária para algumas features)
NEXT_PUBLIC_APP_URL="https://safeplace-eta.vercel.app"
```

### Sistema de Alertas

```bash
# Habilitar sistema de alertas para monitoramento de cron jobs
ALERTS_ENABLED="true"

# Canais de alerta (separados por vírgula)
# Opções: console, webhook, email
ALERT_CHANNELS="console,webhook"

# Severidade mínima para enviar alertas
# Opções: low, medium, high, critical
ALERT_MIN_SEVERITY="medium"

# URL do webhook (Slack, Discord, etc)
ALERT_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Destinatários de email (separados por vírgula)
ALERT_EMAIL_RECIPIENTS="admin@example.com,devops@example.com"
```

## Configuração no Vercel

### Via Dashboard

1. Acesse [Vercel Dashboard](https://vercel.com/)
2. Selecione o projeto **safeplace**
3. Vá em **Settings** → **Environment Variables**
4. Para cada variável:
   - Clique em **Add New**
   - Nome: insira o nome da variável (ex: `DATABASE_URL`)
   - Value: insira o valor
   - Environments: selecione **Production**, **Preview** e **Development**
   - Clique em **Save**
5. Faça um redeploy ou aguarde o próximo commit

### Via CLI (alternativa)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Adicionar variável
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Listar variáveis
vercel env ls
```

## Configuração Local

Crie um arquivo `.env.local` na raiz do projeto:

```bash
# .env.local
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Alertas (opcional para dev)
ALERTS_ENABLED="false"
```

**Importante:** O arquivo `.env.local` está no `.gitignore` e não deve ser commitado.

## Verificação

Para verificar se as variáveis estão configuradas corretamente:

### Local
```bash
# Rodar o servidor de desenvolvimento
npm run dev

# Testar health check
curl http://localhost:3000/api/health
```

### Produção
```bash
# Testar health check
curl https://safeplace-eta.vercel.app/api/health

# Deve retornar status "healthy" ou "degraded", não "unhealthy" com erro de DATABASE_URL
```

## Troubleshooting

### Erro: "Environment variable not found: DATABASE_URL"

**Causa:** Variável não está configurada no Vercel ou o deploy não foi feito após a configuração.

**Solução:**
1. Verifique se a variável está no Vercel Dashboard
2. Faça um redeploy manual ou commit para triggerar novo deploy
3. Aguarde 1-2 minutos para o deploy completar

### Erro: "Connection refused" ou timeout

**Causa:** URL do banco incorreta ou Neon suspenso por inatividade.

**Solução:**
1. Verifique se a connection string está correta
2. Acesse o Neon Console e verifique se o banco está ativo
3. Teste a conexão localmente primeiro

### Alertas não estão sendo enviados

**Causa:** Variáveis de alerta não configuradas ou webhook URL incorreta.

**Solução:**
1. Verifique se `ALERTS_ENABLED="true"`
2. Confirme que `ALERT_WEBHOOK_URL` está correto
3. Teste o webhook manualmente com curl
4. Verifique os logs do Vercel para erros
