const validator = require('validator')
const mhttp = require('machinepack-http')
const mmm = require('stream-mmmagic')
const sharp = require('sharp')
const util = require('./util')

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

  function _queryOptions (query) {
    const options = {
      resize: [
        null, null, {
          fit: 'cover',
          position: 'center',
          kernel: 'lanczos3',
          withoutEnlargement: true,
          background: '#000'
        }
      ],
      format: [null, { quality: 80 }],
      withMetadata: [false],
      trim: [false],
      rotate: [0, { background: '#000' }],
      flip: [false],
      flop: [false],
      sharpen: [false],
      blur: [false],
      negate: [false],
      tint: [false],
      greyscale: [false]
    }

    let tint = util.color(query.tint)
    let background = util.color(query.bg)

    if (query.w) {
      options.resize[0] = Math.abs(util.toInt(query.w)) || null
    }

    if (query.h) {
      options.resize[1] = Math.abs(util.toInt(query.h)) || null
    }

    if (query.fit && _allowedFits.includes(query.fit)) {
      options.resize[2].fit = query.fit
    }

    if (query.i && _allowedInterpolations.includes(query.i)) {
      options.resize[2].kernel = query.i
    }

    if (query.pos && _allowedPositions.includes(query.pos)) {
      options.resize[2].position = query.pos
    }

    if (query.max) {
      options.resize[2].withoutEnlargement = false
    }

    if (background.validate()) {
      options.resize[2].background = background.normalize()
    }

    if (query.fmt && Object.keys(_supportedOutputFormats).includes(query.fmt)) {
      options.format[0] = query.fmt
    }

    if (query.q && validator.isInt(query.q, { min: 1, max: 100 })) {
      options.format[1].quality = Math.abs(util.toInt(query.q))
    }

    if (query.flip && _allowedFlips.includes(query.flip)) {
      if (query.flip === 'h') {
        options.flop[0] = true
      } else if (query.flip === 'v') {
        options.flip[0] = true
      } else if (query.flip === 'both') {
        options.flip[0] = true
        options.flop[0] = true
      }
    }

    if (query.r && validator.isFloat(query.r)) {
      options.rotate[0] = validator.toFloat(query.r)
      options.rotate[1].background = options.resize[2].background
    }

    if (query.tint && tint.validate()) {
      options.tint[0] = tint.normalize()
    }

    if (query.blur && validator.isFloat(query.blur, { min: 0.3, max: 1000 })) {
      options.blur[0] = validator.toFloat(query.blur, 10)
    }

    if (query.trim) {
      options.trim[0] = 10
    }

    if (query.sharp) {
      options.sharpen[0] = true
    }

    if (query.neg) {
      options.negate[0] = true
    }

    if (query.gs) {
      options.greyscale[0] = true
    }

    if (query.meta) {
      options.withMetadata[0] = true
    }

    return options
  }

  async function _processImage (reader, mimeType, query = {}) {
    let responseMimeType = mimeType
    const options = _queryOptions(query)
    const processing = sharp()
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
      if (options[method][0]) {
        processing[method].apply(processing, options[method])
      }
    })

    if (options.resize[0] || options.resize[1]) {
      processing.resize.apply(processing, options.resize)
    }

    if (!options.format[0]) {
      options.format[0] = util.findKey(_supportedOutputFormats, type => type === mimeType) || 'jpeg'
    }

    responseMimeType = _supportedOutputFormats[options.format[0]]
    processing.toFormat.apply(processing, options.format)

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

  async function get (param, query, headers = {}) {
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

    const stream = await mhttp.getStream({ url: url.href, headers })
    const [reader, mimeType] = await _streamMimeType(stream)
    return _processImage(reader, mimeType, query)
  }

  return { get }
}

module.exports = imagist
