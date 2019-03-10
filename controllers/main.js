const validator = require('validator')
const mhttp = require('machinepack-http')
const mmm = require('stream-mmmagic')
const sharp = require('sharp')
const _ = require('lodash')

const allowedMimeTypes = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/tiff': 'tiff'
}

const allowedFits = [
  'cover',
  'contain',
  'fill',
  'inside',
  'outside'
]
const allowedPositions = [
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
const mappedPositions = {
  detail: 'entropy',
  luminance: 'attention'
}
const allowedInterpolations = [
  'nearest',
  'cubic',
  'mitchell',
  'lanczos2',
  'lanczos3'
]
const allowedFormats = Object.values(allowedMimeTypes)
const allowedFlips = ['h', 'v', 'both']

async function checkMimeType (reader) {
  return new Promise((resolve, reject) => {
    mmm(reader, (err, mime, output) => {
      if (err) {
        return reject(err)
      }

      if (!Object.keys(allowedMimeTypes).includes(mime.type)) {
        return reject(new Error('MIME type not allowed.'))
      }

      return resolve([mime, output])
    })
  })
}

function toInteger (val, unsigned = false) {
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

function getImageOptions (query) {
  const defaults = {
    resize: {
      width: null,
      height: null,
      options: {
        fit: 'cover',
        position: 'center',
        kernel: 'lanczos3',
        withoutEnlargement: false,
        background: '#000'
      }
    },
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
  const options = Object.assign({}, defaults)

  if (query.width) {
    options.resize.width = toInteger(query.width, true)
  }

  if (query.height) {
    options.resize.height = toInteger(query.height, true)
  }

  if (query.fit && validator.isIn(query.fit, allowedFits)) {
    options.resize.options.fit = query.fit
  }

  if (query.position && validator.isIn(query.position, allowedPositions)) {
    options.resize.options.position = query.position

    if (['detail', 'luminance'].includes(query.position)) {
      options.resize.options.position = mappedPositions[query.position]

      if (typeof options.resize.options.fit !== 'undefined' && options.resize.options.fit !== 'cover') {
        delete options.resize.options.position
      }
    }
  }

  if (query.quality && validator.isInt(query.quality, { min: 1, max: 100 })) {
    options.quality = toInteger(query.quality, true)
  }

  if (query.interpolation && validator.isIn(query.interpolation, allowedInterpolations)) {
    options.resize.options.kernel = query.interpolation
  }

  if (typeof query.enlarge !== 'undefined') {
    options.resize.options.withoutEnlargement = !validator.toBoolean(query.enlarge)
  }

  if (query.background && validator.isHexColor(query.background)) {
    options.resize.options.background = query.background
  }

  if (query.format && validator.isIn(query.format, allowedFormats)) {
    options.format = query.format
  }

  if (typeof query.trim !== 'undefined') {
    options.trim = validator.toBoolean(query.trim)
  }

  if (query.rotate) {
    options.rotate = toInteger(query.rotate)
  }

  if (query.flip && allowedFlips.includes(query.flip)) {
    if (query.flip === 'h') {
      options.flop = true
    } else if (query.flip === 'v') {
      options.flip = true
    } else {
      options.flip = true
      options.flop = true
    }
  }

  if (typeof query.sharpen !== 'undefined') {
    options.sharpen = validator.toBoolean(query.sharpen)
  }

  if (query.blur && validator.isFloat(query.blur, { min: 0.3, max: 1000 })) {
    options.blur = validator.toFloat(query.blur, 10)
  }

  if (typeof query.negative !== 'undefined') {
    options.negate = validator.toBoolean(query.negative)
  }

  if (query.tint && validator.isHexColor(query.tint)) {
    options.tint = query.tint
  }

  if (typeof query.greyscale !== 'undefined') {
    options.greyscale = validator.toBoolean(query.greyscale)
  }

  return _.merge(defaults, options)
}

async function processImage (reader, mimeType, options = {}) {
  const processing = sharp()
  const formatOptions = {}
  let responseMimeType = mimeType

  if (options.resize.width || options.resize.height) {
    processing.resize(options.resize.width, options.resize.height, options.resize.options)
  }

  if (options.trim) {
    processing.trim()
  }

  if (options.rotate) {
    processing.rotate(options.rotate)
  }

  if (options.flip) {
    processing.flip()
  }

  if (options.flop) {
    processing.flop()
  }

  if (options.sharpen) {
    processing.sharpen()
  }

  if (options.blur) {
    processing.blur(options.blur)
  }

  if (options.negate) {
    processing.negate()
  }

  if (options.tint) {
    processing.tint(options.tint)
  }

  if (options.greyscale) {
    processing.greyscale()
  }

  if (options.quality) {
    formatOptions.quality = options.quality
  }

  if (options.format) {
    responseMimeType = _.findKey(allowedMimeTypes, val => val === options.format)
    processing.toFormat(options.format, formatOptions)
  } else {
    processing.toFormat(allowedMimeTypes[mimeType], formatOptions)
  }

  return [responseMimeType, reader.pipe(processing)]
}

exports.index = (req, res, next) => {
  const urlValidationOptions = {
    protocols: ['http', 'https'],
    require_tld: false,
    require_protocol: true
  }

  const imageOptions = getImageOptions(req.query)

  if (typeof req.params['0'] === 'undefined') {
    return res.boom.badRequest('Source URL is required.')
  }

  const param = req.params['0']
  const src = param.substring(1)

  if (!src.length) {
    return res.boom.badRequest('URL is required.')
  }

  if (!validator.isURL(src, urlValidationOptions)) {
    return res.boom.badRequest('Invalid URL.')
  }

  mhttp
    .getStream({ url: src })
    .then(checkMimeType)
    .then(([mime, reader]) => processImage(reader, mime.type, imageOptions))
    .then(([mimeType, reader]) => {
      res.set('content-type', mimeType)
      reader.pipe(res)
    })
    .catch(err => res.boom.boomify(err))
}
