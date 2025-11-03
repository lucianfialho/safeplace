# 📸 Instagram Import - Guia Completo

## Visão Geral

O Instagram do @onde_tem_tiroteio tem dados históricos valiosos. Este guia mostra como coletar e importar essas legendas para construir um histórico completo de incidentes.

---

## ⚠️ Pré-requisito: Adicionar OPERACAO_POLICIAL

**Antes de importar, rode este SQL no Neon:**

```sql
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'OPERACAO_POLICIAL';
```

Isso adiciona o tipo "Operação Policial" que aparece nas legendas.

---

## 🤖 Opção 1: Usando Agente de IA (Recomendado)

### Ferramentas Sugeridas:

#### **Browser Use** (Python - Mais Simples)
```python
from browser_use import Agent

agent = Agent(
    task="Acesse https://www.instagram.com/onde_tem_tiroteio/ e extraia todas as legendas dos posts. Salve em um arquivo txt separando cada legenda com ----",
    llm=your_llm  # OpenAI, Anthropic, etc
)

result = agent.run()
```

#### **Playwright + GPT** (TypeScript)
```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://www.instagram.com/onde_tem_tiroteio/');

// Scroll e extrair legendas
// Use GPT para ajudar a identificar elementos
```

#### **Apify** (Sem código)
1. Vá em https://apify.com/
2. Procure por "Instagram Post Scraper"
3. Configure: `@onde_tem_tiroteio`
4. Extraia todas as legendas
5. Exporte como TXT

---

## 📝 Formato do Arquivo de Legendas

Crie um arquivo `instagram-captions.txt` com este formato:

```
OTT 360 INFORMA:
Tiroteio - 15/10/25 06:33
Pavuna - Rio de Janeiro RJ

----

OTT 360 INFORMA:
Disparos Ouvidos - 20/10/25 14:22
Copacabana - Rio de Janeiro RJ

----

OTT 360 INFORMA:
Operação Policial - 25/10/25 10:15
Complexo do Alemão - Rio de Janeiro RJ

----

... mais legendas ...
```

### Regras Importantes:

1. **Separador:** Use `----` (4 hífens) em uma linha sozinha entre legendas
2. **Mantenha o formato original:** Não modifique as legendas
3. **3 linhas por incidente:**
   - Linha 1: "OTT 360 INFORMA:"
   - Linha 2: "Tipo - DD/MM/YY HH:MM"
   - Linha 3: "Bairro - Município UF"

### Tipos Reconhecidos:
- `Tiroteio`
- `Disparos Ouvidos`
- `Incêndio` / `Incendio`
- `Operação Policial` / `Operacao Policial`
- `Utilidade Pública` / `Utilidade Publica`

---

## 🚀 Como Importar

### 1. Importar de Arquivo
```bash
npm run import:instagram instagram-captions.txt
```

### 2. Importar Manualmente (Cola e Cola)
```bash
npm run import:instagram
```

Depois cole as legendas e pressione:
- **Unix/Mac:** Ctrl+D
- **Windows:** Ctrl+Z

---

## 📊 O que Acontece

1. **Parse:** Extrai dados estruturados das legendas
2. **Geocoding:** Converte "Copacabana, Rio de Janeiro" → lat/lng
3. **Deduplicação:** Não salva incidentes duplicados
4. **Validação:** Ignora legendas mal formatadas

### Exemplo de Output:
```
📖 Reading captions from: instagram-captions.txt
Found 150 captions

🔍 Parsing captions...
   Parsed: 148/150 captions

🗺️  Geocoding locations...
   Geocoded: 142/148 incidents

💾 Saving to database...
   Saved: 135 new incidents

📈 Total incidents in database: 154

📅 Date Range:
   Oldest: 2025-06-01T10:30:00.000Z
   Newest: 2025-11-03T13:27:00.000Z
   Span: 155 days
```

---

## 🎯 Estratégia Recomendada

### Para Histórico Completo:

1. **Use um agente de IA** para scroll automático
2. **Comece do post mais antigo** e vá subindo
3. **Salve em batches** (ex: 100 legendas por arquivo)
4. **Importe gradualmente:**
   ```bash
   npm run import:instagram batch-1.txt
   npm run import:instagram batch-2.txt
   npm run import:instagram batch-3.txt
   ```

### Para Manutenção Contínua:

Após ter o histórico, você pode:
1. Verificar novos posts semanalmente
2. Ou deixar o cron diário pegar automaticamente do site

---

## 🐛 Troubleshooting

### "Invalid enum value OPERACAO_POLICIAL"
❌ Você não rodou o SQL de pré-requisito
✅ Rode: `ALTER TYPE "IncidentType" ADD VALUE 'OPERACAO_POLICIAL';`

### "Parsed: 0/50 captions"
❌ Formato de legenda incorreto
✅ Confira se tem 3 linhas por incidente
✅ Use `----` como separador

### "Geocoded: 10/50 incidents"
⚠️  Alguns bairros não foram encontrados
✅ Normal - alguns locais são difíceis de geocodificar
✅ Você pode melhorar depois com geocoding manual

### "Saved: 0 new incidents"
⚠️  Todos já estão no banco (duplicatas)
✅ Sistema funcionando - deduplicação OK!

---

## 📈 Métricas Esperadas

Com ~1000 posts do Instagram, você terá:
- **~6 meses** de dados históricos
- **~800-900 incidentes** geocodificados
- **Cobertura completa** de Rio de Janeiro
- **Dados desde:** Junho 2025 (depende do histórico)

---

## 🔄 Workflow Completo

```mermaid
Instagram Posts
    ↓
Agente de IA (scroll + extrair)
    ↓
Arquivo TXT (captions.txt)
    ↓
npm run import:instagram
    ↓
Parse + Geocode + Deduplicate
    ↓
Database PostgreSQL
    ↓
Safety Score Engine
    ↓
API Endpoints
```

---

## 💡 Dicas Avançadas

### Processar Grandes Volumes

Para 1000+ legendas, divida em batches:

```bash
# Criar batches de 100
split -l 400 captions.txt batch-  # 100 legendas = ~400 linhas (3 + separator)

# Importar todos
for file in batch-*; do
  npm run import:instagram "$file"
  sleep 2  # Pausa para não sobrecarregar geocoding
done
```

### Validar Antes de Importar

Teste com um arquivo pequeno primeiro:

```bash
# Crie test.txt com 5-10 legendas
npm run import:instagram test.txt

# Verifique se funcionou
npm run db:studio  # Abrir Prisma Studio e ver os dados
```

---

## ✅ Checklist

Antes de começar o import em massa:

- [ ] SQL rodado no Neon (OPERACAO_POLICIAL adicionado)
- [ ] Testado com arquivo pequeno (5-10 legendas)
- [ ] Geocoding funcionando (check lat/lng no banco)
- [ ] Deduplicação testada (rodar import 2x não duplica)
- [ ] Formato de arquivo correto (----
 separador)

---

## 🆘 Precisa de Ajuda?

Se algo der errado:

1. Confira os logs do terminal
2. Teste com arquivo pequeno primeiro
3. Verifique o formato das legendas
4. Rode o SQL de pré-requisito

---

**Próximo Passo:** Rode o SQL no Neon e teste com algumas legendas! 🚀
