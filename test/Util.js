var assert = require('chai').assert;
var $ = require('jquery');
var config = require('../package.json');
var Morearty = require('../dist/morearty-' + config.version);
var Util = Morearty.Util;
var Map = Morearty.Data.Map;

describe('Util', function () {

  describe('#hashcode()', function () {
    it('should return number', function () {
      assert.strictEqual(typeof Util.hashcode('a string'), 'number');
    });

    it('should return equal hashcodes for strings [AaAa, AaBB, BBBB]', function () {
      var EXPECTED = 2031744;
      assert.strictEqual(Util.hashcode('AaAa'), EXPECTED);
      assert.strictEqual(Util.hashcode('AaBB'), EXPECTED);
      assert.strictEqual(Util.hashcode('BBBB'), EXPECTED);
    });

    it('should return zero for empty string', function () {
      assert.strictEqual(Util.hashcode(''), 0);
    });

    it('should return different hashcodes for strings [value1, value2]', function () {
      assert.notEqual(Util.hashcode('value1'), Util.hashcode('value2'));
    });
  });

  describe('#identity(x)', function () {
    it('should return its first argument', function () {
      assert.strictEqual(Util.identity(), undefined);
      assert.strictEqual(Util.identity(1), 1);
      assert.strictEqual(Util.identity(1, 2), 1);
    });
  });

  describe('#not()', function () {
    it('should return function always returning logical not of its argument', function () {
      assert.strictEqual(Util.not(0), !0);
      assert.strictEqual(Util.not(1), !1);
      assert.strictEqual(Util.not(true), false);
      assert.strictEqual(Util.not(false), true);
      assert.strictEqual(Util.not(null), !null);
      assert.strictEqual(Util.not(undefined), !undefined);
      assert.strictEqual(Util.not([]), ![]);
      assert.strictEqual(Util.not(['foo']), !['foo']);
      assert.strictEqual(Util.not({}), !{});
      assert.strictEqual(Util.not({ foo: 'bar' }), !{ foo: 'bar' });
    });
  });

  describe('#constantly(x)', function () {
    it('should return a constant function', function () {
      var EXPECTED = 'foo';
      var cf = Util.constantly(EXPECTED);
      assert.strictEqual(cf(), EXPECTED);
      assert.strictEqual(cf('bar'), EXPECTED);
      assert.strictEqual(cf('bar', 'baz'), EXPECTED);
    });
  });

  describe('#afterComplete(f, cont)', function () {
    it('should execute function cont after f', function () {
      var order = [];
      Util.afterComplete(function () { order.push('f'); }, function () { order.push('cont'); });
      assert.deepEqual(order, ['f', 'cont']);
    });

    it('should execute cont using promise callback if f returns a promise', function () {
      var order = [], dfd = $.Deferred();
      Util.afterComplete(
        function () { order.push('f'); return dfd.promise(); },
        function () { order.push('cont'); }
      );

      assert.deepEqual(order, ['f']);
      dfd.resolve();
      assert.deepEqual(order, ['f', 'cont']);
    });
  });

  describe('#undefinedOrNull(x)', function () {
    it('should return true on undefined and null, false otherwise', function () {
      assert.isTrue(Util.undefinedOrNull(undefined));
      assert.isTrue(Util.undefinedOrNull(null));
      assert.isFalse(Util.undefinedOrNull(0));
      assert.isFalse(Util.undefinedOrNull(1));
      assert.isFalse(Util.undefinedOrNull(''));
      assert.isFalse(Util.undefinedOrNull('foo'));
      assert.isFalse(Util.undefinedOrNull([]));
      assert.isFalse(Util.undefinedOrNull(['foo']));
      assert.isFalse(Util.undefinedOrNull({}));
      assert.isFalse(Util.undefinedOrNull({ foo: 'bar' }));
    });
  });

  describe('#startsWith(s1, s2)', function () {
    it('should return if s1 starts with s2, false otherwise', function () {
      assert.isTrue(Util.startsWith('', ''));
      assert.isTrue(Util.startsWith('s', ''));
      assert.isTrue(Util.startsWith('s', 's'));
      assert.isTrue(Util.startsWith('foo', 'fo'));

      assert.isFalse(Util.startsWith('', 's'));
      assert.isFalse(Util.startsWith('fo', 'foo'));
    });
  });

  describe('#toString(x)', function () {
    it('should add double quotes around strings', function () {
      assert.strictEqual(Util.toString(''), '""');
      assert.strictEqual(Util.toString('foo'), '"foo"');
    });

    it('should separate array elements by comma and space and surround result by square brackets', function () {
      assert.strictEqual(Util.toString([]), '[]');
      assert.strictEqual(Util.toString([0, 1, 2]), '[0, 1, 2]');
    });

    it('should use default toString() implementation for typesother than string and array', function () {
      assert.strictEqual(Util.toString(0), (0).toString());
      assert.strictEqual(Util.toString(false), (false).toString());
      assert.strictEqual(Util.toString({}), ({}).toString());
    });

    it('should correctly handle undefined and null', function () {
      assert.strictEqual(Util.toString(), 'undefined');
      assert.strictEqual(Util.toString(null), 'null');
    });
  });

  describe('#equals(x, y)', function () {
    it('should return true for strictly equals arguments', function () {
      var obj = {}, arr = [];
      assert.isTrue(Util.equals(1, 1));
      assert.isTrue(Util.equals('foo', 'foo'));
      assert.isTrue(Util.equals(obj, obj));
      assert.isTrue(Util.equals(arr, arr));
    });

    it('should try equals method if any if strict comparison returns false', function () {
      assert.isTrue(Util.equals(Map.fill('key', 'value'), Map.fill('key', 'value')));
      assert.isFalse(Util.equals(Map.fill('key', 'value'), Map.fill('foo', 'bar')));
    });
  });

  describe('#getPropertyValues(obj)', function () {
    it('should return empty array on empty object', function () {
      assert.deepEqual(Util.getPropertyValues({}), []);
    });

    it('should return values of object properties in any order', function () {
      var obj = {
        key1: 'value1',
        key2: 'value2'
      };
      assert.sameMembers(Util.getPropertyValues(obj), ['value1', 'value2']);
    });

    it('should ignore object prototype properties', function () {
      var Cons = function () {};
      Cons.prototype = { key2: 'value2' };

      var obj = new Cons();
      obj.key1 = 'value1';
      assert.deepEqual(Util.getPropertyValues(obj), ['value1']);
    });
  });

  describe('#find(arr, pred)', function () {
    it('should return null on empty array', function () {
      assert.strictEqual(Util.find([], function (x) { return x; }), null);
    });

    it('should return null when no value found', function () {
      assert.strictEqual(Util.find(['foo', 'bar'], function (x) { return x === 'baz'; }), null);
    });

    it('should return correct value if found', function () {
      assert.strictEqual(Util.find(['foo', 'bar', 'baz'], function (x) { return x === 'baz'; }), 'baz');
    });

    it('should call predicate passing current value, index, original array', function () {
      var arr = ['foo', 'bar', 'baz'];
      Util.find(arr, function (x, i, a) {
        assert.isNumber(i);
        assert.strictEqual(a, arr);
        return x === 'baz';
      });
    });
  });

  describe('#findWithIndex(arr, pred)', function () {
    it('should return null on empty array', function () {
      assert.strictEqual(Util.findWithIndex([], function (x) { return x; }), null);
    });

    it('should return null when no value found', function () {
      assert.strictEqual(Util.findWithIndex(['foo', 'bar'], function (x) { return x === 'baz'; }), null);
    });

    it('should return object with correct index and value properties if found', function () {
      assert.deepEqual(
        Util.findWithIndex(['foo', 'bar', 'baz'], function (x) { return x === 'baz'; }),
        { index: 2, value: 'baz' }
      );
    });

    it('should call predicate passing current value, index, original array', function () {
      var arr = ['foo', 'bar', 'baz'];
      Util.findWithIndex(arr, function (x, i, a) {
        assert.isNumber(i);
        assert.strictEqual(a, arr);
        return x === 'baz';
      });
    });
  });

  describe('#resolveArgs(args, argsSpec)', function () {
    it('should return empty object on empty spec', function () {
      assert.deepEqual(Util.resolveArgs(['foo', 'bar']), {});
    });

    it('should return empty object on empty args', function () {
      assert.deepEqual(Util.resolveArgs([], 'first',  'second'), {});
    });

    it('should match one to one if arguments count is equal to spec elements count', function () {
      // all required
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', 0], 'first', 'second', 'third'), { first: 'foo', second: 'bar', third: 0 }
      );
      // all optional
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', 0], '?first', '?second', '?third'),
        { first: 'foo', second: 'bar', third: 0 }
      );
      // required first
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', 0], 'first', '?second', 'third'),
        { first: 'foo', second: 'bar', third: 0 }
      );
      // required last
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', 0], '?first', '?second', 'third'),
        { first: 'foo', second: 'bar', third: 0 }
      );
    });

    it('should match required arguments only if all optional are omitted', function () {
      // required first
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar'], 'first', 'second', '?third', '?fourth'), { first: 'foo', second: 'bar' }
      );
      // required last
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar'], '?first', '?second', 'third', 'fourth'), { third: 'foo', fourth: 'bar' }
      );
    });

    it('should match optional arguments left to right using check function when supplied', function () {
      // required first
      var spec = ['first', 'second', function (x) { return typeof x === 'number' ? 'third' : null; }, '?fourth'];
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', 0, true], spec),
        { first: 'foo', second: 'bar', third: 0, fourth: true }
      );
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', true], spec),
        { first: 'foo', second: 'bar', fourth: true }
      );
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', 0], spec),
        { first: 'foo', second: 'bar', third: 0 }
      );
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', true, 0], spec),
        { first: 'foo', second: 'bar', fourth: true }
      );
      // required last
      spec = [function (x) { return typeof x === 'number' ? 'first' : null; }, '?second', 'third', 'fourth'];
      assert.deepEqual(
        Util.resolveArgs([0, true, 'foo', 'bar'], spec),
        { first: 0, second: true, third: 'foo', fourth: 'bar' }
      );
      assert.deepEqual(
        Util.resolveArgs([true,'foo', 'bar'], spec),
        { second: true, third: 'foo', fourth: 'bar' }
      );
      assert.deepEqual(
        Util.resolveArgs([0, 'foo', 'bar'], spec),
        { first: 0, third: 'foo', fourth: 'bar' }
      );
      assert.deepEqual(
        Util.resolveArgs([true, 0, 'foo', 'bar'], spec),
        { second: true, third: 'foo', fourth: 'bar' }
      );
    });

    it('should accept specs as var-args list or array', function () {
      assert.deepEqual(
        Util.resolveArgs(['foo', 'bar', 0], 'first', 'second', 'third'),
        Util.resolveArgs(['foo', 'bar', 0], ['first', 'second', 'third'])
      );
    });

    it('should eat undefined optional arguments greedily', function () {
      assert.deepEqual(
        Util.resolveArgs(['foo', undefined, 'bar'], 'first', '?second', '?third'),
        { first: 'foo', second: undefined, third: 'bar' }
      );
      assert.deepEqual(
        Util.resolveArgs([undefined, 'foo'], '?first', '?second', 'third'),
        { first: undefined, third: 'foo' }
      );
    });
  });

  describe('#canRepresentSubpath(x)', function () {
    it('should return true on valid subpaths', function () {
      assert.isTrue(Util.canRepresentSubpath(0));
      assert.isTrue(Util.canRepresentSubpath(''));
      assert.isTrue(Util.canRepresentSubpath('key1.key2'));
      assert.isTrue(Util.canRepresentSubpath([]));
      assert.isTrue(Util.canRepresentSubpath(['key1', 'key2']));
    });

    it('should return false otherwise', function () {
      assert.isFalse(Util.canRepresentSubpath());
      assert.isFalse(Util.canRepresentSubpath(null));
      assert.isFalse(Util.canRepresentSubpath(false));
      assert.isFalse(Util.canRepresentSubpath({}));
      assert.isFalse(Util.canRepresentSubpath({ key: 'value' }));
      assert.isFalse(Util.canRepresentSubpath(function () {}));
    });
  });

  describe('#shallowMerge(source, dest)', function () {
    it('should replace existing properties in dest', function () {
      var source = { key: 'source value' };
      var dest = { key: 'dest value' };
      Util.shallowMerge(source, dest);
      assert.strictEqual(dest.key, 'source value');
    });

    it('should merge properties into dest and leave source object intact', function () {
      var source = { key1: 'value1' };
      var dest = { key2: 'value2' };
      Util.shallowMerge(source, dest);
      assert.deepEqual(source, { key1: 'value1' });
      assert.deepEqual(dest, { key1: 'value1', 'key2': 'value2' });
    });
  });

  describe('#papply(comp, props, override)', function () {
    var fakeComp = function (props) { return props; };

    it('should override existing properties by default', function () {
      var c = Util.papply(Util.papply(fakeComp, { prop1: 'foo'  }), { prop1: 'bar' });
      assert.deepEqual(c(), { prop1: 'bar' });
    });

    it('should not override existing properties if requested', function () {
      var c = Util.papply(Util.papply(fakeComp, { prop1: 'foo'  }), { prop1: 'bar' }, false);
      assert.deepEqual(c(), { prop1: 'foo' });
    });

    it('should combine properties from each partial application', function () {
      var c = Util.papply(Util.papply(fakeComp, { prop1: 'foo'  }), { prop2: 'bar' });
      assert.deepEqual(c(), { prop1: 'foo', prop2: 'bar' });
    });
  });

  describe('#subclass(sub, super, additionalProperties)', function () {
    it('should inherit parent prototype, set _super property, and extend with additional properties', function () {
      var Super = function () {};
      Super.prototype = { foo: 'foo', bar: 'bar' };

      var Sub = function () {};

      Util.subclass(Sub, Super, { baz: 'baz' });

      var sub = new Sub();
      assert.strictEqual(Sub._super, Super.prototype);
      assert.strictEqual(sub.foo, 'foo');
      assert.strictEqual(sub.bar, 'bar');
      assert.strictEqual(sub.baz, 'baz');
    });
  });

});
