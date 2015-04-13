var assert = require('chai').assert;
var Imm = require('immutable');
var IMap = Imm.Map;
var Binding = require('../src/Binding');
var ChangesDescriptor = require('../src/ChangesDescriptor');

describe('ChangesDescriptor', function () {

  describe('#getPath()', function () {
    it('should return changed path relative to binding\'s path listener was installed on', function () {
      var changes = new ChangesDescriptor(['a', 'b', 'c'], ['a'], false, false, {});
      assert.deepEqual(changes.getPath(), ['b', 'c']);
    });
  });

  describe('#isValueChanged()', function () {
    it('should return true if binding\'s value was changed', function () {
      var changes =
        new ChangesDescriptor(['key'], ['key'], true, false, { previousBackingValue: IMap({ key: 'foo' }) });
      assert.isTrue(changes.isValueChanged());
    });

    it('should return false if value at listener path was changed', function () {
      var initialValue = IMap({ key: 'value' });
      var changes =
        new ChangesDescriptor(['key'], ['key'], false, false, { previousBackingValue: initialValue });
      assert.isFalse(changes.isValueChanged());
    });
  });

  describe('#isMetaChanged()', function () {
    it('should return true if binding\'s meta value was changed', function () {
      var changes =
        new ChangesDescriptor(
          ['key'], ['key'], false, true, { previousBackingMeta: IMap({ key: 'value' }) });
      assert.isTrue(changes.isMetaChanged());
    });

    it('should return false if previous meta is null', function () {
      var changes = new ChangesDescriptor(['key'], ['key'], false, false, {});
      assert.isFalse(changes.isMetaChanged());
    });
  });

  describe('#getCurrentValue()', function () {
    it('should return current value at listening path', function () {
      var initialValue = IMap({ key: 'value' });
      var changes =
        new ChangesDescriptor(['key'], ['key'], true, false, { currentBackingValue: initialValue });
      assert.strictEqual(changes.getCurrentValue(), 'value');
    });
  });

  describe('#getPreviousValue()', function () {
    it('should return previous value at listening path', function () {
      var initialValue = IMap({ key: 'value' });
      var changes =
        new ChangesDescriptor(['key'], ['key'], true, false, { previousBackingValue: initialValue });
      assert.strictEqual(changes.getPreviousValue(), 'value');
    });
  });

  describe('#getPreviousMeta()', function () {
    it('should return previous meta value at listening path', function () {
      var changes =
        new ChangesDescriptor(
          ['key'], ['key'], true, false, { previousBackingMeta: IMap({ key: IMap({ __meta__: 'value' }) }) });
      assert.strictEqual(changes.getPreviousMeta(), 'value');
    });

    it('should return null if previous meta value is null', function () {
      var changes = new ChangesDescriptor(['key'], ['key'], true, false, {});
      assert.isNull(changes.getPreviousMeta());
    });
  });

  describe('#getCurrentMeta()', function () {
    it('should return previous meta value at listening path', function () {
      var changes =
        new ChangesDescriptor(
          ['key'], ['key'], true, false, { currentBackingMeta: IMap({ key: IMap({ __meta__: 'value' }) }) });
      assert.strictEqual(changes.getCurrentMeta(), 'value');
    });

    it('should return null if previous meta value is null', function () {
      var changes = new ChangesDescriptor(['key'], ['key'], true, false, {});
      assert.isNull(changes.getCurrentMeta());
    });
  });

});
