const validator = require('validator')
const mhttp = require('machinepack-http')
const mmm = require('stream-mmmagic')
const sharp = require('sharp')
const color = require('color')

function imagist (opts = {}) {
  const _defaults = {
    ssl: false,
    host: null,
    whitelist: []
  }

  const _options = Object.assign({}, _defaults, opts)

  const _supportedOutputFormats = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  }

  const _allowedMimeTypes = {
    ..._supportedOutputFormats,
    gif: 'image/gif',
    svg: 'image/svg+xml'
  }

  const _allowedFits = [
    'cover',
    'contain',
    'fill',
    'inside',
    'outside'
  ]

  const _allowedPositions = [
    'top',
    'bottom',
    'left',
    'right',
    'center',
    'entropy',
    'attention'
  ]

  const _allowedInterpolations = [
    'nearest',
    'cubic',
    'mitchell',
    'lanczos2',
    'lanczos3'
  ]

  const _allowedFlips = [
    'h',
    'v',
    'both'
  ]

  function _toInteger (val, unsigned = false) {
    if (typeof val === 'string') {
      val = validator.toInt(val, 10)
    }

    if (isNaN(val)) {
      return 0
    }

    if (unsigned) {
      val = Math.abs(val)
    }

    return val
  }

  function _colorType (val) {
    if (val.indexOf(',') > -1) {
      return 'rgb'
    }

    if (val.length === 3 || val.length === 6) {
      return 'hex'
    }

    return null
  }

  function _isValidColor (val) {
    const type = _colorType(val)

    if (type === 'rgb') {
      val = `rgb(${val})`
    } else if (type === 'hex') {
      val = '#' + val
    }

    try {
      color(val)
    } catch (err) {
      return false
    }

    return true
  }

  function _normalizeColor (val) {
    const type = _colorType(val)

    if (type === 'rgb') {
      val = val.split(',').map(v => parseFloat(v, 10))
    } else if (type === 'hex') {
      val = '#' + val
    }

    return color(val).object()
  }

  function _findKey (obj, func) {
    for (const key in obj) {
      if (func(obj[key])) {
        return key
      }
    }

    return undefined
  }

  function _queryOptions (query) {
    const options = {
      resize: {
        width: null,
        height: null,
        options: {
          fit: 'cover',
          position: 'center',
          kernel: 'lanczos3',
          withoutEnlargement: true,
          background: '#000'
        }
      },
      withMetadata: false,
      quality: 80,
      trim: false,
      rotate: 0,
      flip: false,
      flop: false,
      sharpen: false,
      blur: false,
      negate: false,
      tint: false,
      greyscale: false,
      format: null
    }

    if (query.w) {
      options.resize.width = _toInteger(query.w, true)
    }

    if (query.h) {
      options.resize.height = _toInteger(query.h, true)
    }

    if (query.fit && _allowedFits.includes(query.fit)) {
      options.resize.options.fit = query.fit
    }

    if (query.pos && _allowedPositions.includes(query.pos)) {
      options.resize.options.position = query.pos
    }

    if (query.flip && _allowedFlips.includes(query.flip)) {
      if (query.flip === 'h') {
        options.flop = true
      } else if (query.flip === 'v') {
        options.flip = true
      } else if (query.flip === 'both') {
        options.flip = true
        options.flop = true
      }
    }

    if (query.q && validator.isInt(query.q, { min: 1, max: 100 })) {
      options.quality = _toInteger(query.q, true)
    }

    if (query.i && _allowedInterpolations.includes(query.i)) {
      options.resize.options.kernel = query.i
    }

    if (query.bg && _isValidColor(query.bg)) {
      options.resize.options.background = _normalizeColor(query.bg)
    }

    if (query.fmt && Object.keys(_supportedOutputFormats).includes(query.fmt)) {
      options.format = query.fmt
    }

    if (query.r && validator.isFloat(query.r)) {
      options.rotate = validator.toFloat(query.r)
    }

    if (query.tint && _isValidColor(query.tint)) {
      options.tint = _normalizeColor(query.tint)
    }

    if (query.blur && validator.isFloat(query.blur, { min: 0.3, max: 1000 })) {
      options.blur = validator.toFloat(query.blur, 10)
    }

    if (typeof query.trim !== 'undefined' && validator.toBoolean(query.trim)) {
      options.trim = 10
    }

    if (typeof query.max !== 'undefined' && validator.toBoolean(query.max)) {
      options.resize.options.withoutEnlargement = false
    }

    if (typeof query.sharp !== 'undefined' && validator.toBoolean(query.sharp)) {
      options.sharp = true
    }

    if (typeof query.neg !== 'undefined' && validator.toBoolean(query.neg)) {
      options.negate = true
    }

    if (typeof query.gs !== 'undefined' && validator.toBoolean(query.gs)) {
      options.greyscale = true
    }

    if (typeof query.meta !== 'undefined' && validator.toBoolean(query.meta)) {
      options.withMetadata = true
    }

    return options
  }

  async function _processImage (reader, mimeType, query = {}) {
    let responseMimeType = mimeType
    const options = _queryOptions(query)
    const processing = sharp()
    const formatOptions = {}
    const methods = [
      'trim',
      'rotate',
      'flip',
      'flop',
      'sharpen',
      'blur',
      'negate',
      'tint',
      'greyscale',
      'withMetadata'
    ]

    methods.forEach(method => {
      if (options[method]) {
        processing[method](options[method])
      }
    })

    if (options.resize.width || options.resize.height) {
      processing.resize(options.resize.width, options.resize.height, options.resize.options)
    }

    if (options.quality) {
      formatOptions.quality = options.quality
    }

    if (!options.format) {
      options.format = _findKey(_supportedOutputFormats, type => type === mimeType) || 'jpeg'
    }

    responseMimeType = _supportedOutputFormats[options.format]
    processing.toFormat(options.format, formatOptions)

    return [reader.pipe(processing), responseMimeType]
  }

  function _parseUrl (param) {
    let protocol = 'http'
    let url = param

    if (_options.ssl) {
      protocol = 'https'
    }

    if (_options.host && param.indexOf(_options.host) === -1) {
      url = _options.host + '/' + param
    }

    if (param.indexOf('http://') === -1 && param.indexOf('https://') === -1) {
      url = protocol + '://' + url
    }

    return new URL(url)
  }

  async function _streamMimeType (reader) {
    return new Promise((resolve, reject) => {
      mmm(reader, (err, mime, output) => {
        if (err) {
          return reject(err)
        }

        if (!Object.values(_allowedMimeTypes).includes(mime.type)) {
          return reject(new Error('MIME type not allowed.'))
        }

        return resolve([output, mime.type])
      })
    })
  }

  function _isHostAllowed (host) {
    if (!_options.whitelist.length) {
      return true
    }

    if (_options.whitelist.includes(host)) {
      return true
    }

    return false
  }

  async function main (param, query) {
    if (!param) {
      throw new TypeError('Source path is missing.')
    }

    if (!Array.isArray(_options.whitelist)) {
      _options.whitelist = _options.whitelist ? [_options.whitelist] : []
    }

    if (_options.host) {
      _options.whitelist.push(_options.host)
    }

    let url = _parseUrl(param)

    if (!_isHostAllowed(url.hostname)) {
      throw new TypeError('Host not allowed.')
    }

    const stream = await mhttp.getStream({ url: url.href })
    const [reader, mimeType] = await _streamMimeType(stream)
    return _processImage(reader, mimeType, query)
  }

  function expressMiddleware () {
    return (req, res, next) => {
      const query = req.query
      const param = req.params['0']

      main(param, query)
        .then(([stream, type]) => {
          res.set('Content-Type', type)
          stream.pipe(res)
        })
        .catch(next)
    }
  }

  function koaMiddleware () {
    return async (ctx) => {
      const query = ctx.query
      const param = ctx.params['0']

      const [stream, type] = await main(param, query)

      ctx.set('Content-Type', type)
      ctx.body = stream
    }
  }

  function fastifyMiddleware () {
    return async (req, res) => {
      const query = req.query
      const param = req.params['*']

      const [stream, type] = await main(param, query)

      res.header('Content-Type', type)
      res.send(stream)
    }
  }

  return {
    get: main,
    express: expressMiddleware,
    koa: koaMiddleware,
    fastify: fastifyMiddleware
  }
}

module.exports = imagist
