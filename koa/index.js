const imagist = require('../')

module.exports = (opts = {}) => {
  const img = imagist(opts)

  async function middleware (ctx) {
    const query = ctx.query
    const param = ctx.params['0']

    const [stream, type] = await img.get(param, query)

    ctx.set('Content-Type', type)
    ctx.body = stream
  }

  return () => middleware
}
