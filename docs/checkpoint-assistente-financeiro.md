# Checkpoint — Assistente Financeiro Pessoal

> Documento de continuidade do projeto. Guarde-o e cole num chat novo para retomar do mesmo ponto.
> **Status:** ideia madura, pronto para estruturar. Próximo passo: modelo de domínio + schema.

---

## 1. Visão do projeto

Um assistente financeiro pessoal, **gratuito e open-source**, **altamente personalizável**, para uso próprio. Vai além de registrar gastos: entende a situação financeira, diagnostica e (mais à frente) aconselha e ajuda a planejar metas.

Objetivos do usuário, em ordem:
1. **Entender os gastos** — visão clara de para onde vai o dinheiro.
2. **Receber conselho financeiro** — diagnóstico e orientação.
3. **Definir e acompanhar metas** — reserva de emergência, compras, etc.

---

## 2. Decisões fechadas

| Tema | Decisão |
|---|---|
| Tipo de assistente | **Híbrido** — núcleo determinístico faz a conta; LLM só conversa/interpreta |
| Personalização | **Total**, incluindo entrada por **linguagem natural** |
| Dados | **Local-first** (SQLite, na máquina do usuário) |
| Linguagem do back | **Go** com **go-kit** (monólito modular usando os padrões dele) |
| Front-end | **React + Tailwind** (HTML/JS), SPA consumindo API JSON |
| Arquitetura geral | Backend Go expõe **API HTTP JSON**; React consome |

---

## 3. Princípios de arquitetura (regras de ouro)

- **O LLM nunca calcula.** Ele só faz parsing (texto → intenção estruturada) e reescreve em português os números que o motor já calculou. Toda aritmética, juros e projeção ficam no núcleo determinístico.
- **Dinheiro nunca é float.** Usar `int64` em centavos (ou `shopspring/decimal` onde houver juros). Vale para o domínio Go **e** para o JSON da API. Formatar para "R$" só na renderização.
- **Personalização como dado, não como código.** Taxonomia (categorias, fontes de renda, tipos de dívida/meta) e regras de insight vivem no banco, não como `enum` hardcoded.
- **Evitar EAV genérico.** Núcleo tipado forte para as entidades principais; campos customizados com parcimônia, em tabela de atributos tipada.
- **Contrato de API disciplinado.** Datas em ISO-8601, formato de erro padronizado, idealmente um **OpenAPI** gerando os tipos TypeScript do front (back e front nunca divergem).
- **Single-user no MVP.** Sem auth complexa; no máximo um token/senha local. Não introduzir multiusuário agora.
- **Deixar previsto** um endpoint de **streaming (SSE)** para o chat da Fase 4, sem retrabalhar o transporte depois.

---

## 4. Modelo de domínio (entidades a modelar)

- **Renda** — recorrente (salário, com **bruto e líquido** separados) e avulsa (renda extra).
- **Gasto** — fixo recorrente vs. variável, com categoria.
- **Dívida**
  - Cartão: fatura, limite, vencimento, mínimo.
  - Empréstimo: principal, juros, parcelas restantes, custo mensal.
- **Parcelamento** — uma compra que vira N parcelas de X (no cartão ou outro crédito). **Entidade própria**, porque afeta o fluxo dos próximos meses.
- **Meta** — reserva de emergência (alvo = N meses de despesa) e compra (valor + prazo), com progresso e plano de aporte.
- **Movimento/Lançamento** — o "extrato" que liga tudo.

**Decisão de modelagem em aberto:** registro simples de movimentos (leve, suficiente para a Fase 1) vs. partidas dobradas (mais correto, mais complexo). Recomendação: **movimento simples** para uso pessoal.

---

## 5. Faseamento

- **MVP** — entrada de dados + visão clara do mês: `renda − fixos − variáveis − dívidas = sobra/déficit`.
- **Fase 2 — Diagnóstico** — percentuais, peso das dívidas, data projetada para quitar parcelas.
- **Fase 3 — Metas + planejamento** — ex.: "cortando X, você atinge a reserva em Y meses".
- **Fase 4 — Conselho/assistente** — motor de regras configurável + camada de linguagem natural (LLM).

> A entrada por **linguagem natural** fica para a **Fase 4**. O núcleo + entrada estruturada já é um produto completo; o LLM entra por cima sem retrabalho.

---

## 6. Stack técnico

### Backend (Go)
- **go-kit** — monólito modular; middleware (log, métricas, validação) por serviço.
- **SQLite** via `modernc.org/sqlite` (pure Go, sem cgo).
- **sqlc** — queries type-safe.
- Transporte HTTP JSON (go-kit HTTP transport).
- `shopspring/decimal` onde houver cálculo de juros.

**Estrutura de pastas proposta:**
```
domain/      # entidades e value objects (dinheiro em centavos)
finance/     # serviços determinísticos: fluxo de caixa, projeção de dívida/parcelas, metas
rules/       # motor de insights configurável
taxonomy/    # categorias e tipos definidos pelo usuário
nlu/         # interface de extração; impl. Ollama plugável e mockável (Fase 4)
store/       # SQLite + sqlc
transport/   # endpoints go-kit (HTTP)
```

### Frontend (React)
- **Vite** — build.
- **TanStack Query (React Query)** — estado de servidor (cache, refetch, loading).
- **React Router** — navegação (Painel, Lançamentos, Dívidas, Metas).
- **Recharts** — gráficos de gastos.
- **Tailwind** — estilo.

### Integração / build
- **Dev:** dois processos (API Go + Vite). Usar o **proxy do Vite** (`/api` → Go) para evitar CORS.
- **Produção:** `vite build` → `dist/` embutido no binário Go via `embed.FS` → **um binário só** (fiel ao local-first, sem Node para usar).

### LLM (Fase 4)
- **Ollama** local com modelos de saída estruturada/tool-calling (ex.: Llama 3.1/3.2, Qwen2.5).
- Pipeline: `texto livre → LLM extrai intenção estruturada (JSON) → núcleo valida e aplica`.
- Loop de confirmação para baixa confiança ("entendi R$ 120 em mercado, certo?").
- **Realidade de hardware:** LLM local pede RAM/VRAM; ~7–8B roda em máquina boa, abaixo disso a extração fica fraca.

---

## 7. Próximos passos sugeridos

1. **Fechar o modelo de domínio + schema SQLite** do MVP (fundação de tudo). ← recomendado começar aqui
2. Definir a estrutura de pastas completa (back + front).
3. Esboçar o contrato da API (endpoints do MVP) + OpenAPI.
4. Implementar o núcleo determinístico de fluxo de caixa.
5. Montar as primeiras telas React (Painel + Lançamentos).

---

## 8. Itens em aberto para decidir

- [ ] Movimento simples vs. partidas dobradas (recomendado: simples).
- [ ] Detalhamento do schema (categorias, parcelamento, regras configuráveis).
- [ ] Endpoints exatos do MVP e formato de erro padrão.
- [ ] Modelo de LLM local específico (Fase 4).
