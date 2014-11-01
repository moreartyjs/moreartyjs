var assert = require('chai').assert;
var Holder = require('../../src/util/Holder');

describe('Holder', function () {

  describe('#init(value)', function () {
    it('should hold supplied value', function () {
      var h = Holder.init('value');
      assert.strictEqual(h.getValue(), 'value');
    });
  });

  describe('#getValue()', function () {
    it('should return supplied value', function () {
      var h = Holder.init('value');
      assert.strictEqual(h.getValue(), 'value');
    });
  });

  describe('#setValue(value)', function () {
    it('should change value being hold', function () {
      var h = Holder.init('value1');
      h.setValue('value2');
      assert.strictEqual(h.getValue(), 'value2');
    });
  });

  describe('#updateValue(update)', function () {
    it('should change value being hold', function () {
      var h = Holder.init(0);
      var updateFunction = function (x) { return x + 1; };
      h.updateValue(updateFunction);
      assert.strictEqual(h.getValue(), updateFunction(0));
    });

    it('should return old value', function () {
      var h = Holder.init(0);
      var updateFunction = function (x) { return x + 1; };
      var oldValue = h.updateValue(updateFunction);
      assert.strictEqual(oldValue, 0);
    });
  });

});
