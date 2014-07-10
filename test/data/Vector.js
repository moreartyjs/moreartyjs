var assert = require('chai').assert;
var config = require('../../package.json');
var Morearty = require('../../dist/morearty-' + config.version);
var Vector = Morearty.Data.Vector;
var Util = Morearty.Util;
var TestUtil = require('../TestUtil');

describe('Vector', function () {

  describe('#fill(var_args)', function () {
    it('should return this vector when called with empty arguments list', function () {
      var v = Vector.fill('value1');
      assert.strictEqual(v.fill(), v);
    });

    it('should return vector containing all passed values in order', function () {
      var v = Vector.fill('value1', 'value2', 'value3');
      assert.strictEqual(v.size(), 3);
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), 'value2');
      assert.strictEqual(v.get(2), 'value3');
    });

    it('should concatenate this vector with arguments list preserving order', function () {
      var v = Vector.fill('value1').fill('value2', 'value3');
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), 'value2');
      assert.strictEqual(v.get(2), 'value3');
    });
  });

  describe('#isEmpty()', function () {
    it('should return true on empty vector', function () {
      assert.strictEqual(Vector.isEmpty(), true);
    });

    it('should return false on non-empty vector', function () {
      var v = Vector.fill('value');
      assert.strictEqual(v.isEmpty(), false);
    });
  });

  describe('#get(index)', function () {
    it('should return null on empty vector', function () {
      assert.strictEqual(Vector.get(0), null);
    });

    it('should return correct value on multi-element vector', function () {
      var v = Vector.fill('value1', 'value2');
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), 'value2');
    });

    it('should return null if index is out of range', function () {
      var v = Vector.fill('value');
      assert.strictEqual(v.get(1), null);
    });

    it('should work with string and numeric indices', function () {
      var v = Vector.fill('value1');
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get('0'), 'value1');
    });

    it('should work on \'falsy\' values', function () {
      var v = Vector.fill(0, '', false);
      assert.strictEqual(v.get(0), 0);
      assert.strictEqual(v.get(1), '');
      assert.strictEqual(v.get(2), false);
    });
  });

  describe('#getIn(path)', function () {
    it('should return null on empty vector', function () {
      assert.strictEqual(Vector.getIn([0]), null);
    });

    it('should return this on empty path', function () {
      var v = Vector.fill('value');
      assert.strictEqual(v.getIn([]), v);
    });

    it('should return null on non-existent path', function () {
      var v = Vector.fill(Vector.fill('value1'));
      assert.strictEqual(v.getIn([0, 1]), null);
      assert.strictEqual(v.getIn([0, 0, 0]), null);
    });

    it('should return correct nested value', function () {
      var v = Vector.fill(Vector.fill('value1'));
      assert.strictEqual(v.getIn([0, 0]), 'value1');
    });
  });

  describe('#contains(index)', function () {
    it('should return false on empty vector', function () {
      assert.isFalse(Vector.contains(0));
    });

    it('should return true if index is present', function () {
      var v = Vector.fill('value');
      assert.isTrue(v.contains(0));
    });

    it('should return false if index is out of range', function () {
      var v = Vector.fill('value');
      assert.isFalse(v.contains(1));
    });

    it('should work on \'falsy\' values', function () {
      var v = Vector.fill(0, '', false);
      assert.isTrue(v.contains(0));
      assert.isTrue(v.contains(1));
      assert.isTrue(v.contains(2));
    });
  });

  describe('#update(index, f)', function () {
    it('should not change this vector', function () {
      var v = Vector.fill(1);
      v.update(0, Util.constantly(2));
      assert.isTrue(v.equals(Vector.fill(1)));
    });

    it('should add new value if index is out of range', function () {
      var v = Vector.update(0, Util.constantly('value'));
      assert.strictEqual(v.get(0), 'value');
    });

    it('should fill blanks with null values', function () {
      var v = Vector.fill('value1').update(3, Util.constantly('value4'));
      assert.strictEqual(v.size(), 4);
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), null);
      assert.strictEqual(v.get(2), null);
      assert.strictEqual(v.get(3), 'value4');
    });

    it('should update existing value with a function', function () {
      var updateFunction = function (x) { return x + 1; };
      var v = Vector.fill(1).update(0, updateFunction);
      assert.strictEqual(v.get(0), updateFunction(1));
    });

    it('should return this vector if value isn\'t changed', function () {
      var updateFunction = function (x) { return x; };
      var v1 = Vector.fill('value');
      var v2 = v1.update(0, updateFunction);
      assert.strictEqual(v1, v2);
    });
  });

  describe('#updateIfExists(index, f)', function () {
    it('should not change this vector', function () {
      var v = Vector.fill(1);
      v.updateIfExists(0, Util.constantly(2));
      assert.isTrue(v.equals(Vector.fill(1)));
    });

    it('should return empty vector when updating empty vector', function () {
      var v = Vector.updateIfExists(0, Util.constantly('value'));
      assert.isTrue(v.isEmpty());
    });

    it('should update existing value with a function', function () {
      var updateFunction = function (x) { return x + 1; };
      var v = Vector.fill(1).updateIfExists(0, updateFunction);
      assert.strictEqual(v.get(0), updateFunction(1));
    });

    it('should return this vector if value isn\'t changed', function () {
      var updateFunction = function (x) { return x; };
      var v1 = Vector.fill('value');
      var v2 = v1.updateIfExists(0, updateFunction);
      assert.strictEqual(v1, v2);
    });
  });

  describe('#updateIn(path, f)', function () {
    it('should not change this vector', function () {
      var v = Vector.fill('value');
      v.updateIn([0], Util.constantly('foo'));
      assert.isTrue(v.equals(Vector.fill('value')));
    });

    it('should return empty vector when updating empty vector', function () {
      var v = Vector.updateIn([0, 1, 2, 3], Util.constantly('value'));
      assert.isTrue(v.isEmpty());
    });

    it('should update existing value with a function', function () {
      var updateFunction = function (x) { return x + 1; };
      var v = Vector.fill(Vector.fill('value1', Vector.fill(0))).updateIn([0, 1, 0], updateFunction);
      assert.strictEqual(v.getIn([0, 1, 0]), updateFunction(0));
    });

    it('should add new value if key is missing', function () {
      var v = Vector.fill(Vector).updateIn([0, 0], Util.constantly('value'));
      assert.isTrue(v.equals(Vector.fill(Vector.fill('value'))));
    });

    it('should return this vector if value isn\'t changed', function () {
      var v1 = Vector.fill(Vector.fill('value1', Vector.fill(0)));
      var v2 = v1.updateIn([0, 1, 0], Util.identity);
      assert.strictEqual(v1, v2);
    });
  });

  describe('#assoc(index, value)', function () {
    it('should not change this vector', function () {
      var v = Vector.fill(1);
      v.assoc(0, 2);
      assert.isTrue(v.equals(Vector.fill(1)));
    });

    it('should assoc empty vector', function () {
      var v = Vector.assoc(0, 'value');
      assert.strictEqual(v.get(0), 'value');
    });

    it('should assoc single-element vector', function () {
      var v = Vector.fill('value1').assoc(1, 'value2');
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), 'value2');
    });

    it('should replace existing value on single-element vector', function () {
      var v = Vector.fill('value').assoc(0, 'value2');
      assert.strictEqual(v.get(0), 'value2');
    });

    it('should assoc two values with different indices', function () {
      var v = Vector.assoc(0, 'value1').assoc(1, 'value2');
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), 'value2');
    });

    it('should fill blanks with null values', function () {
      var v = Vector.fill('value1').assoc(3, 'value4');
      assert.strictEqual(v.size(), 4);
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), null);
      assert.strictEqual(v.get(2), null);
      assert.strictEqual(v.get(3), 'value4');
    });
  });

  describe('#dissoc(index)', function () {
    it('should not change this vector', function () {
      var v = Vector.fill(1);
      v.dissoc(0);
      assert.isTrue(v.equals(Vector.fill(1)));
    });

    it('should dissoc empty vector', function () {
      var v = Vector.dissoc(0);
      assert.isTrue(v.isEmpty());
    });

    it('should dissoc single-element vector', function () {
      var v = Vector.fill('value').dissoc(0);
      assert.isTrue(v.isEmpty());
    });

    it('should return this vector if index is out of range', function () {
      var v = Vector.fill('value');
      assert.strictEqual(v.dissoc(1), v);
    });

    it('should dissoc multi-element vector shrinking indices', function () {
      var v = Vector.fill('value1', 'value2', 'value3', 'value4').dissoc(0).dissoc(3);
      assert.strictEqual(v.get(0), 'value2');
      assert.strictEqual(v.get(1), 'value3');
    });
  });

  describe('#dissocIn(path)', function () {
    it('should not change this vector', function () {
      var v = Vector.fill('value');
      v.dissocIn([0]);
      assert.isTrue(v.equals(Vector.fill('value')));
    });

    it('should return this vector on non-existent path', function () {
      var v = Vector.fill('value');
      assert.strictEqual(v.dissocIn([1]), v);
    });

    it('should correctly dissoc nested value', function () {
      var v = Vector.fill(Vector.fill('value1'));
      assert.strictEqual(v.getIn([0, 0]), 'value1');
      assert.strictEqual(v.dissocIn([0, 0]).getIn([0, 0]), null);
    });
  });

  describe('#join(anotherVector)', function () {
    it('should not change this vector and another vector', function () {
      var v1 = Vector.fill('value1');
      var v2 = Vector.fill('value2');
      v1.join(v2);
      assert.isTrue(v1.equals(Vector.fill('value1')));
      assert.isTrue(v2.equals(Vector.fill('value2')));
    });

    it('should return this vector if another vector is empty', function () {
      var v = Vector.fill('value1');
      assert.strictEqual(v.join(Vector), v);
    });

    it('should return another vector if this vector is empty', function () {
      var v = Vector.fill('value1');
      assert.strictEqual(Vector.join(v), v);
    });

    it('should return vector containing this vector elements followed by another vector elements', function () {
      var v1 = Vector.fill('value1');
      var v2 = Vector.fill('value2');
      var result = v1.join(v2);
      assert.isTrue(result.equals(Vector.fill('value1', 'value2')));
    });
  });

  describe('#reduce(f, acc)', function () {
    it('should return acc on empty vector', function () {
      var result = Vector.reduce(Util.constantly('foo'), 'acc');
      assert.strictEqual(result, 'acc');
    });

    it('should return f(acc, value) on single-element vector', function () {
      var reduceFunction = function (acc, value) { return value - acc; };
      var value = 1, acc = 2;
      var result = Vector.fill(value).reduce(reduceFunction, acc);
      assert.strictEqual(result, reduceFunction(acc, value));
    });

    it('should visit all values in order in multi-element vector', function () {
      var v = Vector.fill(2, 3, 4);
      var result = v.reduce(function (acc, value) { return acc + value; }, 1);
      assert.strictEqual(result, 1 + 2 + 3 + 4);
    });

    it('should pass index as 3rd parameter to f on each iteration', function () {
      var v = Vector.fill(1, 2, 3);
      var result = v.reduce(function (acc, value, index) { acc.push(index); return acc; }, []);
      assert.deepEqual(result, [0, 1, 2]);
    });

    it('should pass original vector as 4th parameter to f on each iteration', function () {
      var v = Vector.fill(1, 2, 3);
      var result = v.reduce(function (acc, value, index, originalVector) { acc.push(originalVector); return acc; }, []);
      assert.isTrue(result.every(function (elem) { return elem === v; }));
    });
  });

  describe('#map(f)', function () {
    it('should not change this vector', function () {
      var v = Vector.fill(1);
      v.map(Util.constantly(2));
      assert.isTrue(v.equals(Vector.fill(1)));
    });

    it('should return same vector on empty vector', function () {
      var initial = Vector.fill();
      var updated = initial.map(Util.constantly('foo'));
      assert.strictEqual(initial, updated);
    });

    it('should update all values in multi-element vector', function () {
      var mapFunction = function (value) { return value + 1; };
      var v = Vector.fill(1, 2, 3);
      var result = v.map(mapFunction);
      assert.strictEqual(result.get(0), mapFunction(1));
      assert.strictEqual(result.get(1), mapFunction(2));
      assert.strictEqual(result.get(2), mapFunction(3));
    });

    it('should pass value, index and original vector to map function', function () {
      var v = Vector.fill(1);
      v.map(function (value, index, v2) {
        assert.strictEqual(index, 0);
        assert.strictEqual(v2, v);
        return true;
      });
    });
  });

  describe('#foreach(f)', function () {
    it('should return undefined', function () {
      var initial = Vector.fill(1, 2, 3);
      var result = initial.foreach(Util.constantly('foo'));
      assert.isUndefined(result);
    });

    it('should execute function for each vector element in order', function () {
      var results = [];
      var f = function (value) { results.push(value); };
      var v = Vector.fill(1, 2, 3);
      v.foreach(f);
      assert.deepEqual(results, [1, 2, 3]);
    });

    it('should pass value, index and original vector to side-effecting function', function () {
      var v = Vector.fill(1);
      v.foreach(function (value, index, v2) {
        assert.strictEqual(index, 0);
        assert.strictEqual(v2, v);
      });
    });
  });

  describe('#filter(pred)', function () {
    it('should not change this vector', function () {
      var v = Vector.fill(1);
      v.filter(Util.identity);
      assert.isTrue(v.equals(Vector.fill(1)));
    });

    it('should return same vector on empty vector', function () {
      var initial = Vector;
      var updated = initial.filter(Util.identity);
      assert.strictEqual(initial, updated);
    });

    it('should skip values not satisfying the predicate', function () {
      var v = Vector.fill(1, 2, 3);
      var result = v.filter(function (value) { return value > 1; });
      assert.isTrue(result.equals(Vector.fill(2, 3)));
    });

    it('should return same vector if no elements skipped', function () {
      var v = Vector.fill(1, 2, 3);
      assert.strictEqual(v.filter(Util.constantly(true)), v);
    });

    it('should pass value, index and original vector to predicate function', function () {
      var v = Vector.fill(1);
      v.filter(function (value, index, v2) {
        assert.strictEqual(index, 0);
        assert.strictEqual(v2, v);
        return true;
      });
    });
  });

  describe('#find(pred)', function () {
    it('should return null on empty vector', function () {
      assert.strictEqual(Vector.find(Util.identity), null);
    });

    it('should return null if no element satisfying the predicate found', function () {
      var v = Vector.fill(1, 2, 3);
      assert.isNull(v.find(function (value) { return value === 0; }));
    });

    it('should return value satisfying the predicate if found', function () {
      var v = Vector.fill(1, 2, 3);
      assert.strictEqual(v.find(function (value) { return value > 1; }), 2);
    });

    it('should pass value, index and original vector to predicate function', function () {
      var v = Vector.fill(1);
      v.find(function (value, index, v2) {
        assert.strictEqual(index, 0);
        assert.strictEqual(v2, v);
        return true;
      });
    });
  });

  describe('#equals(otherVector)', function () {
    it('should return true when comparing empty vector with itself', function () {
      assert.isTrue(Vector.equals(Vector));
    });

    it('should return true when comparing two empty vectors', function () {
      assert.isTrue(Vector.equals(Vector.fill('value').dissoc(0)));
    });

    it('should return false when comparing single-element vector with empty vector', function () {
      var v1 = Vector;
      var v2 = Vector.fill('value');
      assert.isFalse(v1.equals(v2));
    });

    it('should return false when comparing non-empty vectors of different sizes', function () {
      var v1 = Vector.fill('value1', 'value2');
      var v2 = Vector.fill('value');
      assert.isFalse(v1.equals(v2));
    });

    it('should return true when comparing equal non-empty vectors', function () {
      var v1 = Vector.fill('value1', 'value2', 'value3');
      var v2 = Vector.fill('value1', 'value2', 'value3');
      assert.isTrue(v1.equals(v2));
    });

    it('should return false when comparing vectors with same 1000 elements appended in different order', function () {
      var elems = [];
      for (var i = 0; i < 1000; i++) { elems.push(TestUtil.genRandomString()); }

      var fromElems = function (elems) {
        return elems.reduce(function (vector, elem) { return vector.append(elem); }, Vector);
      };

      var v1 = fromElems(elems);
      var v2 = fromElems(elems.reverse());
      assert.isFalse(v1.equals(v2));
    });

    it('should check associative values recursively', function () {
      assert.isTrue(Vector.fill('value1', Vector.fill('value2')).equals(Vector.fill('value1', Vector.fill('value2'))));
      assert.isFalse(Vector.fill('value1', Vector.fill('value2')).equals(Vector.fill('value1', Vector.fill('value3'))));
    });

    it('should return false when compared to incompatible types', function () {
      assert.isFalse(Vector.fill('value1').equals(0));
      assert.isFalse(Vector.fill('value1').equals(false));
      assert.isFalse(Vector.fill('value1').equals('foo'));
      assert.isFalse(Vector.fill('value1').equals({}));
      assert.isFalse(Vector.fill('value1').equals([]));
      assert.isFalse(Vector.fill('value1').equals(function () {}));
      assert.isFalse(Vector.fill('value1').equals(null));
      assert.isFalse(Vector.fill('value1').equals(undefined));
    });
  });

  describe('#size()', function () {
    it('should return zero on empty vector', function () {
      assert.strictEqual(Vector.size(), 0);
    });

    it('should return correct size of multi-element vector', function () {
      assert.strictEqual(Vector.fill('value').size(), 1);
      assert.strictEqual(Vector.fill('value1', 'value2', 'value3').size(), 3);
    });
  });

  describe('#toString()', function () {
    it('should return [] on empty vector', function () {
      assert.strictEqual(Vector.toString(), '[]');
    });

    it('should conform to format on single-element vector', function () {
      var v = Vector.fill('value1');
      assert.strictEqual(v.toString(), '["value1"]');
    });

    it('should conform to format on multi-element vector', function () {
      var v = Vector.fill('value1', false, 0, [0, 1, 2]);
      assert.strictEqual(v.toString(), '["value1", false, 0, [0, 1, 2]]');
    });

    it('should call toString() on values', function () {
      var Value = function (value) {};
      Value.prototype.toString = function () { return '"value as string"'; };

      var v = Vector.fill(new Value());
      assert.strictEqual(v.toString(), '["value as string"]');
    });
  });

  describe('#isInstance(obj)', function () {
    it('should return true on vector', function () {
      assert.isTrue(Vector.isInstance(Vector));
      assert.isTrue(Vector.isInstance(Vector.fill('value1', 'value2')));
    });

    it('should return false otherwise', function () {
      assert.isFalse(Vector.isInstance(0));
      assert.isFalse(Vector.isInstance('foo'));
      assert.isFalse(Vector.isInstance({}));
      assert.isFalse(Vector.isInstance(function () {}));
    });
  });

  describe('#insertAt(index, value)', function () {
    it('should insert into empty vector', function () {
      assert.isTrue(Vector.insertAt(0, 'value').equals(Vector.fill('value')));
    });

    it('should fill blanks with null values', function () {
      var v = Vector.fill('value1').insertAt(3, 'value4');
      assert.strictEqual(v.size(), 4);
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), null);
      assert.strictEqual(v.get(2), null);
      assert.strictEqual(v.get(3), 'value4');
    });

    it('should increment following elements indices by one', function () {
      var v = Vector.fill('value1', 'value3', 'value4').insertAt(1, 'value2');
      assert.strictEqual(v.size(), 4);
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), 'value2');
      assert.strictEqual(v.get(2), 'value3');
      assert.strictEqual(v.get(3), 'value4');
    });
  });

  describe('#prepend(value)', function () {
    it('should prepend to empty vector', function () {
      assert.isTrue(Vector.prepend('value').equals(Vector.fill('value')));
    });

    it('should increment existing elements indices by one', function () {
      var v = Vector.fill('value2', 'value3', 'value4').prepend('value1');
      assert.strictEqual(v.size(), 4);
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), 'value2');
      assert.strictEqual(v.get(2), 'value3');
      assert.strictEqual(v.get(3), 'value4');
    });
  });

  describe('#append(value)', function () {
    it('should append to empty vector', function () {
      assert.isTrue(Vector.append('value').equals(Vector.fill('value')));
    });

    it('should append to non-empty vector', function () {
      assert.isTrue(Vector.fill('value1').append('value2').equals(Vector.fill('value1', 'value2')));
    });
  });

  describe('#fillFromArray(arr)', function () {
    it('should return this vector when passed empty array', function () {
      var v1 = Vector.fill('value');
      var v2 = v1.fillFromArray([]);
      assert.strictEqual(v1, v2);
    });

    it('should return vector containing all array elements in order', function () {
      var v = Vector.fillFromArray(['value1', 'value2']);
      assert.strictEqual(v.size(), 2);
      assert.strictEqual(v.get(0), 'value1');
      assert.strictEqual(v.get(1), 'value2');
    });

    it('should work on non-empty vectors', function () {
      var v1 = Vector.fillFromArray(['value1', 'value2', 'value3']);
      var v2 = Vector.fillFromArray(['value1']).fillFromArray(['value2', 'value3']);
      assert.strictEqual(v1.get(0), v2.get(0));
      assert.strictEqual(v1.get(1), v2.get(1));
      assert.strictEqual(v1.get(2), v2.get(2));
    });

    it('should support optional mapping function', function () {
      var arr = [1, 2, 3];
      var f = function (x) { return x + 1; };
      var v = Vector.fillFromArray(arr, f);
      assert.isTrue(v.equals(Vector.fill(f(1), f(2), f(3))));
    });
  });

  describe('#toArray()', function () {
    it('should return empty array on empty vector', function () {
      assert.deepEqual(Vector.toArray(), []);
    });

    it('should return array containing same elements in same order', function () {
      assert.deepEqual(
        Vector.fill('value1', 'value2', 'value3').toArray(),
        ['value1', 'value2', 'value3']
      );
    });

    it('changing returned array should not affect original vector', function () {
      var v = Vector.fill('value1', 'value2', 'value3');
      var arr = v.toArray();
      arr.push('value4');
      arr[0] = 'foo';
      assert.isTrue(v.equals(Vector.fill('value1', 'value2', 'value3')));
    });

    it('should support optional mapping function', function () {
      var v = Vector.fill(1, 2, 3);
      var f = function (x) { return x + 1; };
      var arr = v.toArray(f);
      assert.deepEqual(arr, [f(1), f(2), f(3)]);
    });
  });

  describe('scenarios', function () {
    it('append/dissoc of 1000 values should produce empty vector', function () {
      var i, elems = [];
      for (i = 0; i < 1000; i++) { elems.push(TestUtil.genRandomString()); }

      var filled = elems.reduce(function (acc, key) { return acc.append(key, TestUtil.genRandomString()); }, Vector);
      assert.strictEqual(filled.size(), 1000);

      var emptied = filled;
      for (i = 1000; i > -1; --i) emptied = emptied.dissoc(i);
      assert.isTrue(emptied.isEmpty());
    });
  });

});
