# 🆕 Adicionando Novos Tipos de Incidentes

## Novos Tipos Adicionados

- **ASSALTO** (Severity: 8)
- **ARRASTAO** (Severity: 9)
- **MANIFESTACAO** (Severity: 4)
- **TOQUE_DE_RECOLHER** (Severity: 8)
- **PERSEGUICAO_POLICIAL** (Severity: 6)
- **ROUBO_DE_CARGA** (Severity: 7)
- **CARROS_NA_CONTRAMAO** (Severity: 6)

## 🚀 Como Aplicar

### 1. Rodar SQL no Neon

Acesse o SQL Editor no Neon e execute:

```sql
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'ASSALTO';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'ARRASTAO';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'MANIFESTACAO';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'TOQUE_DE_RECOLHER';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'PERSEGUICAO_POLICIAL';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'ROUBO_DE_CARGA';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'CARROS_NA_CONTRAMAO';
```

Ou copie e cole o conteúdo de: `prisma/add-new-incident-types.sql`

### 2. Regenerar Prisma Client

```bash
npm run db:generate
```

### 3. Re-importar Dados do Instagram

Agora você pode importar novamente o JSON que já temos validado, e os 79 incidentes que foram ignorados anteriormente serão incluídos:

```bash
npm run import:json
```

## 📊 Impacto Esperado

**Antes:**
- 735 parsed / 814 total
- 79 ignorados (tipos desconhecidos)

**Depois:**
- ~814 parsed / 814 total
- 0 ignorados (todos os tipos suportados)
- **+79 incidentes adicionais** no banco

## ✅ Verificação

Após re-importar, verifique os stats:

```bash
curl http://localhost:3000/api/stats
```

Você deve ver o novo total de incidentes incluindo os tipos adicionados.

## 🎯 Severidade dos Novos Tipos

- **10** - Tiroteio (mais grave)
- **9** - Arrastão
- **8** - Assalto, Toque de Recolher
- **7** - Operação Policial, Roubo de Carga
- **6** - Incêndio, Perseguição Policial, Carros na Contramão
- **5** - Disparos Ouvidos
- **4** - Manifestação
- **2** - Utilidade Pública (menos grave)
