const imagist = require('../')

module.exports = (opts = {}) => {
  const img = imagist(opts)

  function middleware (req, res, next) {
    const query = req.query
    const param = req.params['0']

    img.get(param, query)
      .then(([stream, type]) => {
        res.set('Content-Type', type)
        stream.pipe(res)
      })
      .catch(next)
  }

  return () => middleware
}
