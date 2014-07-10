var assert = require('chai').assert;
var config = require('../../package.json');
var Morearty = require('../../dist/morearty-' + config.version);
var Map = Morearty.Data.Map;
var Vector = Morearty.Data.Vector;
var DataUtil = Morearty.Data.Util;

describe('DataUtil', function () {

  describe('#toJs()', function () {
    it('should return empty object on empty Map', function () {
      assert.deepEqual(DataUtil.toJs(Map), {});
    });

    it('should return empty array on empty Vector', function () {
      assert.deepEqual(DataUtil.toJs(Vector), []);
    });

    it('should correctly convert nested data', function () {
      var a = Map.fill(
        'key1', Vector.fill(
          Map.fill('key2', 'value2'),
          Vector.fill(
            Map.fill('key3', 'value3'),
            0, false
          )
        )
      );
      assert.deepEqual(DataUtil.toJs(a), {
        key1: [
          { key2: 'value2' },
          [
            { key3: 'value3' },
            0, false
          ]
        ]
      });
    });
  });

  describe('#toJs()', function () {
    it('should return empty map on empty object', function () {
      assert.isTrue(DataUtil.fromJs({}).equals(Map));
    });

    it('should return empty vector on empty array', function () {
      assert.isTrue(DataUtil.fromJs([]).equals(Vector));
    });

    it('should correctly convert nested data', function () {
      var js = {
        key1: [
          { key2: 'value2' },
          [
            { key3: 'value3' },
            0, false
          ]
        ]
      };

      assert.isTrue(DataUtil.fromJs(js).equals(
        Map.fill(
          'key1', Vector.fill(
            Map.fill('key2', 'value2'),
            Vector.fill(
              Map.fill('key3', 'value3'),
              0, false
            )
          )
        )
      ));
    });
  });

  describe('groupBy(vec, key)', function () {
    it('should return empty map when called on empty vector', function () {
      assert.isTrue(DataUtil.groupBy(Vector, 'foo').isEmpty());
    });

    it('should skip elements lacking key to group by', function () {
      var v = Vector.fill(Map.fill('key', 'value1'), Map.fill('key', 'value2'), Map.fill('foo', 'bar'));
      assert.isTrue(DataUtil.groupBy(v, 'key').equals(
        Map.fill('value1', Map.fill('key', 'value1'), 'value2', Map.fill('key', 'value2'))
      ));
    });

    it('should accept key as a dot-separated string or an array', function () {
      var v = Vector.fill(Map.fill('key', 'value1'), Map.fill('key', 'value2'));
      assert.isTrue(DataUtil.groupBy(v, 'key').equals(
        Map.fill('value1', Map.fill('key', 'value1'), 'value2', Map.fill('key', 'value2'))
      ));
      assert.isTrue(DataUtil.groupBy(v, ['key']).equals(
        Map.fill('value1', Map.fill('key', 'value1'), 'value2', Map.fill('key', 'value2'))
      ));
    });

    it('should support optional value transformer function', function () {
      var v = Vector.fill(Map.fill('key', 'value1'), Map.fill('key', 'value2'));
      var f = function (s) { return s + 'transformed'; };
      assert.isTrue(DataUtil.groupBy(v, 'key', f).equals(
        Map.fill(f('value1'), Map.fill('key', 'value1'), f('value2'), Map.fill('key', 'value2'))
      ));
    });
  });

  describe('scenario', function () {
    it('convertion JavaScript -> associtive -> JavaScript should be deeply equal to original', function () {
      var js = {
        key1: [
          { key2: 'value2' },
          [
            { key3: 'value3' },
            0, false
          ]
        ]
      };
      assert.deepEqual(DataUtil.toJs(DataUtil.fromJs(js)), js);
    });

    it('convertion associtive -> JavaScript -> associtive should be equal to original', function () {
      var a = Map.fill(
        'key1', Vector.fill(
          Map.fill('key2', 'value2'),
          Vector.fill(
            Map.fill('key3', 'value3'),
            0, false
          )
        )
      );
      assert.isTrue(DataUtil.fromJs(DataUtil.toJs(a)).equals(a));
    });
  });

});
