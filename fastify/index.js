const imagist = require('../')

module.exports = (opts = {}) => {
  const img = imagist(opts)

  async function middleware (req, res) {
    const query = req.query
    const param = req.params['*']

    const [stream, type] = await img.get(param, query)

    res.header('Content-Type', type)
    res.send(stream)
  }

  return () => middleware
}
