export default defineNuxtConfig({
  nitro: {
    bundledStorage: [
      'build:dist:client'
    ]
  },
  hooks: {
    'vite:extendConfig' (config, { isClient }) {
      config.experimental!.renderBuiltUrl = (filename, { hostType, type }) => {
        if (hostType !== 'js') {
          // In CSS we only use relative paths until we craft a clever runtime CSS hack
          return { relative: true }
        }
        if (type === 'public') {
          return { runtime: `globalThis.__publicAssetsURL("${encodeURI(filename)}")` }
        }
        if (type === 'asset') {
          const relativeFilename = filename.replace('_nuxt/', '')
          if (isClient && filename.endsWith('.js')) {
            // hijack loading of assets imported INTO JS files
            return { runtime: 'globalThis.dedupeImports(globalThis.__buildAssetsURL("' + encodeURI(relativeFilename) + '"))' }
          }
          return { runtime: `globalThis.__buildAssetsURL(${JSON.stringify(relativeFilename)})` }
        }
      }
    }
  },
  vite: {
    plugins: [
      {
        name: 'replace-import',
        generateBundle: {
          order: 'post',
          handler (options, bundle) {
            for (const key in bundle) {
              const chunk = bundle[key]
              if (chunk.type === 'asset') { continue }
              chunk.code = chunk.code.replace(/__vitePreload\(\(\) => import\("[^"]*"\)/g, r => r.replace('import("./', 'globalThis.dedupeImports("/_nuxt/'))
            }
          }
        }
      }
    ]
  }
})
