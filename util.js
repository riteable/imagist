const color = require('color')

function toInt (val) {
  if (typeof val === 'string') {
    val = parseInt(val, 10)
  }

  if (isNaN(val)) {
    return 0
  }

  return val
}

function colorType (val) {
  if (val.indexOf(',') > -1) {
    return 'rgb'
  }

  if (val.length === 3 || val.length === 6) {
    return 'hex'
  }

  return null
}

function isValidColor (val) {
  const type = colorType(val)

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

function normalizeColor (val) {
  const type = colorType(val)

  if (type === 'rgb') {
    val = val.split(',').map(v => parseFloat(v, 10))
  } else if (type === 'hex') {
    val = '#' + val
  }

  return color(val).object()
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
  colorType,
  isValidColor,
  normalizeColor,
  findKey
}
