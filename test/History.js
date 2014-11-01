var assert = require('chai').assert;
var Imm = require('immutable');
var IMap = Imm.Map;
var Util = require('../src/Util');
var Binding = require('../src/Binding');
var History = require('../src/History');

var initHistory = function () {
  var b = Binding.init(IMap({ data: IMap() }), Binding.init(IMap()));
  History.init(b);
  return { data: b, history: b.meta().sub('history') };
};

describe('History', function () {

  describe('#init(binding)', function () {
    it('should init history binding', function () {
      var bs = initHistory();
      var historyVal = bs.history.get();
      assert.isString(historyVal.get('listenerId'));
      assert.isTrue(historyVal.has('undo'));
      assert.isTrue(historyVal.has('redo'));
    });
  });

  describe('#clear(binding)', function () {
    it('should reset history binding value', function () {
      var bs = initHistory();
      bs.data.set('key', 'value');
      assert.isTrue(History.hasUndo(bs.data));
      History.clear(bs.data);
      assert.isFalse(History.hasUndo(bs.data));
    });
  });

  describe('#destroy(binding, options)', function () {
    it('should set binding value to null and remove listener', function () {
      var bs = initHistory();
      assert.isNotNull(bs.history.get());
      History.destroy(bs.data);
      assert.isNull(bs.history.get());
      bs.data.set('key', 'value');
      assert.isNull(bs.history.get());
    });
  });

  describe('#hasUndo(binding)', function () {
    it ('should return false if there is no undo information', function () {
      var bs = initHistory();
      assert.isFalse(History.hasUndo(bs.data));
    });

    it('should return false on empty binding', function () {
      var b = Binding.init(IMap(), Binding.init());
      assert.isFalse(History.hasUndo(b));
    });

    it ('should return true if there is undo information', function () {
      var bs = initHistory();
      bs.data.set('key', 'value');
      assert.isTrue(History.hasUndo(bs.data));
    });
  });

  describe('#hasRedo(binding)', function () {
    it ('should return false if there is no redo information', function () {
      var bs = initHistory();
      assert.isFalse(History.hasRedo(bs.data));
    });

    it('should return false on empty binding', function () {
      var b = Binding.init(IMap(), Binding.init());
      assert.isFalse(History.hasRedo(b));
    });

    it ('should return true if there is redo information', function () {
      var bs = initHistory();
      bs.data.set('key', 'value');
      History.undo(bs.data);
      assert.isTrue(History.hasRedo(bs.data));
    });
  });

  describe('#undo(binding)', function () {
    it('should do nothing and return false if there is no undo information', function () {
      var bs = initHistory();
      var initialData = bs.data.get();
      var result = History.undo(bs.data);
      assert.isFalse(result);
      assert.strictEqual(bs.data.get(), initialData);
    });

    it('should revert to previous state and return true if there is undo information', function () {
      var bs = initHistory();
      bs.data.sub().set('key', 1);
      bs.data.sub().set('key', 2);
      var result = History.undo(bs.data);
      assert.isTrue(result);
      assert.strictEqual(bs.data.get('key'), 1);
    });
  });

  describe('#redo(binding)', function () {
    it('should do nothing and return false if there is no redo information', function () {
      var bs = initHistory();
      var initialData = bs.data.get();
      var result = History.redo(bs.data);
      assert.isFalse(result);
      assert.strictEqual(bs.data.get(), initialData);
    });

    it('should revert to next state and return true if there is redo information', function () {
      var bs = initHistory();
      bs.data.sub().set('key', 1);
      bs.data.sub().set('key', 2);
      History.undo(bs.data, bs.data);
      var result = History.redo(bs.data);
      assert.isTrue(result);
      assert.strictEqual(bs.data.get('key'), 2);
    });
  });

});
