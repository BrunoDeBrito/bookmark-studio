# Versão pessoal com IA (só para você)

O projeto gera **duas versões** a partir do mesmo código:

| Versão | Comando | Tem IA? | Para quem |
|---|---|---|---|
| **Pública** | `npm run build` / `npm run build:firefox` | ❌ Não (o código de IA nem entra no pacote) | Loja (Chrome Web Store / Firefox) |
| **Pessoal** | `npm run build:ai` / `npm run build:firefox:ai` | ✅ Sim | Só o seu navegador |

A versão pessoal **nunca vai para a loja**. Você gera e instala manualmente, e ninguém mais tem acesso a ela.

---

## Passo a passo rápido

### Chrome / Chromium / Brave / Edge

```bash
npm install
npm run build:ai
```

1. Abra `chrome://extensions`.
2. Ligue o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e escolha a pasta `dist/`.

A extensão **continua instalada** depois de fechar o navegador. Para atualizar: rode `npm run build:ai` de novo e clique em ↻ (recarregar) no card da extensão.

### Firefox / Zen — teste rápido (some ao fechar o navegador)

```bash
npm run build:firefox:ai
```

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária…**.
3. Escolha `dist-firefox/manifest.json`.

### Firefox / Zen — instalação permanente (recomendado)

O Firefox só mantém instaladas extensões assinadas pela Mozilla. No modo **não listada**, a assinatura é grátis e a extensão **não aparece na loja**: só você tem o arquivo.

1. Crie uma conta em addons.mozilla.org e gere as chaves de API (Developer Hub → Manage API Keys).
2. Gere a versão pessoal e assine:

   ```bash
   npm run build:firefox:ai
   npx web-ext sign -s dist-firefox --channel unlisted --api-key <sua-key> --api-secret <seu-secret>
   ```

3. O comando gera um arquivo `.xpi` em `web-ext-artifacts/`. Arraste esse arquivo para o Firefox ou o Zen para instalar.

A cada atualização, aumente o `version` em `manifest.json` antes de assinar (a Mozilla não aceita a mesma versão duas vezes). Mais detalhes, incluindo o Zen no CachyOS e no Fedora Kinoite, estão em [firefox-zen.md](firefox-zen.md).

> **Nunca** coloque as chaves de API da Mozilla no repositório.

---

## Usando a IA

1. Abra o gerenciador completo e entre na pasta que quer organizar.
2. Clique no botão ✨ **Organizar esta pasta**.
3. Escolha **Organização completa (IA)** e preencha:

   | Provedor | URL base | Modelo | Chave |
   |---|---|---|---|
   | Anthropic (Claude) | — | já vem preenchido | obrigatória (`sk-ant-...`) |
   | OpenAI | já vem preenchida | o id do modelo | obrigatória |
   | OpenRouter | já vem preenchida | `provedor/modelo` | obrigatória |
   | Ollama (local, grátis) | já vem preenchida | nome do modelo baixado | não precisa |
   | Outro compatível com OpenAI | a URL do serviço (termina em `/v1`) | o id do modelo | depende do serviço |

4. Clique em **Analisar com IA**, confira a prévia e clique em **Aplicar**. Um backup da pasta é baixado antes, por padrão.

**Ollama:** para a extensão conseguir acessar o Ollama, ele precisa ser iniciado assim:

```bash
OLLAMA_ORIGINS="chrome-extension://*,moz-extension://*" ollama serve
```

**Sua chave:** se você marcar "Lembrar a chave", ela fica salva **só neste navegador**, no armazenamento da extensão. Ela não vai para o código nem para o git.

---

## Deixar a IA sempre ligada no seu computador (opcional)

Em vez de lembrar de usar os comandos `:ai`, crie um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
# edite o .env e troque para:
# VITE_ENABLE_AI=true
```

A partir daí, `npm run build`, `npm run build:firefox` e `npm run dev` já saem **com IA**. O `.env` está no `.gitignore` e não vai para o GitHub.

> ⚠️ **Com o `.env` ligado, o `npm run build` também passa a gerar a versão com IA.** Antes de gerar o pacote para a loja, desligue (`VITE_ENABLE_AI=false`) ou apague o `.env`, e faça a conferência abaixo.

---

## Conferência antes de publicar na loja

Rode isto depois do build que vai para a loja. **O resultado precisa ser vazio**:

```bash
grep -l "dangerouslyAllowBrowser\|chat/completions\|Organização completa" dist/assets/*.js dist-firefox/assets/*.js
```

Se aparecer algum arquivo, a IA está dentro do pacote. Nesse caso, gere de novo com `npm run build` / `npm run build:firefox`, sem o `.env` ligado.

---

## Ter as duas versões instaladas ao mesmo tempo

Se você instalar **só a versão pessoal**, não precisa fazer nada: ela já tem tudo o que a pública tem, mais a IA.

Se quiser **a da loja e a pessoal lado a lado** no mesmo navegador:

- **Chrome:** funciona direto. A versão carregada da pasta ganha um ID próprio, diferente da que vem da loja.
- **Firefox/Zen:** as duas teriam o mesmo ID (`bookmark-studio@debrito`, em `vite.config.ts`) e o Firefox trataria uma como atualização da outra. A versão pessoal precisaria de um ID e um nome próprios, por exemplo `bookmark-studio-dev@debrito` e "Bookmark Studio (Dev)".

**Situação atual:** essa troca automática de ID e nome ainda **não está implementada**. É uma mudança pequena no `vite.config.ts`: quando `VITE_ENABLE_AI=true`, usar o ID e o nome de dev. É só pedir quando precisar.

---

## Resumo

| Quero… | Comando |
|---|---|
| Publicar na loja (sem IA) | `npm run build` / `npm run build:firefox` + conferência |
| Usar com IA no Chrome | `npm run build:ai` → carregar `dist/` |
| Testar com IA no Firefox/Zen | `npm run build:firefox:ai` → carregar temporária |
| Instalar com IA de vez no Firefox/Zen | `npm run build:firefox:ai` + `web-ext sign --channel unlisted` |
| Desenvolver com IA | `VITE_ENABLE_AI=true npm run dev` |
| Comparar IAs | `npm run eval` (veja o README) |
