const handler = /* html */`
<script>
const imports = new Set()
let promise
window.dedupeImports = (id) => {
  imports.add(id)
  promise = promise || (new Promise(resolve => setTimeout(resolve, 50))).then(r => {
    promise = null
    const url = '/api/bundle/' + btoa(JSON.stringify([...imports].sort())) + '.js'
    return import(url)
  })
  return promise.then(p => p[id] || p.default[id]).catch(() => import(id))
}
</script>
`

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (htmlContext, { event }) => {
    const imports = new Set<string>()
    for (const [index, chunk] of htmlContext.head.entries()) {
      if (!chunk.includes('modulepreload')) { continue }
      for (const link of chunk.matchAll(/<link rel="modulepreload" as="script" crossorigin href="([^"]*)">/g)) {
        if (link[1].includes('entry')) { continue }
        imports.add(link[1])
        htmlContext.head[index] = htmlContext.head[index].replace(link[0], '')
      }
    }

    const param = btoa(JSON.stringify([...imports].sort()))
    const url = `/api/bundle/${param}.js`
    htmlContext.head.push(`<link rel="modulepreload" as="script" crossorigin href="${url}">`)

    if (process.env.prerender) {
      appendResponseHeader(event, 'x-nitro-prerender', url)
    }

    htmlContext.bodyPrepend.unshift(handler)
  })
})
