# Bookmark Studio

Gerenciador de bookmarks para Chrome e Firefox com UI moderna: pastas em árvore, busca instantânea, drag-and-drop para reorganizar e mover itens entre pastas, modo claro/escuro, e criação/edição/exclusão de bookmarks e pastas.

Stack: React 19 + TypeScript + Vite + Tailwind CSS v4 + dnd-kit + zustand. Manifest V3.

## Arquitetura: popup + página completa

Clicar no ícone da extensão abre um **popup** compacto (`popup.html`) com busca rápida e os bookmarks mais recentes. O botão no rodapé do popup ("Abrir gerenciador completo") abre a página cheia (`index.html`) em uma aba separada, com toda a árvore de pastas, drag-and-drop e edição.

## Organizar uma pasta (✨)

O botão ✨ na barra do gerenciador organiza a pasta aberta e pergunta como.

> **A IA vem desligada por padrão.** O `npm run build` normal gera o pacote **sem nenhum código de IA**, pronto para publicar: o modal mostra só a ordem alfabética. Para gerar uma versão com IA (para uso próprio ou quando decidir liberar), use `npm run build:ai` / `npm run build:firefox:ai`, ou defina `VITE_ENABLE_AI=true` num arquivo `.env` (veja `.env.example`). Passo a passo completo da versão pessoal: [docs/versao-pessoal-com-ia.md](docs/versao-pessoal-com-ia.md).


- **Só ordem alfabética** — mantém as pastas e ordena tudo: pastas primeiro, depois links, de A a Z (com opção de incluir subpastas). Não usa IA.
- **Organização completa (IA)** — o Claude (`claude-opus-5-5`) monta uma árvore de pastas por tema, classifica cada link, remove duplicados (URLs iguais a menos de `ref`, `utm_*` etc.), apaga as pastas que ficarem vazias e ordena tudo. Mostra uma prévia com as pastas e contagens antes de aplicar, e baixa um backup JSON da pasta por padrão.

A organização completa funciona com qualquer IA, escolhida no próprio modal:

- **Anthropic (Claude)** — via SDK oficial.
- **OpenAI, OpenRouter, Ollama (local) ou outro compatível com a API da OpenAI** (Groq, DeepSeek, LM Studio...) — informe a URL base, o modelo e a chave.

As chamadas saem direto do navegador com a chave do usuário. Se você marcar "Lembrar a chave", ela fica salva no `localStorage` da extensão, só neste navegador. Para usar o Ollama, inicie-o com `OLLAMA_ORIGINS="chrome-extension://*,moz-extension://*"`.

Onde fica cada parte:

- `src/lib/organizerPrompt.ts` — regras e schemas da resposta (neutros, sem nada de provedor)
- `src/lib/ai/provider.ts` — interface `AIProvider`, provedores pré-configurados e configurações salvas
- `src/lib/ai/anthropic.ts`, `src/lib/ai/openaiCompatible.ts` — adaptadores (um arquivo por formato de API)
- `src/lib/aiOrganizer.ts` — monta a árvore e classifica os links usando qualquer `AIProvider`
- `src/lib/organize.ts` — duplicados, ordenação e aplicação do plano (sem IA)

Para adicionar outra IA, crie um adaptador em `src/lib/ai/` que implemente `AIProvider` e registre-o em `PRESETS`.

### Comparar provedores

`evals/dataset.json` tem ~200 links com a pasta esperada. O script mede quantos cada provedor acerta (cada execução chama a API e gasta créditos):

```bash
EVAL_PRESET=anthropic EVAL_API_KEY=sk-ant-... npm run eval
EVAL_PRESET=openrouter EVAL_API_KEY=... EVAL_MODEL=provedor/modelo npm run eval
EVAL_PRESET=ollama EVAL_MODEL=nome-do-modelo npm run eval
```

Use `EVAL_LIMIT=50` para uma amostra menor. Os erros de cada execução ficam em `evals/results/` (fora do git).

## Rodar em desenvolvimento (sem instalar como extensão)

```bash
npm install
npm run dev
```

- Página completa: `http://localhost:5173/index.html`
- Popup: `http://localhost:5173/popup.html`

Fora do contexto de extensão, o app usa uma árvore de bookmarks fake guardada no `localStorage` do navegador (veja `src/lib/bookmarksApi.ts`), então dá pra testar toda a UI — criar, editar, arrastar, apagar — sem tocar nos seus bookmarks reais.

## Build e carregar como extensão de verdade

```bash
npm run build
```

Isso gera a pasta `dist/` (Chrome) já com `manifest.json`, `index.html`, `popup.html` e os ícones.

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação** e selecione a pasta `dist/`
4. Clique no ícone da extensão na barra de ferramentas — abre o popup; use o botão do rodapé para o gerenciador completo

Nesse modo o app usa a API real `chrome.bookmarks`, então tudo que você editar afeta seus bookmarks de verdade.

## Firefox

```bash
npm run build:firefox
```

Gera a pasta `dist-firefox/` com um `manifest.json` adaptado (sem a permissão `favicon`, que só existe no Chrome, e com `browser_specific_settings.gecko`). Requer Firefox 140+.

1. Abra `about:debugging#/runtime/this-firefox`
2. Clique em **Carregar extensão temporária…** e selecione `dist-firefox/manifest.json`

A extensão temporária some ao fechar o Firefox. Para instalar de forma permanente, é preciso assiná-la no [addons.mozilla.org](https://addons.mozilla.org/developers/) (pode ser como "não listada"). Antes de publicar, troque o `id` em `vite.config.ts` por um seu. Para validar o pacote: `npx web-ext lint -s dist-firefox`.

Guia completo (Zen Browser, CachyOS, Fedora Kinoite, assinatura do `.xpi`): [docs/firefox-zen.md](docs/firefox-zen.md).

No Firefox os ícones dos sites vêm do serviço de favicons do Google, já que ele não oferece o `_favicon/` do Chrome.

## Publicar na Chrome Web Store

1. `npm run build`
2. Compacte o **conteúdo** da pasta `dist/` (não a pasta em si) em um `.zip`
3. Crie uma conta de desenvolvedor em https://chrome.google.com/webstore/devconsole (taxa única de registro)
4. Envie o `.zip`, preencha descrição, categoria, screenshots e política de privacidade
5. Antes de publicar, revise as permissões do `manifest.json` — hoje são só `bookmarks` e `favicon`, o mínimo necessário

## Estrutura

- `manifest.json` — manifesto MV3 (Chrome); `vite.config.ts` gera a variante do Firefox no build
- `src/lib/ext.ts` — escolhe entre `browser` (Firefox) e `chrome`
- `index.html` + `src/App.tsx` — gerenciador completo (árvore de pastas, drag-and-drop, CRUD)
- `popup.html` + `src/popup/PopupApp.tsx` — popup compacto (busca + recentes + botão de expandir)
- `src/lib/openManager.ts` — abre/foca a aba do gerenciador completo, usado pelo popup
- `src/lib/bookmarksApi.ts` — camada de acesso à `chrome.bookmarks`, com fallback mock para dev
- `src/store/useBookmarkStore.ts` — estado global (zustand)
- `src/components/` — Sidebar (árvore de pastas), Toolbar, grid/lista de bookmarks, modais
