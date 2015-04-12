var assert = require('chai').assert;
var Imm = require('immutable');
var IMap = Imm.Map;
var Binding = require('../src/Binding');
var ChangesDescriptor = require('../src/ChangesDescriptor');

var mkChangesInfo = function (valueChanged, metaChanged) {
  return {
    valueChanged: valueChanged,
    metaChanged: metaChanged || false
  };
};

describe('ChangesDescriptor', function () {

  describe('#getPath()', function () {
    it('should return changed path relative to binding\'s path listener was installed on', function () {
      var changes = new ChangesDescriptor(['a', 'b', 'c'], ['a'], mkChangesInfo(false), {});
      assert.deepEqual(changes.getPath(), ['b', 'c']);
    });
  });

  describe('#isValueChanged()', function () {
    it('should return true if binding\'s value was changed', function () {
      var changes =
        new ChangesDescriptor(['key'], ['key'], mkChangesInfo(true), { previousBackingValue: IMap({ key: 'foo' }) });
      assert.isTrue(changes.isValueChanged());
    });

    it('should return false if value at listener path was changed', function () {
      var initialValue = IMap({ key: 'value' });
      var changes =
        new ChangesDescriptor(['key'], ['key'], mkChangesInfo(false), { previousBackingValue: initialValue });
      assert.isFalse(changes.isValueChanged());
    });
  });

  describe('#isMetaChanged()', function () {
    it('should return true if binding\'s meta value was changed', function () {
      var changes =
        new ChangesDescriptor(
          ['key'], ['key'], mkChangesInfo(false, true), { previousBackingMeta: IMap({ key: 'value' }) });
      assert.isTrue(changes.isMetaChanged());
    });

    it('should return false if previous meta is null', function () {
      var changes = new ChangesDescriptor(['key'], ['key'], mkChangesInfo(false), {});
      assert.isFalse(changes.isMetaChanged());
    });
  });

  describe('#getPreviousValue()', function () {
    it('should return previous value at listening path', function () {
      var initialValue = IMap({ key: 'value' });
      var changes =
        new ChangesDescriptor(['key'], ['key'], mkChangesInfo(true), { previousBackingValue: initialValue });
      assert.strictEqual(changes.getPreviousValue(), 'value');
    });

    it('should return null if previous value is null', function () {
      var changes = new ChangesDescriptor(['key'], ['key'], mkChangesInfo(true), {});
      assert.isNull(changes.getPreviousValue());
    });
  });

  describe('#getPreviousMeta()', function () {
    it('should return previous meta value at listening path', function () {
      var changes =
        new ChangesDescriptor(
          ['key'], ['key'], mkChangesInfo(true), { previousBackingMeta: IMap({ key: IMap({ __meta__: 'value' }) }) });
      assert.strictEqual(changes.getPreviousMeta(), 'value');
    });

    it('should return null if previous meta value is null', function () {
      var changes = new ChangesDescriptor(['key'], ['key'], mkChangesInfo(true), {});
      assert.isNull(changes.getPreviousMeta());
    });
  });

});
