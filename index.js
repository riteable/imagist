const path = require('path')
const fs = require('fs')
const validator = require('validator')
const mhttp = require('machinepack-http')
const mmm = require('stream-mmmagic')
const sharp = require('sharp')

function imagist (opts = {}) {
  const _defaults = {
    rootDir: process.cwd(),
    hostname: null,
    allowedHosts: []
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
    'north',
    'northeast',
    'east',
    'southeast',
    'south',
    'southwest',
    'west',
    'northwest',
    'center',
    'detail',
    'luminance'
  ]

  const _renamedPositions = {
    detail: 'entropy',
    luminance: 'attention'
  }

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

      if (Object.keys(_renamedPositions).includes(query.pos)) {
        options.resize.options.position = _renamedPositions[query.pos]

        if (typeof options.resize.options.fit !== 'undefined' && options.resize.options.fit !== 'cover') {
          delete options.resize.options.position
        }
      }
    }

    if (query.flip && _allowedFlips.includes(query.flip)) {
      if (query.flip === 'h') {
        options.flop = true
      } else if (query.flip === 'v') {
        options.flip = true
      } else {
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

    if (query.bg && validator.isHexColor(query.bg)) {
      options.resize.options.background = query.bg
    }

    if (query.fmt && Object.keys(_supportedOutputFormats).includes(query.fmt)) {
      options.format = query.fmt
    }

    if (query.r) {
      options.rotate = _toInteger(query.r)
    }

    if (query.tint && validator.isHexColor(query.tint)) {
      options.tint = query.tint
    }

    if (query.blur && validator.isFloat(query.blur, { min: 0.3, max: 1000 })) {
      options.blur = validator.toFloat(query.blur, 10)
    }

    if (typeof query.trim !== 'undefined') {
      options.trim = 10
    }

    if (typeof query.max !== 'undefined') {
      options.resize.options.withoutEnlargement = false
    }

    if (typeof query.sharp !== 'undefined') {
      options.sharp = true
    }

    if (typeof query.neg !== 'undefined') {
      options.negate = true
    }

    if (typeof query.gs !== 'undefined') {
      options.greyscale = true
    }

    if (typeof query.meta !== 'undefined') {
      options.withMetadata = true
    }

    return options
  }

  async function _processImage (reader, mimeType, query = {}) {
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
    let responseMimeType = mimeType

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

    return [responseMimeType, reader.pipe(processing)]
  }

  function _getParsedUrl (param, query) {
    let url = typeof param === 'string' ? param : ''

    if (url.indexOf('/') === 0) {
      url = url.substring(1)
    }

    if (url.indexOf('http') === -1) {
      url = (typeof query.ssl === 'undefined' ? 'http' : 'https') + '://' + url
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

        return resolve([mime.type, output])
      })
    })
  }

  async function _main (param, query = {}) {
    let stream

    if (_options.hostname || query.host) {
      let url = _getParsedUrl(param, query)

      if (_options.allowedHosts.length && !_options.allowedHosts.includes(url.hostname)) {
        throw new TypeError('Hostname not allowed.')
      }

      stream = await mhttp.getStream({ url })
    } else {
      let filePath = path.join(_options.rootDir, param)
      stream = fs.createReadStream(filePath)
    }

    const [mimeType, reader] = await _streamMimeType(stream)
    return _processImage(reader, mimeType, query)
  }

  function expressMiddleware (options = {}) {
    return (req, res, next) => {
      const url = req.params['0']

      _main(url, req.query)
        .then(([mimeType, reader]) => {
          res.set('content-type', mimeType)
          reader.pipe(res)
        })
        .catch(next)
    }
  }

  return {
    express: expressMiddleware
  }
}

module.exports = imagist
