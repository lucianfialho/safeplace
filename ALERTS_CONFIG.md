# Sistema de Alertas - Configuração

Este documento descreve como configurar o sistema de alertas para monitoramento de cron jobs.

## Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Habilitar sistema de alertas
ALERTS_ENABLED=true

# Canais de alerta (separados por vírgula)
# Opções: console, webhook, email
ALERT_CHANNELS=console,webhook

# URL do webhook (Slack, Discord, etc)
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Destinatários de email (separados por vírgula)
ALERT_EMAIL_RECIPIENTS=admin@example.com,devops@example.com

# Severidade mínima para enviar alertas
# Opções: low, medium, high, critical
ALERT_MIN_SEVERITY=medium

# URL da aplicação (para chamadas internas)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Níveis de Severidade

Os alertas são classificados em 4 níveis:

### 🔥 Critical (Crítico)
- Cron job parado (sem execução há mais de 2 horas)
- Sistema completamente inativo

### 🚨 High (Alto)
- Taxa de falha > 50%
- Mais da metade das execuções falhando

### ⚠️ Medium (Médio)
- Taxa de falha entre 10% e 50%
- Tempo médio de execução muito alto (> 5 minutos)

### ℹ️ Low (Baixo)
- Última execução individual falhou
- Avisos gerais

## Canais de Alerta

### 1. Console
Logs no console do servidor. Sempre habilitado para debugging.

```bash
ALERT_CHANNELS=console
```

### 2. Webhook (Slack, Discord, etc)

#### Slack
1. Crie um Incoming Webhook no Slack:
   - Acesse https://api.slack.com/apps
   - Crie um novo app
   - Ative "Incoming Webhooks"
   - Adicione um webhook para um canal

2. Configure a URL:
```bash
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX
ALERT_CHANNELS=console,webhook
```

#### Discord
1. Crie um webhook no Discord:
   - Configurações do Canal → Integrações → Webhooks
   - Copie a URL do webhook

2. Configure:
```bash
ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdefghijk
ALERT_CHANNELS=console,webhook
```

#### Webhook Personalizado
O payload enviado segue este formato:

```json
{
  "severity": "critical",
  "title": "Cron Job Parado",
  "message": "O cron job não executou nas últimas 2 horas...",
  "timestamp": "2025-11-04T10:00:00.000Z",
  "metadata": {
    "stats": {
      "totalExecutions": 24,
      "failures": 12,
      "successRate": 50.0
    }
  }
}
```

### 3. Email
TODO: Integrar com SendGrid, AWS SES, ou outro provedor de email.

```bash
ALERT_EMAIL_RECIPIENTS=admin@example.com,devops@example.com
ALERT_CHANNELS=console,email
```

## Monitoramento Automático

### Opção 1: Vercel Cron Job (Recomendado)

Adicione ao `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-ott",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/alerts/check",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Isso executará a verificação de alertas a cada 15 minutos.

### Opção 2: Serviço Externo de Monitoramento

Use serviços como UptimeRobot, Better Uptime, ou Pingdom para chamar:

```
GET https://your-app.vercel.app/api/alerts/check
```

Configure para executar a cada 15-30 minutos.

### Opção 3: GitHub Actions

Crie `.github/workflows/health-check.yml`:

```yaml
name: Health Check
on:
  schedule:
    - cron: '*/15 * * * *'  # A cada 15 minutos
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Health Check
        run: |
          curl -f https://your-app.vercel.app/api/alerts/check || exit 1
```

## Dashboard de Monitoramento

Acesse o dashboard em:

```
https://your-app.vercel.app/cron-monitor
```

O dashboard oferece:
- ✅ Status de saúde em tempo real
- 📊 Estatísticas de execução (24h e lifetime)
- 📋 Histórico completo de execuções
- 🔄 Auto-refresh a cada 30 segundos
- 🔍 Filtros por status (sucesso/falha)
- 📄 Paginação

## Testando o Sistema

1. Verifique o health check:
```bash
curl http://localhost:3000/api/health/cron
```

2. Teste a geração de alertas:
```bash
curl http://localhost:3000/api/alerts/check
```

3. Simule uma falha no cron para testar alertas (opcional)

## Endpoints Disponíveis

- `GET /api/health/cron` - Health check do cron job
- `GET /api/cron/logs` - Logs paginados de execuções
- `GET /api/alerts/check` - Verifica saúde e envia alertas
- `/cron-monitor` - Dashboard visual de monitoramento

## Próximos Passos

1. Configure as variáveis de ambiente no Vercel:
   ```bash
   vercel env add ALERTS_ENABLED
   vercel env add ALERT_CHANNELS
   vercel env add ALERT_WEBHOOK_URL
   ```

2. Adicione o cron de alertas ao `vercel.json`

3. Configure seu webhook no Slack/Discord

4. Monitore o dashboard regularmente

## Solução de Problemas

### Alertas não estão sendo enviados
- Verifique se `ALERTS_ENABLED=true`
- Confirme que `ALERT_CHANNELS` está configurado
- Teste manualmente: `curl /api/alerts/check`

### Webhook não funciona
- Valide a URL do webhook
- Verifique os logs do console para erros
- Teste o webhook diretamente com curl

### Dashboard não carrega
- Verifique se o servidor está rodando
- Abra o console do navegador para erros
- Confirme que as APIs `/api/health/cron` e `/api/cron/logs` funcionam
