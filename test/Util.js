var assert = require('chai').assert;
var $ = require('jquery');
var Imm = require('immutable');
var IMap = Imm.Map;
var Util = require('../src/Util');

describe('Util', function () {

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

  describe('#async(f)', function () {
    it('should execute function f asynchronousely', function (done) {
      var called = false;
      var f = function () { called = true; };
      Util.async(f);
      assert.isFalse(called);
      setTimeout(function () {
        assert.isTrue(called);
        done();
      }, 20);
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

});
