# Bookmark Studio no Firefox e Zen

O mesmo código roda no Chrome e no Firefox; só o manifest muda por navegador, e é gerado no build. O Zen Browser é baseado no Firefox e usa o mesmo build.

## O que mudou no projeto

| Arquivo | O que faz |
| --- | --- |
| `src/lib/ext.ts` | Usa `browser` no Firefox e `chrome` no Chrome. O resto do código chama a API só por aqui. |
| `manifest.json` (raiz) | Manifest base, na versão do Chrome. Antes ficava em `public/manifest.json`. |
| `vite.config.ts` | Gera o manifest de cada navegador no build. No Firefox tira a permissão `favicon` e o `_favicon/` e adiciona `browser_specific_settings.gecko` (ID e Firefox 140+). |
| `src/lib/favicon.ts` | No Firefox, os ícones dos sites vêm do serviço de favicons do Google. |
| `src/lib/openManager.ts` | Procura a aba do gerenciador filtrando as abas pelo endereço, porque o Firefox recusa endereços de extensão como filtro. |
| `package.json` | Script `build:firefox`, que gera a pasta `dist-firefox/`. |

## Build e teste no Firefox

Para testar, gere a pasta `dist-firefox/` e carregue a extensão como temporária. Ela some quando o navegador fecha.

```bash
npm install
npm run build:firefox
```

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária…**.
3. Escolha `dist-firefox/manifest.json`.

Para validar o pacote com o linter da Mozilla: `npx web-ext lint -s dist-firefox`. O esperado é 0 erros.

O build do Chrome continua sendo `npm run build`, que gera a pasta `dist/`.

## Zen Browser no CachyOS / Arch

Use o pacote nativo `zen-browser-bin`, que está no repositório oficial do CachyOS (no Arch, fica no AUR).

```bash
sudo pacman -S zen-browser-bin
```

| Opção | Atualização | Acesso aos arquivos | Veredito |
| --- | --- | --- | --- |
| Pacote nativo (`zen-browser-bin`) | Junto com o sistema (`pacman -Syu`) | Todos, igual ao Firefox | Recomendado |
| Flatpak (`app.zen_browser.zen`) | Pelo Flathub | Só `~/Downloads` | Funciona, mas com restrição |
| AppImage | Manual | Todos | Sem motivo para usar aqui |

O Flatpak só enxerga `~/Downloads`. Carregar a extensão direto da pasta do projeto tende a falhar, porque ele não consegue ler os outros arquivos. Se for usar o Flatpak, copie a pasta antes e carregue `~/Downloads/bookmark-studio/manifest.json`:

```bash
cp -r dist-firefox ~/Downloads/bookmark-studio
```

Ao trocar o Flatpak pelo nativo: o perfil do Flatpak fica em `~/.var/app/app.zen_browser.zen`. Exporte os favoritos antes ou use a sincronização da conta.

## Zen Browser no Fedora Kinoite

Use o Flatpak e libere a pasta do projeto só para leitura. O Kinoite é imutável e foi feito para instalar programas gráficos por Flatpak. O Zen não tem um pacote RPM oficial.

```bash
flatpak install flathub app.zen_browser.zen
flatpak override --user --filesystem=~/Projects:ro app.zen_browser.zen
```

Ajuste `~/Projects` se o projeto estiver em outra pasta. Depois do `override`, feche o Zen por completo e abra de novo. A partir daí, carregar a extensão pelo `about:debugging` funciona igual ao Firefox, sem copiar a pasta.

Sem terminal: **Configurações do Sistema → Aplicativos → Zen → Permissões**, ou o app Flatseal.

Alternativas que não valem a pena:

- **`rpm-ostree` + COPR:** depende de um pacote não oficial, exige reiniciar a cada atualização e vai contra a ideia do sistema.
- **AppImage:** não se atualiza sozinho e integra pior com o sistema.
- **Distrobox:** é exagero só para um navegador.

Com o `.xpi` assinado (próxima seção), nem a permissão é necessária. Ele é um arquivo só, e o Flatpak abre qualquer arquivo escolhido na janela de abrir arquivo.

## Instalação permanente: assinar a extensão

Para a extensão ficar instalada de vez, no Firefox ou no Zen, ela precisa ser assinada pela Mozilla. É grátis e, no modo "não listada" (`unlisted`), ela não aparece na loja.

1. Crie uma conta em addons.mozilla.org e gere as chaves de API (Developer Hub → Manage API Keys).
2. Troque o ID `bookmark-studio@debrito` em `vite.config.ts` por um seu (veja Pendências).
3. Gere o build e assine:

   ```bash
   npm run build:firefox
   npx web-ext sign -s dist-firefox --channel unlisted --api-key <sua-key> --api-secret <seu-secret>
   ```

4. O comando gera um `.xpi` em `web-ext-artifacts/`. Arraste esse arquivo para o Firefox ou o Zen para instalar.

A cada nova versão, aumente o `version` em `manifest.json` antes de assinar. A Mozilla não aceita a mesma versão duas vezes.

Existe a opção `xpinstall.signatures.required = false` no `about:config`, mas não é certo que o Zen respeita. A assinatura é o caminho garantido.

Não coloque as chaves de API no repositório.

## Pendências e cuidados

- [ ] Trocar o ID `bookmark-studio@debrito` em `vite.config.ts` antes da primeira assinatura. Depois de assinado, o ID não muda mais.
- [ ] Adicionar `web-ext-artifacts/` ao `.gitignore`.
- [ ] Opcional: criar o script `npm run sign:firefox` para automatizar a assinatura.

Atualizações de dependências adiadas de propósito, porque são saltos que podem quebrar o projeto:

| Pacote | Versão atual | Disponível | Motivo para esperar |
| --- | --- | --- | --- |
| `typescript` | 6.0.3 | 7.0.2 | Reescrita do compilador |
| `@types/node` | 24.19.0 | 26.6.3 | Deve acompanhar a versão do Node que você usa |
| `@types/chrome` | 0.2.9 | 0.3.0 | Em versões 0.x, a mudança de 0.2 para 0.3 pode alterar os tipos |

Avisos conhecidos do `web-ext lint` (0 erros), que não impedem a publicação:

- Dois avisos de `innerHTML`, que vêm de dentro do React.
- Um aviso sobre `data_collection_permissions` no Firefox para Android, que precisa de uma versão mais nova que a mínima. Não afeta o Firefox de computador.
