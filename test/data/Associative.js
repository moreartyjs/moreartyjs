var assert = require('chai').assert;
var config = require('../../package.json');
var Morearty = require('../../dist/morearty-' + config.version);
var Map = Morearty.Data.Map;
var Vector = Morearty.Data.Vector;
var Util = Morearty.Util;

describe('Associative', function () {

  describe('#isAssociative(obj)', function () {
    it('should return true on maps and vectors, false otherwise', function () {
      var a = Map;
      assert.isTrue(a.isAssociative(Map));
      assert.isTrue(a.isAssociative(Map.fill('key', 'value')));
      assert.isTrue(a.isAssociative(Vector));
      assert.isTrue(a.isAssociative(Vector.fill('value')));
    });

    it('should return false otherwise', function () {
      var a = Map;
      assert.isFalse(a.isAssociative(1));
      assert.isFalse(a.isAssociative(false));
      assert.isFalse(a.isAssociative('foo'));
      assert.isFalse(a.isAssociative([]));
      assert.isFalse(a.isAssociative({}));
      assert.isFalse(a.isAssociative(function () {}));
    });
  });

  describe('#getIn(path)', function () {
    it('should return correct nested value when maps are intermixed with vectors', function () {
      var a = Map.fill(
        'key1', Vector.fill(
          Map.fill('key2', 'value2'),
          Vector.fill(
            Map.fill('key3', 'value3')
          )
        )
      );
      assert.strictEqual(a.getIn(['key1', 0, 'key2']), 'value2');
      assert.strictEqual(a.getIn(['key1', 1, 0, 'key3']), 'value3');
    });

    it('should return this if passed empty path', function () {
      var a = Map.fill('key', 'value');
      assert.strictEqual(a.getIn([]), a);
    });
  });

  describe('#updateIn(path, f)', function () {
    it('should work correctly when maps are intermixed with vectors', function () {
      var a = Map.fill(
        'key1', Vector.fill(
          Map.fill('key2', 'value2'),
          Vector.fill(
            Map.fill('key3', 'value3')
          )
        )
      );

      var assertFor = function (path, newValue) {
        assert.strictEqual(a.updateIn(path, Util.constantly(newValue)).getIn(path), newValue);
      };

      assertFor(['key1'], 'foo');
      assertFor(['key1', 0, 'key2'], 'foo');
      assertFor(['key1', 1, 0, 'key3'], 'foo');
    });

    it('should throw if passed empty path', function () {
      var a = Map.fill('key', 'value');
      assert.throws(
        function () { a.updateIn([], Util.constantly('foo')); }, Error, 'Path must point to a key'
      );
    });
  });

  describe('#dissocIn(path)', function () {
    it('should work correctly when maps are intermixed with vectors', function () {
      var a = Map.fill(
        'key1', Vector.fill(
          Map.fill('key2', 'value2'),
          Vector.fill(
            Map.fill('key3', 'value3')
          )
        )
      );

      var assertFor = function (path) {
        assert.isNotNull(a.getIn(path));
        assert.strictEqual(a.dissocIn(path).getIn(path), null);
      };

      assertFor(['key1', 0, 'key2']);
      assertFor(['key1', 1, 0, 'key3']);
    });

    it('should throw if passed empty path', function () {
      var a = Map.fill('key', 'value');
      assert.throws(
        function () { a.dissocIn([]); }, Error, 'Path must point to a key'
      );
    });
  });

});
