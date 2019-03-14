const util = require('../util')

describe('Utility functions', () => {
  describe('toInt() should only return an integer or 0', () => {
    test('Return int as int', () => {
      expect(util.toInt(1)).toBe(1)
      expect(util.toInt(-1)).toBe(-1)
    })

    test('Return string int as int', () => {
      expect(util.toInt('2')).toBe(2)
      expect(util.toInt('-2')).toBe(-2)
    })

    test('Return string float as int', () => {
      expect(util.toInt('3.25')).toBe(3)
      expect(util.toInt('-3.25')).toBe(-3)
    })

    test('Return float as int', () => {
      expect(util.toInt(4.33)).toBe(4)
      expect(util.toInt(-4.33)).toBe(-4)
    })

    test('Return text string as 0', () => {
      expect(util.toInt('not an int')).toBe(0)
    })

    test('Return object as 0', () => {
      expect(util.toInt({})).toBe(0)
      expect(util.toInt({ key: 'val' })).toBe(0)
    })

    test('Return null as 0', () => {
      expect(util.toInt(null)).toBe(0)
    })

    test('Return empty string as 0', () => {
      expect(util.toInt('')).toBe(0)
      expect(util.toInt(' ')).toBe(0)
    })

    test('Return array as 0', () => {
      expect(util.toInt([])).toBe(0)
      expect(util.toInt([1])).toBe(0)
    })

    test('Return 0 without an argument', () => {
      expect(util.toInt()).toBe(0)
    })

    test('Return undefined as 0', () => {
      expect(util.toInt(undefined)).toBe(0)
    })

    test('Return function as 0', () => {
      expect(util.toInt(() => {})).toBe(0)
    })

    test('Return true/false as 1/0', () => {
      expect(util.toInt(true)).toBe(1)
      expect(util.toInt(false)).toBe(0)
    })

    test('Return symbol as 0', () => {
      expect(util.toInt(Symbol(1))).toBe(0)
    })
  })

  describe('color() should return 3 util functions if input is truthy, null otherwise', () => {
    test('Should have .format() function', () => {
      expect(util.color(true)).toHaveProperty('format')
    })

    test('Should have .normalize() function', () => {
      expect(util.color(true)).toHaveProperty('normalize')
    })

    test('Should have .validate() function', () => {
      expect(util.color(true)).toHaveProperty('validate')
    })
  })

  describe('color().format() should return a hex format, array, or 0', () => {
    test('Return hex', () => {
      expect(util.color('fff').format()).toBe('#fff')
      expect(util.color('000000').format()).toBe('#000000')
    })

    test('Return RGB(A)', () => {
      expect(util.color('0,0,0').format()).toEqual([0, 0, 0])
      expect(util.color('0,0,0,1').format()).toEqual([0, 0, 0, 1])
      expect(util.color('255, 255, 255 , 0.5').format()).toEqual([255, 255, 255, 0.5])
      expect(util.color('255, 255, 255, invalid').format()).toEqual([255, 255, 255])
    })

    test('Return null because of invalid hex format', () => {
      expect(util.color('#fff').format()).toBe(null)
      expect(util.color('0000000').format()).toBe(null)
    })

    test('Return null because of invalid RGBA(A) format', () => {
      expect(util.color('0,').format()).toBe(null)
      expect(util.color('0,0').format()).toBe(null)
      expect(util.color('0,0,0,0.5,extra').format()).toBe(null)
    })
  })

  describe('color().validate() should return true/false if valid hex or RGB(A)', () => {
    test('Return true if valid hex', () => {
      expect(util.color('fff').validate()).toBe(true)
      expect(util.color('e5e5e5').validate()).toBe(true)
    })

    test('Return true if valid RGB(A)', () => {
      expect(util.color('0,0,0').validate()).toBe(true)
      expect(util.color('255,255,255,0.5').validate()).toBe(true)
      expect(util.color('333,444,555,10').validate()).toBe(true)
      expect(util.color('1,2,3,4').validate()).toBe(true)
      expect(util.color('-1,-2,-3').validate()).toBe(true)
      expect(util.color('1,2,3,-0.5').validate()).toBe(true)
    })

    test('Return false if generally invalid input', () => {
      expect(util.color('invalid').validate()).toBe(false)
      expect(util.color('').validate()).toBe(false)
      expect(util.color(null).validate()).toBe(false)
      expect(util.color({}).validate()).toBe(false)
      expect(util.color(() => {}).validate()).toBe(false)
    })

    test('Return false if invalid hex', () => {
      expect(util.color('#fff').validate()).toBe(false)
      expect(util.color('#ttt').validate()).toBe(false)
      expect(util.color('#nononono').validate()).toBe(false)
    })

    test('Return false if invalid RGB(A)', () => {
      expect(util.color(['255']).validate()).toBe(false)
      expect(util.color(['0', '0', '0']).validate()).toBe(false)
    })
  })

  describe('color().normalize() should return RGB(A) color object, or null if invalid', () => {
    test('Return object if valid color', () => {
      expect(util.color('0,0,0').normalize()).toEqual({ r: 0, g: 0, b: 0 })
      expect(util.color('0,0,0,1').normalize()).toEqual({ r: 0, g: 0, b: 0 })
      expect(util.color('0,0,0,0.5').normalize()).toEqual({ r: 0, g: 0, b: 0, alpha: 0.5 })
      expect(util.color('fff').normalize()).toEqual({ r: 255, g: 255, b: 255 })
    })

    test('Return null if invalid color', () => {
      expect(util.color('invalid').normalize()).toBe(null)
      expect(util.color('0,0').normalize()).toEqual(null)
      expect(util.color('zzz').normalize()).toEqual(null)
    })
  })

  describe('findKey should return key specified by condition or undefined', () => {
    test('Return key when condition is true', () => {
      expect(util.findKey({ a: 1 }, v => v === 1)).toBe('a')
    })

    test('Return undefined when condition is false', () => {
      expect(util.findKey({ a: 1 }, v => v === 2)).toBe(undefined)
    })
  })
})
