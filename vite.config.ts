import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// Emits manifest.json for the target browser. `manifest.json` at the root is the Chrome version;
// Firefox drops Chrome-only keys and adds the Gecko settings AMO requires.
function manifest(target: 'chrome' | 'firefox'): Plugin {
  return {
    name: 'extension-manifest',
    generateBundle() {
      const m = JSON.parse(readFileSync(resolve(import.meta.dirname, 'manifest.json'), 'utf8'))
      if (target === 'firefox') {
        m.permissions = m.permissions.filter((p: string) => p !== 'favicon')
        delete m.web_accessible_resources
        delete m.minimum_chrome_version
        m.browser_specific_settings = {
          gecko: {
            id: 'bookmark-studio@debrito',
            strict_min_version: '140.0',
            data_collection_permissions: { required: ['none'] },
          },
        }
      }
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: JSON.stringify(m, null, 2) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = mode === 'firefox' ? 'firefox' : 'chrome'
  return {
    plugins: [react(), tailwindcss(), manifest(target)],
    build: {
      outDir: target === 'firefox' ? 'dist-firefox' : 'dist',
      rollupOptions: {
        input: {
          app: resolve(import.meta.dirname, 'index.html'),
          popup: resolve(import.meta.dirname, 'popup.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
