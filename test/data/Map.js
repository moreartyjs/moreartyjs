var assert = require('chai').assert;
var config = require('../../package.json');
var Morearty = require('../../dist/morearty-' + config.version);
var Map = Morearty.Data.Map;
var Util = Morearty.Util;
var TestUtil = require('../TestUtil');

describe('Map', function () {

  describe('#fill(var_args)', function () {
    it('should return this map when called with empty arguments list', function () {
      assert.strictEqual(Map.fill(), Map);
    });

    it('should return map containing all passed key-value pairs', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2', 'keyWithoutValue');
      assert.strictEqual(m.size(), 3);
      assert.strictEqual(m.get('key1'), 'value1');
      assert.strictEqual(m.get('key2'), 'value2');
      assert.strictEqual(m.get('keyWithoutValue'), null);
    });

    it('should fill map from arguments list', function () {
      var m = Map.fill('key1', 'value1').fill('key2', 'value2', 'key3', 'value3');
      assert.strictEqual(m.get('key1'), 'value1');
      assert.strictEqual(m.get('key2'), 'value2');
      assert.strictEqual(m.get('key3'), 'value3');
    });

    it('should replace value if key is already present', function () {
      var m = Map.fill('key1', 'value1').fill('key1', 'value2');
      assert.strictEqual(m.get('key1'), 'value2');
    });
  });

  describe('#isEmpty()', function () {
    it('should return true on empty map', function () {
      assert.isTrue(Map.isEmpty());
    });

    it('should return false on multi-element map', function () {
      assert.isFalse(Map.fill('key', 'value').isEmpty());
      assert.isFalse(Map.fill('key1', 'value1', 'key2', 'value2').isEmpty());
    });
  });

  describe('#get(key)', function () {
    it('should return null on empty map', function () {
      assert.strictEqual(Map.get('key'), null);
    });

    it('should return correct value on multi-element map', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2');
      assert.strictEqual(m.get('key1'), 'value1');
      assert.strictEqual(m.get('key2'), 'value2');
    });

    it('should return null if key is missing', function () {
      var m = Map.fill('key', 'value');
      assert.strictEqual(m.get('missing'), null);
    });

    it('should work on \'falsy\' values', function () {
      var m = Map.fill('zero', 0, 'emptyString', '', 'false', false);
      assert.strictEqual(m.get('zero'), 0);
      assert.strictEqual(m.get('emptyString'), '');
      assert.strictEqual(m.get('false'), false);
    });
  });

  describe('#getIn(path)', function () {
    it('should return null on empty map', function () {
      assert.strictEqual(Map.getIn(['key']), null);
    });

    it('should return this on empty path', function () {
      var m = Map.fill('key', 'value');
      assert.strictEqual(m.getIn([]), m);
    });

    it('should return null on non-existent path', function () {
      var m = Map.fill('key1', Map.fill('key2', 'value2'));
      assert.strictEqual(m.getIn(['key1', 'missing']), null);
      assert.strictEqual(m.getIn(['key1', 'key2', 'missing']), null);
    });

    it('should return correct nested value', function () {
      var m = Map.fill('key1', Map.fill('key2', 'value2'));
      assert.strictEqual(m.getIn(['key1', 'key2']), 'value2');
    });
  });

  describe('#contains(key)', function () {
    it('should return false on empty map', function () {
      assert.isFalse(Map.contains('key'));
    });

    it('should return true if key is present', function () {
      var m = Map.fill('key', 'value');
      assert.isTrue(m.contains('key'));
    });

    it('should return false if key is missing', function () {
      var m = Map.fill('key', 'value');
      assert.isFalse(m.contains('missing'));
    });

    it('should work on \'falsy\' values', function () {
      var m = Map.fill('zero', 0, 'emptyString', '', 'false', false);
      assert.isTrue(m.contains('zero'));
      assert.isTrue(m.contains('emptyString'));
      assert.isTrue(m.contains('false'));
    });
  });

  describe('#update(key, f)', function () {
    it('should not change this map', function () {
      var m = Map.fill('key', 1);
      m.update('key', Util.constantly(2));
      assert.isTrue(m.equals(Map.fill('key', 1)));
    });

    it('should add new value if key is missing', function () {
      var m = Map.update('key', Util.constantly('value'));
      assert.strictEqual(m.get('key'), 'value');
    });

    it('should update existing value with a function', function () {
      var updateFunction = function (x) { return x + 1; };
      var m = Map.fill('key', 1).update('key', updateFunction);
      assert.strictEqual(m.get('key'), updateFunction(1));
    });

    it('should return this map if value isn\'t changed', function () {
      var updateFunction = function (x) { return x; };
      var m1 = Map.fill('key', 'value');
      var m2 = m1.update('key', updateFunction);
      assert.strictEqual(m1, m2);
    });
  });

  describe('#updateIfExists(key, f)', function () {
    it('should not change this map', function () {
      var m = Map.fill('key', 1);
      m.updateIfExists('key', Util.constantly(2));
      assert.isTrue(m.equals(Map.fill('key', 1)));
    });

    it('should return empty map when updating empty map', function () {
      var m = Map.updateIfExists('key', Util.constantly('value'));
      assert.isTrue(m.isEmpty());
    });

    it('should update existing value with a function', function () {
      var updateFunction = function (x) { return x + 1; };
      var m = Map.fill('key', 1).updateIfExists('key', updateFunction);
      assert.strictEqual(m.get('key'), updateFunction(1));
    });

    it('should return this map if value isn\'t changed', function () {
      var updateFunction = function (x) { return x; };
      var m1 = Map.fill('key', 'value');
      var m2 = m1.updateIfExists('key', updateFunction);
      assert.strictEqual(m1, m2);
    });
  });

  describe('#updateIn(path, f)', function () {
    it('should not change this map', function () {
      var m = Map.fill('key', 'value');
      m.updateIn(['key'], Util.constantly('foo'));
      assert.isTrue(m.equals(Map.fill('key', 'value')));
    });

    it('should return empty map when updating empty map', function () {
      var m = Map.updateIn(['key1', 'key2'], Util.constantly('value'));
      assert.isTrue(m.isEmpty());
    });

    it('should update existing value with a function', function () {
      var updateFunction = function (x) { return x + 1; };
      var m = Map
        .fill('key1', Map.fill('key2', 'value1', 'key3', Map.fill('key4', 0)))
        .updateIn(['key1', 'key3', 'key4'], updateFunction);
      assert.strictEqual(m.getIn(['key1', 'key3', 'key4']), updateFunction(0));
    });

    it('should add new value if key is missing', function () {
      var m = Map.fill('key1', Map).updateIn(['key1', 'key2'], Util.constantly('value2'));
      assert.isTrue(m.equals(Map.fill('key1', Map.fill('key2', 'value2'))));
    });

    it('should return this map if value isn\'t changed', function () {
      var m1 = Map.fill('key1', Map.fill('key2', 'value1', 'key3', Map.fill('key4', 0)));
      var m2 = m1.updateIn(['key1', 'key3', 'key4'], Util.identity);
      assert.strictEqual(m1, m2);
    });
  });

  describe('#assoc(key, value)', function () {
    it('should not change this map', function () {
      var m = Map.fill('key', 1);
      m.assoc('key', 2);
      assert.isTrue(m.equals(Map.fill('key', 1)));
    });

    it('should assoc empty map', function () {
      var m = Map.assoc('key', 'value');
      assert.strictEqual(m.get('key'), 'value');
    });

    it('should assoc single-element map', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2');
      assert.strictEqual(m.get('key1'), 'value1');
      assert.strictEqual(m.get('key2'), 'value2');
    });

    it('should replace existing value on single-element map', function () {
      var m = Map.fill('key', 'value', 'key', 'value2');
      assert.strictEqual(m.get('key'), 'value2');
    });

    it('should assoc two values with different keys but equal hashcodes', function () {
      var m = Map.fill('AaAa', 'value1', 'BBBB', 'value2');
      assert.strictEqual(m.get('AaAa'), 'value1');
      assert.strictEqual(m.get('BBBB'), 'value2');
    });

    it('should assoc three values with different keys but equal hashcodes', function () {
      var m = Map.fill('AaAa', 'value1', 'BBBB', 'value2', 'AaBB', 'value3');
      assert.strictEqual(m.get('AaAa'), 'value1');
      assert.strictEqual(m.get('BBBB'), 'value2');
      assert.strictEqual(m.get('AaBB'), 'value3');
    });

    it('should assoc two values with different keys', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2');
      assert.strictEqual(m.get('key1'), 'value1');
      assert.strictEqual(m.get('key2'), 'value2');
    });

    it('should assoc to collision node', function () {
      var m = Map.fill('AaAa', 'value1', 'BBBB', 'value2', 'key', 'value');
      assert.strictEqual(m.get('AaAa'), 'value1');
      assert.strictEqual(m.get('BBBB'), 'value2');
      assert.strictEqual(m.get('key'), 'value');
    });

    it('should assoc three values with different keys', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3');
      assert.strictEqual(m.get('key1'), 'value1');
      assert.strictEqual(m.get('key2'), 'value2');
      assert.strictEqual(m.get('key3'), 'value3');
    });
  });

  describe('#dissoc(key)', function () {
    it('should not change this map', function () {
      var m = Map.fill('key', 1);
      m.dissoc('key');
      assert.isTrue(m.equals(Map.fill('key', 1)));
    });

    it('should dissoc empty map', function () {
      var m = Map.dissoc('key');
      assert.isTrue(m.isEmpty());
    });

    it('should dissoc single-element map', function () {
      var m = Map.fill('key', 'value').dissoc('key');
      assert.isTrue(m.isEmpty());
    });

    it('should return this map if key is missing', function () {
      var m = Map.fill('key', 'value');
      assert.strictEqual(m.dissoc('key2'), m);
    });

    it('should dissoc collision node', function () {
      var m = Map
        .fill('AaAa', 'value1', 'BBBB', 'value2', 'AaBB', 'value3')
        .dissoc('AaAa').dissoc('AaBB');
      assert.strictEqual(m.get('AaAa'), null);
      assert.strictEqual(m.get('BBBB'), 'value2');
      assert.strictEqual(m.get('AaBB'), null);
    });

    it('should dissoc multi-element map', function () {
      var m = Map
        .fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3')
        .dissoc('key1').dissoc('key3');
      assert.strictEqual(m.get('key1'), null);
      assert.strictEqual(m.get('key2'), 'value2');
      assert.strictEqual(m.get('key3'), null);
    });
  });

  describe('#dissocIn(path)', function () {
    it('should not change this map', function () {
      var m = Map.fill('key', 1);
      m.dissocIn(['key']);
      assert.isTrue(m.equals(Map.fill('key', 1)));
    });

    it('should return this map on non-existent path', function () {
      var m = Map.fill('key', 'value');
      assert.strictEqual(m.dissocIn(['missing']), m);
    });

    it('should correctly dissoc nested value', function () {
      var m = Map.fill('key1', Map.fill('key2', 'value1'));
      assert.strictEqual(m.getIn(['key1', 'key2']), 'value1');
      assert.strictEqual(m.dissocIn(['key1', 'key2']).getIn(['key1', 'key2']), null);
    });
  });

  describe('#join(anotherMap)', function () {
    it('should not change this map and another map', function () {
      var m1 = Map.fill('key1', 'value1');
      var m2 = Map.fill('key2', 'value2');
      m1.join(m2);
      assert.isTrue(m1.equals(Map.fill('key1', 'value1')));
      assert.isTrue(m2.equals(Map.fill('key2', 'value2')));
    });

    it('should return this map if another map is empty', function () {
      var m = Map.fill('key1', 'value1');
      assert.strictEqual(m.join(Map), m);
    });

    it('should return another map if this map is empty', function () {
      var m = Map.fill('key1', 'value1');
      assert.strictEqual(Map.join(m), m);
    });

    it('should return map containing mappings from both maps', function () {
      var m1 = Map.fill('key1', 'value1');
      var m2 = Map.fill('key2', 'value2');
      var result = m1.join(m2);
      assert.strictEqual(result.size(), 2);
      assert.strictEqual(result.get('key1'), 'value1');
      assert.strictEqual(result.get('key2'), 'value2');
    });

    it('this map values are replaced with another map values on duplicate keys', function () {
      var m1 = Map.fill('key1', 'value1');
      var m2 = Map.fill('key1', 'value2');
      var result = m1.join(m2);
      assert.strictEqual(result.size(), 1);
      assert.strictEqual(result.get('key1'), 'value2');
    });
  });

  describe('#iter()', function () {
    it('should return iterator allowing to iterate over the map', function () {
      var v = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3');
      var result = [];
      var iter = v.iter();

      while (iter.hasNext()) {
        result.push(iter.next());
      }

      assert.deepEqual(
        result.sort(function (o1, o2) { return o1.key > o2.key; }),
        [{ key: 'key1', value: 'value1' }, { key: 'key2', value: 'value2' }, { key: 'key3', value: 'value3' }]
      );
    });
  });

  describe('#reduce(f, acc)', function () {
    it('should return acc on empty map', function () {
      var result = Map.reduce(Util.constantly('foo'), 'acc');
      assert.strictEqual(result, 'acc');
    });

    it('should return f(acc, value) on single-element map', function () {
      var reduceFunction = function (acc, value) { return value - acc; };
      var value = 1, acc = 2;
      var result = Map.fill('key', value).reduce(reduceFunction, acc);
      assert.strictEqual(result, reduceFunction(acc, value));
    });

    it('should correctly reduce when node collisions exist', function () {
      var m = Map.fill(
        'AaAa', 2,
        'BBBB', 3,
        'AaBB', 4,
        'key1', 5,
        'key2', 6,
        'key3', 7
      );
      var result = m.reduce(function (acc, value) {
        return acc + value;
      }, 1);
      assert.strictEqual(result, 1 + 2 + 3 + 4 + 5 + 6 + 7);
    });

    it('should correctly reduce multi-element map', function () {
      var m = Map.fill('key1', 2, 'key2', 3, 'key3', 4);
      var result = m.reduce(function (acc, value) { return acc + value; }, 1);
      assert.strictEqual(result, 1 + 2 + 3 + 4);
    });

    it('should pass mapping key as 3rd parameter to f on each iteration', function () {
      var m = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      var result = m.reduce(function (acc, value, key) { acc.push(key); return acc; }, []);
      assert.sameMembers(result, ['key1', 'key2', 'key3']);
    });

    it('should pass original map as 4th parameter to f on each iteration', function () {
      var m = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      var result = m.reduce(function (acc, value, key, originalMap) { acc.push(originalMap); return acc; }, []);
      assert.isTrue(result.every(function (elem) { return elem === m; }));
    });
  });

  describe('#map(f)', function () {
    it('should not change this map', function () {
      var m = Map.fill('key', 1);
      m.map(Util.constantly(2));
      assert.isTrue(m.equals(Map.fill('key', 1)));
    });

    it('should return same map on empty map', function () {
      var initial = Map.fill();
      var updated = initial.map(Util.constantly('foo'));
      assert.strictEqual(initial, updated);
    });

    it('should return map with updated value on single-element map', function () {
      var mapFunction = function (value) { return value + 1; };
      var value = 1;
      var m = Map.fill('key', value).map(mapFunction);
      assert.strictEqual(m.get('key'), mapFunction(value));
    });

    it('should update all values when node collisions exist', function () {
      var mapFunction = function (value) { return value + 1; };
      var m = Map.fill(
        'AaAa', 1,
        'BBBB', 2,
        'AaBB', 3,
        'key1', 4,
        'key2', 5,
        'key3', 6
      );
      assert.isTrue(m.map(mapFunction).equals(Map.fill(
        'AaAa', mapFunction(1),
        'BBBB', mapFunction(2),
        'AaBB', mapFunction(3),
        'key1', mapFunction(4),
        'key2', mapFunction(5),
        'key3', mapFunction(6)
      )));
    });

    it('should update all values in multi-element map', function () {
      var mapFunction = function (value) { return value + 1; };
      var m = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      assert.isTrue(m.map(mapFunction).equals(Map.fill(
        'key1', mapFunction(1),
        'key2', mapFunction(2),
        'key3', mapFunction(3)
      )));
    });

    it('should pass value, key and original map to map function', function () {
      var m = Map.fill('key', 'value');
      m.map(function (value, key, m2) {
        assert.strictEqual(value, 'value');
        assert.strictEqual(m2, m);
      });
    });
  });

  describe('#foreach(f)', function () {
    it('should return undefined', function () {
      var initial = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      var result = initial.foreach(Util.constantly('foo'));
      assert.isUndefined(result);
    });

    it('should execute function for each map element in order', function () {
      var results = [];
      var f = function (value) { results.push(value); };
      var m = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      m.foreach(f);
      assert.deepEqual(results.sort(), [1, 2, 3]);
    });

    it('should pass value, key and original map to side-effecting function', function () {
      var m = Map.fill('key1', 1);
      m.foreach(function (value, key, v2) {
        assert.strictEqual(key, 'key1');
        assert.strictEqual(v2, m);
      });
    });
  });

  describe('#filter(pred)', function () {
    it('should not change this map', function () {
      var m = Map.fill('key', 1);
      m.filter(Util.identity);
      assert.isTrue(m.equals(Map.fill('key', 1)));
    });

    it('should return same map on empty map', function () {
      var initial = Map.fill();
      var updated = initial.filter(Util.identity);
      assert.strictEqual(initial, updated);
    });

    it('should correctly filter single-element map', function () {
      var m = Map.fill('key', 'value');
      assert.isTrue(m.filter(Util.constantly(false)).isEmpty());
      assert.strictEqual(m.filter(Util.identity), m);
    });

    it('should correctly filter map when node collisions exist', function () {
      var m = Map.fill(
        'AaAa', 'value1',
        'BBBB', 'value2',
        'AaBB', 'value3',
        'key1', 'value1',
        'key2', 'value2',
        'key3', 'value3'
      );
      assert.isTrue(m.filter(Util.constantly(false)).isEmpty());
      assert.strictEqual(m.filter(Util.identity), m);
    });

    it('should correctly filter multi-element map', function () {
      var m = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      var result = m.filter(function (value) { return value > 1; });
      assert.isTrue(result.equals(Map.fill('key2', 2, 'key3', 3)));
    });

    it('should return same map if no elements skipped', function () {
      var m = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      assert.strictEqual(m.filter(Util.constantly(true)), m);
    });

    it('should pass value, key and original map to predicate function', function () {
      var m = Map.fill('key', 'value');
      m.filter(function (value, key, m2) {
        assert.strictEqual(value, 'value');
        assert.strictEqual(m2, m);
      });
    });
  });

  describe('#find(pred)', function () {
    it('should return null on empty map', function () {
      assert.isNull(Map.find(Util.identity), null);
    });

    it('should return null if no element satisfying the predicate found', function () {
      var m = Map.fill('key1', 1, 'key2', 2);
      assert.isNull(m.find(function (x) { return x === 0; }), null);
    });

    it('should return value satisfying the predicate on single-element map', function () {
      var m = Map.fill('key1', 1);
      assert.strictEqual(m.find(function (x) { return x === 1; }), 1);
    });

    it('should return value satisfying the predicate when node collisions exist', function () {
      var m = Map.fill(
        'AaAa', 'value1',
        'BBBB', 'value2',
        'AaBB', 'value3',
        'key1', 'value1',
        'key2', 'value2',
        'key3', 'value3'
      );
      assert.strictEqual(m.find(function (x) { return x === 'value3'; }), 'value3');
    });

    it('should return value satisfying the predicate on multi-element map', function () {
      var m = Map.fill('key1', 1, 'key2', 2);
      assert.strictEqual(m.find(function (x) { return x === 2; }), 2);
    });

    it('should pass value, key and original map to predicate function', function () {
      var m = Map.fill('key', 'value');
      m.find(function (value, key, m2) {
        assert.strictEqual(value, 'value');
        assert.strictEqual(m2, m);
      });
    });
  });

  describe('#equals(otherMap)', function () {
    it('should return true when comparing empty map with itself', function () {
      assert.isTrue(Map.equals(Map));
    });

    it('should return true when comparing two empty maps', function () {
      assert.isTrue(Map.equals(Map.fill('key', 'value').dissoc('key')));
    });

    it('should return false when comparing single-element map with empty map', function () {
      var m1 = Map.fill();
      var m2 = Map.fill('key', 'value');
      assert.isFalse(m1.equals(m2));
    });

    it('should return false when comparing non-empty maps of different sizes', function () {
      var m1 = Map.fill('key1', 'value1', 'key2', 'value2');
      var m2 = Map.fill('key', 'value');
      assert.isFalse(m1.equals(m2));
    });

    it('should return true when comparing equal non-empty maps', function () {
      var m1 = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3');
      var m2 = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3');
      assert.isTrue(m1.equals(m2));
    });

    it('should return true when comparing equal non-empty maps when node collisions exist', function () {
      var create = function () {
        return Map.fill(
          'AaAa', 'value1',
          'BBBB', 'value2',
          'AaBB', 'value3',
          'key1', 'value1',
          'key2', 'value2',
          'key3', 'value3'
        );
      };

      var m1 = create();
      var m2 = create();
      assert.isTrue(m1.equals(m2));
    });

    it('should return true when comparing equal maps with 1000 entries inserted in different order', function () {
      var pairs = [];
      for (var i = 0; i < 1000; i++) { pairs.push([TestUtil.genRandomString(), TestUtil.genRandomString()]); }

      var fromPairs = function (pairs) {
        return pairs.reduce(function (acc, pair) { return acc.assoc(pair[0], pair[1]); }, Map);
      };

      var m1 = fromPairs(pairs);
      var m2 = fromPairs(pairs.reverse());
      assert.isTrue(m1.equals(m2));
    });

    it('should return false when comparing non-equal maps with 1001 entries', function () {
      var generateMap = function () {
        var pairs = [];
        for (var i = 0; i < 1000; i++) { pairs.push([TestUtil.genRandomString(), TestUtil.genRandomString()]); }
        return pairs.reduce(function (acc, pair) { return acc.assoc(pair[0], pair[1]); }, Map);
      };

      var m1 = generateMap().assoc('key1', 'value1');
      var m2 = generateMap().assoc('key2', 'value2');
      assert.isFalse(m1.equals(m2));
    });

    it('should check associative values recursively', function () {
      assert.isTrue(Map.fill('key1', Map.fill('key2', 'value2')).equals(Map.fill('key1', Map.fill('key2', 'value2'))));
      assert.isFalse(Map.fill('key1', Map.fill('key2', 'value2')).equals(Map.fill('key1', Map.fill('key2', 'value3'))));
    });

    it('should return false when compared to incompatible types', function () {
      assert.isFalse(Map.fill('key1', 'value1').equals(0));
      assert.isFalse(Map.fill('key1', 'value1').equals(false));
      assert.isFalse(Map.fill('key1', 'value1').equals('foo'));
      assert.isFalse(Map.fill('key1', 'value1').equals({}));
      assert.isFalse(Map.fill('key1', 'value1').equals([]));
      assert.isFalse(Map.fill('key1', 'value1').equals(function () {}));
      assert.isFalse(Map.fill('key1', 'value1').equals(null));
      assert.isFalse(Map.fill('key1', 'value1').equals(undefined));
    });
  });

  describe('#size()', function () {
    it('should return zero on empty map', function () {
      assert.strictEqual(Map.size(), 0);
    });

    it('should return one on single-element map', function () {
      assert.strictEqual(Map.fill('key', 'value').size(), 1);
    });

    it('should return correct size on multi-element map', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3');
      assert.strictEqual(m.size(), 3);
    });

    it('should return correct size when node collisions exist', function () {
      var m = Map.fill(
        'AaAa', 'value1',
        'BBBB', 'value2',
        'AaBB', 'value3',
        'key1', 'value1',
        'key2', 'value2',
        'key3', 'value3'
      );
      assert.strictEqual(m.size(), 6);
    });
  });

  describe('#toString()', function () {
    it('should return {} on empty map', function () {
      assert.strictEqual(Map.toString(), '{}');
    });

    it('should conform to format on single-element map', function () {
      var m = Map.fill('key1', 'value1');
      assert.strictEqual(m.toString(), '{"key1": "value1"}');
    });

    it('should conform to format on multi-element map', function () {
      var m = Map.fill('key1', 'value1', 'key2', false, 'key3', 0, 'key4', [0, 1, 2]);
      assert.strictEqual(m.toString(), '{"key1": "value1", "key2": false, "key3": 0, "key4": [0, 1, 2]}');
    });

    it('should call toString() on values', function () {
      var Value = function (value) {};
      Value.prototype.toString = function () { return '"value as string"'; };

      var m = Map.fill('key', new Value());
      assert.strictEqual(m.toString(), '{"key": "value as string"}');
    });
  });

  describe('#isInstance(obj)', function () {
    it('should return true on map', function () {
      assert.isTrue(Map.isInstance(Map));
      assert.isTrue(Map.isInstance(Map.fill('key1', 'value1', 'key2', 'value2')));
    });

    it('should return false otherwise', function () {
      assert.isFalse(Map.isInstance(0));
      assert.isFalse(Map.isInstance('foo'));
      assert.isFalse(Map.isInstance({}));
      assert.isFalse(Map.isInstance(function () {}));
    });
  });

  describe('#entries()', function () {
    it('should return empty array on empty map', function () {
      assert.deepEqual(Map.entries(), []);
    });

    it('should return [[key, value]] on single-element map', function () {
      assert.deepEqual(Map.fill('key', 'value').entries(), [['key', 'value']]);
    });

    it('should return array of [key, value] arrays on multi-element map', function () {
      var m = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      var order = function (arr) {
        var sortFunction = function (o1, o2) { return o1[0] < o2[0]; };
        return arr.sort(sortFunction);
      };
      assert.deepEqual(order(m.entries()), order([['key1', 1], ['key2', 2], ['key3', 3]]));
    });
  });

  describe('#keys()', function () {
    it('should return empty array on empty map', function () {
      assert.deepEqual(Map.keys(), []);
    });

    it('should return [key] on single-element map', function () {
      assert.deepEqual(Map.fill('key', 'value').keys(), ['key']);
    });

    it('should return array of keys on multi-element map', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3');
      assert.sameMembers(m.keys(), ['key1', 'key2', 'key3']);
    });
  });

  describe('#values()', function () {
    it('should return empty array on empty map', function () {
      assert.deepEqual(Map.values(), []);
    });

    it('should return [value] on single-element map', function () {
      assert.deepEqual(Map.fill('key', 'value').values(), ['value']);
    });

    it('should return array of values on multi-element map', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3');
      assert.sameMembers(m.values(), ['value1', 'value2', 'value3']);
    });

    it('should return duplicate values', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value2');
      assert.sameMembers(m.values(), ['value1', 'value2', 'value2']);
    });
  });

  describe('#fillFromObject(obj)', function () {
    it('should return this map when passed empty object', function () {
      var m1 = Map.fill('key', 'value');
      var m2 = m1.fillFromObject({});
      assert.strictEqual(m1, m2);
    });

    it('should ignore object prototype properties', function () {
      var Cons = function () {};
      Cons.prototype = { key2: 'value2' };

      var obj = new Cons();
      obj.key1 = 'value1';

      var m = Map.fillFromObject(obj);
      assert.strictEqual(m.size(), 1);
      assert.strictEqual(m.get('key1'), 'value1');
      assert.isFalse(m.contains('key2'));
    });

    it('should return map containing all object properties', function () {
      var m = Map.fillFromObject({key1: 'value1', key2: 'value2'});
      assert.strictEqual(m.size(), 2);
      assert.strictEqual(m.get('key1'), 'value1');
      assert.strictEqual(m.get('key2'), 'value2');
    });

    it('should work on non-empty maps', function () {
      var m1 = Map.fillFromObject({key1: 'value1', key2: 'value2', key3: 'value3'});
      var m2 = Map.fillFromObject({key1: 'value1'}).fillFromObject({key2: 'value2', key3: 'value3'});
      assert.strictEqual(m1.get('key1'), m2.get('key1'));
      assert.strictEqual(m1.get('key2'), m2.get('key2'));
      assert.strictEqual(m1.get('key3'), m2.get('key3'));
    });

    it('should support optional mapping function', function () {
      var obj = { key1: 1, key2: 2, key3: 3};
      var f = function (x) { return x + 1; };
      var m = Map.fillFromObject(obj, f);
      assert.isTrue(m.equals(Map.fill('key1', f(1), 'key2', f(2), 'key3', f(3))));
    });
  });

  describe('#toObject()', function () {
    it('should return empty object on empty map', function () {
      assert.deepEqual(Map.toObject(), {});
    });

    it('should return object containing same entries', function () {
      assert.deepEqual(
        Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3').toObject(),
        { key1: 'value1', key2: 'value2', key3: 'value3'}
      );
    });

    it('changing returned object should not affect original map', function () {
      var m = Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3');
      var obj = m.toObject();
      delete obj.key1;
      obj.key4 = 'foo';
      assert.isTrue(m.equals(Map.fill('key1', 'value1', 'key2', 'value2', 'key3', 'value3')));
    });

    it('should support optional mapping function', function () {
      var m = Map.fill('key1', 1, 'key2', 2, 'key3', 3);
      var f = function (x) { return x + 1; };
      var obj = m.toObject(f);
      assert.deepEqual(obj, { key1: f(1), key2: f(2), key3: f(3)});
    });
  });

  describe('#merge(associative)', function () {
    it('should return this if associative is empty', function () {
      var m = Map.fill('key', 'value');
      assert.strictEqual(m.merge(Map), m);
    });

    it('should return associative if map is empty', function () {
      var m = Map.fill('key', 'value');
      assert.strictEqual(Map.merge(m), m);
    });

    it('should correctly merge non-conflicting maps', function () {
      var m1 = Map.fill('key1', 'value1');
      var m2 = Map.fill('key2', 'value2');
      assert.isTrue(m1.merge(m2).equals(Map.fill('key1', 'value1', 'key2', 'value2')));
    });

    it('should replace non-mergeable conflicting values', function () {
      var m1 = Map.fill('key1', 'value1', 'key2', Map);
      var m2 = Map.fill('key1', 'value2', 'key2', 'value2');
      assert.isTrue(m1.merge(m2).equals(Map.fill('key1', 'value2', 'key2', 'value2')));
    });

    it('should work on nested maps', function () {
      var m1 = Map.fill('key1', Map.fill('key1.1', 'value1.1', 'key1.2', 'value1.2'));
      var m2 = Map.fill('key2', Map.fill('key2.1', 'value2.1', 'key2.2', 'value2.2'));
      var result = m1.merge(m2);
      assert.isTrue(result.get('key1').equals(Map.fill('key1.1', 'value1.1', 'key1.2', 'value1.2')));
      assert.isTrue(result.get('key2').equals(Map.fill('key2.1', 'value2.1', 'key2.2', 'value2.2')));
    });

    it('should not create new map when merging a map with itself', function () {
      var m = Map.fill('key1', 'value1');
      assert.strictEqual(m.merge(m), m);
    });
  });

  describe('#makeSafeKey(key)', function () {
    it('should remove dots from key', function () {
      assert.strictEqual(Map.makeSafeKey('a.b.c!@#$%^&*()_+'), 'abc!@#$%^&*()_+');
    });
  });

  describe('scenarios', function () {
    it('assoc/dissoc of 1000 values should produce empty map', function () {
      var keys = [];
      for (var i = 0; i < 1000; i++) { keys.push(TestUtil.genRandomString()); }

      var filled = keys.reduce(function (acc, key) { return acc.assoc(key, TestUtil.genRandomString()); }, Map);
      assert.strictEqual(filled.size(), 1000);
      keys.forEach(function (key) {
        assert.isTrue(filled.contains(key));
      });

      var emptied = keys.reduce(function (acc, key) { return acc.dissoc(key); }, filled);
      assert.isTrue(emptied.isEmpty());
    });
  });

});
