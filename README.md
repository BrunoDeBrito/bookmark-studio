# Bookmark Studio

Gerenciador de bookmarks do Chrome com UI moderna: pastas em árvore, busca instantânea, drag-and-drop para reorganizar e mover itens entre pastas, modo claro/escuro, e criação/edição/exclusão de bookmarks e pastas.

Stack: React 19 + TypeScript + Vite + Tailwind CSS v4 + dnd-kit + zustand. Manifest V3.

## Arquitetura: popup + página completa

Clicar no ícone da extensão abre um **popup** compacto (`popup.html`) com busca rápida e os bookmarks mais recentes. O botão no rodapé do popup ("Abrir gerenciador completo") abre a página cheia (`index.html`) em uma aba separada, com toda a árvore de pastas, drag-and-drop e edição.

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

Isso gera a pasta `dist/` já com `manifest.json`, `index.html`, `popup.html` e os ícones.

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação** e selecione a pasta `dist/`
4. Clique no ícone da extensão na barra de ferramentas — abre o popup; use o botão do rodapé para o gerenciador completo

Nesse modo o app usa a API real `chrome.bookmarks`, então tudo que você editar afeta seus bookmarks de verdade.

## Publicar na Chrome Web Store

1. `npm run build`
2. Compacte o **conteúdo** da pasta `dist/` (não a pasta em si) em um `.zip`
3. Crie uma conta de desenvolvedor em https://chrome.google.com/webstore/devconsole (taxa única de registro)
4. Envie o `.zip`, preencha descrição, categoria, screenshots e política de privacidade
5. Antes de publicar, revise as permissões do `manifest.json` — hoje são só `bookmarks` e `favicon`, o mínimo necessário

## Estrutura

- `public/manifest.json` — manifesto MV3
- `index.html` + `src/App.tsx` — gerenciador completo (árvore de pastas, drag-and-drop, CRUD)
- `popup.html` + `src/popup/PopupApp.tsx` — popup compacto (busca + recentes + botão de expandir)
- `src/lib/openManager.ts` — abre/foca a aba do gerenciador completo, usado pelo popup
- `src/lib/bookmarksApi.ts` — camada de acesso à `chrome.bookmarks`, com fallback mock para dev
- `src/store/useBookmarkStore.ts` — estado global (zustand)
- `src/components/` — Sidebar (árvore de pastas), Toolbar, grid/lista de bookmarks, modais
