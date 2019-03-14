const Color = require('color')

function toInt (val) {
  switch (typeof val) {
    case 'object' :
    case 'function' :
    case 'undefined' :
    case 'symbol' :
      return 0
  }

  if (typeof val === 'boolean') {
    return val ? 1 : 0
  }

  val = parseInt(val, 10)

  if (isNaN(val)) {
    return 0
  }

  return val
}

function color (val) {
  let _isFormatted = false
  let _isValidated = false
  let _isNormalized = false
  let _formatted = null
  let _isValid = false
  let _normalized = null

  function format () {
    if (_isFormatted) {
      return _formatted
    }

    _isFormatted = true
    _formatted = null

    if (typeof val !== 'string') {
      return _formatted
    }

    const rgba = val.trim().split(',').filter(v => v !== '')

    if (val.indexOf(',') > -1) {
      if (rgba.length === 3 || rgba.length === 4) {
        _formatted = rgba
          .map(v => parseFloat(v.trim(), 10))
          .filter(v => !isNaN(v))
      } else {
        _formatted = null
      }
    } else if (val.length === 3 || val.length === 6) {
      _formatted = '#' + val
    }

    return _formatted
  }

  function validate () {
    if (_isValidated) {
      return _isValid
    }

    _isValidated = true

    if (!_isFormatted) {
      _formatted = format(val)
    }

    try {
      Color(_formatted)
      _isValid = true
    } catch (err) {
      _isValid = false
    }

    return _isValid
  }

  function normalize () {
    if (_isNormalized) {
      return _normalized
    }

    _isNormalized = true

    if (!_isValidated) {
      _isValid = validate(val)
    }

    if (_isValid) {
      _normalized = Color(_formatted).object()
    } else {
      _normalized = null
    }

    return _normalized
  }

  return {
    format,
    validate,
    normalize
  }
}

function findKey (obj, func) {
  for (const key in obj) {
    if (func(obj[key])) {
      return key
    }
  }

  return undefined
}

module.exports = {
  toInt,
  color,
  findKey
}
