# Plano de monetização — Bookmark Studio

> Documento de referência para quando for dar start. Cada fase tem um checklist; marque `[x]` conforme for concluindo.
> Valores de custo e preço são estimativas (out/2026) — recalcule com uso real antes de fixar preços.

---

## 1. Resumo das decisões

- **Modelo:** freemium. O gerenciador e a ordem alfabética são grátis para sempre; a IA "sem chave" é paga.
- **Como cobrar:** primeiro **créditos avulsos** (organizar é algo esporádico). A **assinatura Pro** só entra quando existirem recursos recorrentes.
- **Arquitetura:** a extensão nunca fala direto com o provedor de IA no modo pago. Ela chama **um servidor seu**, que guarda a chave, controla o uso e escolhe o provedor.
- **Independência de IA:** o servidor fala com qualquer IA por meio de uma interface única. Trocar de provedor é uma mudança de configuração, sem precisar publicar uma nova versão da extensão (ver seção 6).
- **Validação antes de gastar:** lançar grátis com lista de espera do Pro e só construir o servidor se houver interesse.

---

## 2. Público e proposta

| Público | Dor | Mensagem |
|---|---|---|
| Devs (como eu) | Centenas de links técnicos salvos do daily.dev, GitHub etc., tudo misturado | "Organize 1.500 favoritos em pastas por tema em 2 minutos." |
| Qualquer pessoa | Favoritos acumulados há anos, nunca encontra nada | "Sua barra de favoritos arrumada sozinha. Você confere antes de aplicar." |

**Decisão em aberto:** começar focado em devs (mais fácil de alcançar e de explicar) ou no público geral (mercado maior)? Recomendação: começar com devs e ampliar depois.

---

## 3. Planos e preços

| Recurso | Grátis | Créditos | Pro |
|---|---|---|---|
| Gerenciador, busca, arrastar e soltar, tema escuro | ✅ | ✅ | ✅ |
| Ordem alfabética (pasta ou tudo) | ✅ | ✅ | ✅ |
| IA com a **própria** chave (BYOK, para devs) | ✅ | ✅ | ✅ |
| IA **sem chave** | 1 teste (até ~200 links) | conforme créditos | ilimitado (com limite justo) |
| Classificar sozinho cada favorito novo | — | — | ✅ |
| Verificar links quebrados (semanal) | — | — | ✅ |
| Backup e restauração na nuvem | — | — | ✅ |
| Busca inteligente ("aquele site de ícones…") | — | — | ✅ |

**Preços sugeridos (ponto de partida):**
- Créditos: R$ 19,90 = 5 organizações completas (até 2.000 links cada).
- Pro: R$ 9,90/mês ou R$ 79/ano.
- Fora do Brasil: US$ 4,99 por pacote, US$ 3/mês ou US$ 24/ano.

---

## 4. Custos estimados

Uma organização completa custa aproximadamente:

| Tamanho da pasta | Modelo topo de linha (ex.: Claude Opus 5.5) | Modelo intermediário (ex.: Claude Sonnet 5.5) |
|---|---|---|
| ~200 links | US$ 0,15–0,25 | US$ 0,06–0,10 |
| ~1.500 links | US$ 1,00–1,50 | US$ 0,40–0,60 |

Outros custos:
- Servidor (Cloudflare Workers ou Supabase): grátis até um volume razoável, depois de US$ 5 a 25 por mês.
- Taxa do meio de pagamento: Stripe ~4% + fixo; Lemon Squeezy ~5% + fixo.
- Chrome Web Store: taxa única de US$ 5. AMO (Firefox): grátis.

**Regra de margem:** o preço de um crédito deve cobrir pelo menos 3× o custo da IA de uma organização grande.

---

## 5. Arquitetura

```
┌──────────────────┐   HTTPS + token   ┌──────────────────────────┐        ┌────────────────┐
│ Extensão         │ ────────────────▶ │ Servidor (API própria)   │ ─────▶ │ Provedor de IA │
│ (Chrome/Firefox) │ ◀──────────────── │ - login / sessão         │ ◀───── │ (qualquer um)  │
│                  │    plano JSON     │ - saldo de créditos      │        └────────────────┘
│ modo BYOK ───────┼──────────────────────────────────────────────────▶ (direto, chave do usuário)
└──────────────────┘                   │ - limite por usuário     │
                                       │ - escolhe o provedor     │ ◀──── webhook ── Pagamento
                                       │ - registra uso e custo   │                (Stripe/Lemon/ExtensionPay)
                                       └──────────────────────────┘
```

**O que fica onde:**
- **Na extensão:** coletar os links, remover duplicados, mostrar a prévia e aplicar o plano. Tudo isso já existe em `src/lib/organize.ts` e continua local.
- **No servidor:** as regras (prompt), o esquema da resposta e a chamada à IA. Hoje estão em `src/lib/aiOrganizer.ts` e mudam para o servidor no modo pago. O modo BYOK continua usando a versão local.

**Stack sugerida:** Supabase (login + Postgres + Edge Functions) ou Cloudflare Workers + D1. As duas têm plano grátis e suportam TypeScript, o que permite reaproveitar o código e o esquema zod.

---

## 6. Independência de IA (o "seguro" se eu perder o acesso a um provedor)

### Princípios
1. **Nada específico de um provedor fora de um único arquivo** (um "adaptador" por provedor).
2. **Prompt e esquema neutros:** as regras são texto puro e a resposta é JSON validado com zod **do nosso lado**, mesmo que o provedor já garanta o formato.
3. **Provedor escolhido por configuração** (variável de ambiente no servidor), nunca fixo no código da extensão.
4. **Ordem de fallback:** se o provedor principal falhar (erro, limite ou recusa), tenta o próximo da lista.
5. **Um conjunto de teste próprio** para comparar a qualidade antes de trocar.

### Interface única

```ts
// server/ai/provider.ts
export interface AIProvider {
  name: string
  /** Envia instruções + pedido e devolve JSON já validado pelo schema. */
  generateJSON<T>(input: { system: string; prompt: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T>
}
```

O organizador só conhece `AIProvider`:

```ts
const providers = buildProvidersFromEnv()            // ex.: AI_PROVIDERS="anthropic,openai,gemini"
const plan = await planWithAI(providers, links)      // tenta cada um na ordem até dar certo
```

### Adaptadores possíveis

| Adaptador | Cobre | Observação |
|---|---|---|
| `anthropic` | Claude | O atual: SDK oficial com structured outputs. |
| `openai-compatible` | OpenAI, Groq, DeepSeek, Mistral, Together, **OpenRouter**, **Ollama/LM Studio (local)** | Muitos provedores aceitam o formato da API da OpenAI. Um adaptador cobre vários, mudando só a URL base e a chave. |
| `gemini` | Google Gemini | SDK próprio (há também um endpoint compatível com OpenAI). |

**Atalho:** com o **OpenRouter** (um agregador), uma única chave dá acesso a modelos de vários provedores. Bom como plano B rápido; o preço é parecido com o direto, mais uma pequena taxa.

**Plano C (custo zero de API):** um modelo local via **Ollama** para o modo BYOK. O usuário roda o modelo na própria máquina e a extensão chama `http://localhost:11434`. A qualidade é menor, mas funciona offline e de graça.

### Como trocar de IA na prática
1. Criar a chave no novo provedor.
2. Configurar no servidor: `AI_PROVIDERS="openai,anthropic"` e a chave correspondente.
3. Rodar o conjunto de teste (abaixo) e comparar com o provedor anterior.
4. Fazer o deploy do servidor. **A extensão não precisa de atualização.**

### Conjunto de teste (para qualquer troca)
- Guardar em `server/evals/` uns 200 links reais com a pasta esperada (dá para tirar da organização que já foi feita).
- Um script roda o organizador com cada provedor e mede:
  - % de links na pasta esperada;
  - quantos ficaram soltos;
  - custo;
  - tempo.
- Trocar de provedor só se ele ficar perto do atual no % de acerto.

---

## 7. Roadmap por fases

### Fase 0 — Preparar o código (1–2 dias)
- [x] Extrair `RULES` e os schemas de `src/lib/aiOrganizer.ts` para um módulo neutro (`src/lib/organizerPrompt.ts`).
- [x] Criar a interface `AIProvider` e transformar a chamada atual no adaptador `anthropic`.
- [x] Adicionar o adaptador `openai-compatible` no modo BYOK, com seletor de provedor no modal e campo de URL base para Ollama/OpenRouter.
- [x] Montar o conjunto de teste com ~200 links (`evals/dataset.json` + `npm run eval`).
- [ ] Rodar o conjunto de teste com 2 provedores reais e anotar os resultados.

### Fase 1 — Lançar grátis e validar (1–2 semanas)
> A IA fica fora da versão publicada graças à flag `VITE_ENABLE_AI` (desligada por padrão). Para liberar depois: `npm run build:ai`, atualizar a política de privacidade e a declaração de dados na loja, e publicar uma versão nova.
- [ ] Política de privacidade (deixar claro que, no modo IA, títulos e URLs são enviados ao provedor escolhido).
- [ ] Página simples do projeto (GitHub Pages) com a política e a lista de espera.
- [ ] Botão "Quero a IA sem chave → lista de espera" no modal de organizar (formulário: Tally, Google Forms ou Supabase).
- [ ] Publicar na Chrome Web Store e na AMO (Firefox), com screenshots de "antes e depois".
- [ ] Divulgar: daily.dev, TabNews, Reddit (r/chrome, r/firefox, r/productivity), Product Hunt.
- [ ] **Meta para seguir:** ~500 instalações e ~50 pessoas na lista de espera.

### Fase 2 — Servidor + créditos (2–4 semanas)
- [ ] Servidor com login (Google ou link mágico por e-mail).
- [ ] Endpoint `POST /organize`: recebe os links, debita o crédito e devolve o plano.
- [ ] Tabelas: `users`, `credits_ledger` (cada compra e cada uso) e `usage_log` (tokens, custo, provedor).
- [ ] Pagamento: ExtensionPay (mais rápido) **ou** Stripe Checkout (Pix + cartão) com webhook que adiciona créditos.
- [ ] Limites: tamanho máximo por organização, X pedidos por hora por usuário e teto de gasto diário total (alerta + bloqueio).
- [ ] 1 organização de teste grátis por conta (até ~200 links).
- [ ] Na extensão, um modo "Conta" (login + saldo) ao lado do modo BYOK.

### Fase 3 — Pro com recursos recorrentes
- [ ] Classificar sozinho os favoritos novos (`bookmarks.onCreated` → sugere a pasta → o usuário aceita com 1 clique).
- [ ] Verificador de links quebrados (`HEAD` periódico pelo servidor ou alarme na extensão).
- [ ] Backup na nuvem com histórico de versões e restauração.
- [ ] Assinatura (Stripe Billing ou Lemon Squeezy) com portal do cliente para cancelar sozinho.

### Fase 4 — Crescer
- [ ] Idiomas: EN e ES na interface e na loja.
- [ ] Taxonomias prontas: "Dev", "Design", "Estudos", "Geral".
- [ ] Programa de indicação (indicou → ganha créditos).
- [ ] Planos para times (pastas compartilhadas).

---

## 8. Lojas, legal e privacidade

- [ ] **LGPD/GDPR:** favoritos são dados pessoais. Não guardar a lista de links no servidor depois de processar (só métricas de uso).
- [ ] **Divulgação na loja:** declarar no Chrome ("Privacy practices") e na AMO que dados são enviados a um serviço de IA, só quando o usuário clica em organizar.
- [ ] **Firefox (AMO):** revisar a política da Mozilla para extensões com recursos pagos antes de publicar a Fase 2.
- [ ] **Termos de uso:** reembolso de créditos, limite justo do Pro e "a IA pode errar; sempre há prévia e backup".
- [ ] **Permissões mínimas:** manter `bookmarks` (e `favicon` no Chrome). Pedir outras só quando o recurso existir.
- [ ] **Nota fiscal / MEI:** verificar com um contador quando começar a faturar.

---

## 9. Métricas para acompanhar

- Instalações por semana e % de usuários ativos depois de 7 dias.
- % de usuários que abrem "Organizar" e % que usam o teste grátis da IA.
- Conversão de teste → compra (alvo inicial: 3–5%).
- Custo médio de IA por organização vs. preço do crédito (margem).
- Reembolsos e motivos ("organizou errado" indica que o prompt ou o provedor precisam ajuste).

---

## 10. Riscos e como reduzir

| Risco | Mitigação |
|---|---|
| Provedor de IA sobe preço ou corta acesso | Interface `AIProvider` + fallback + conjunto de teste (seção 6). |
| Alguém abusa da IA grátis | Teste grátis limitado a ~200 links, 1 por conta, login obrigatório e teto de gasto diário. |
| IA organiza errado e o usuário perde a confiança | Prévia obrigatória, backup automático e nenhum link apagado (só duplicados). |
| Loja rejeita a extensão | Política de privacidade clara, permissões mínimas e divulgação do uso de IA. |
| Pouca gente paga | Validar na Fase 1 antes de construir o servidor; testar preço com créditos. |

---

## 11. Decisões em aberto

- [ ] Público inicial: devs ou geral?
- [ ] Meio de pagamento: ExtensionPay, Stripe ou Lemon Squeezy?
- [ ] Servidor: Supabase ou Cloudflare?
- [ ] Modelo padrão no servidor: topo de linha (melhor resultado) ou intermediário (mais margem)? Decidir com o conjunto de teste.
- [ ] Nome/marca definitivos e domínio.
