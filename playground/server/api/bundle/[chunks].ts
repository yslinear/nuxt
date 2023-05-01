import { rollup } from 'rollup'
import { genImport, genObjectFromRawEntries, genSafeVariableName } from 'knitwork'
import { joinURL } from 'ufo'

const storage = useStorage()
const cache: Record<string, string> = {}

export default eventHandler(async (event) => {
  const chunks = getRouterParam(event, 'chunks')

  if (process.env.prerender && chunks in cache) {
    setResponseHeader(event, 'content-type', 'application/javascript')
    return cache[chunks]
  }

  const ids: string[] = JSON.parse(atob(chunks.replace(/\.js$/, '')))

  const bundle = await rollup({
    input: 'virtual-input',
    plugins: [
      {
        name: 'entry',
        resolveId: (id) => {
          if (id === 'virtual-input') { return 'virtual-input' }
        },
        load: (id) => {
          if (id !== 'virtual-input') { return }
          return [
            ...ids.map(id => genImport(`build:dist:client${id.replace(/\//g, ':')}`, importName(id))),
            `export default ${genObjectFromRawEntries(ids.map(id => [id, importName(id)]))}`
          ].join('\n')
        }
      },
      {
        name: 'chunk',
        resolveId: (id, importer) => {
          if (importer?.startsWith('build:')) {
            return {
              id: joinURL('../../_nuxt', id),
              external: true
            }
          }
          if (id !== 'virtual-input') {
            return id
          }
        },
        load: async (id) => {
          return await storage.getItem(id) as Promise<string>
        }
      }
    ]
  })
  const out = await bundle.generate({})
  setResponseHeader(event, 'content-type', 'application/javascript')

  if (process.env.prerender) {
    cache[chunks] = out.output[0].code
  }

  return out.output[0].code
})

function importName (id: string) {
  return genSafeVariableName(id)
}
