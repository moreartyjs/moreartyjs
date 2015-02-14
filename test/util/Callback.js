var assert = require('chai').assert;
var Morearty = require('../../src/Morearty');
var Imm = require('immutable');
var IMap = Imm.Map;
var Binding = require('../../src/Binding');
var Callback = require('../../src/util/Callback');

var createEvent;

createEvent = function (value) {
  return { target: { value: value } };
};

describe('Callback', function () {

  describe('#set()', function () {
    it('should return function which will set value on an event', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var cb = Callback.set(b.sub('key'));
      var event = createEvent('foo');
      cb(event);
      assert.strictEqual(b.get('key'), 'foo');
    });

    it('should support optional subpath as a dot-separated string or an array', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 'value' }) }));
      var cb, event;

      cb = Callback.set(b, 'key1.key2');
      event = createEvent('foo');
      cb(event);
      assert.strictEqual(b.get('key1.key2'), 'foo');

      cb = Callback.set(b, ['key1', 'key2']);
      event = createEvent('bar');
      cb(event);
      assert.strictEqual(b.get('key1.key2'), 'bar');
    });

    it('should support optional value transformer', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var cb = Callback.set(b.sub('key'), function (x) { return x + 1; });
      var event = createEvent(2);
      cb(event);
      assert.strictEqual(b.get('key'), 3);
    });
  });

  describe('#delete', function () {
    it('should strictly equal #remove', function () {
      assert.strictEqual(Callback.remove, Callback['delete']);
    });
  });

  describe('#remove()', function () {
    it('should return function which will delete value on an event', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var cb = Callback.remove(b.sub('key'));
      var event = createEvent('foo');
      cb(event);
      assert.isTrue(b.get().isEmpty());
    });

    it('should support optional subpath as a dot-separated string or an array', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 'value2', key3: 'value3' }) }));
      var cb, event;

      cb = Callback.remove(b, 'key1.key2');
      event = createEvent('foo');
      cb(event);
      assert.isFalse(b.get().contains('key1.key2'));

      cb = Callback.remove(b, ['key1', 'key3']);
      event = createEvent('bar');
      cb(event);
      assert.isFalse(b.get().contains('key1.key3'));
    });

    it('should support optional predicate which can prevent delete', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var cb = Callback.remove(b.sub('key'), function (x) { return x > 1; });
      var event = createEvent(1);
      cb(event);
      assert.strictEqual(b.get('key'), 'value');
    });
  });

  describe('#onKey(cb, key, shiftKey, ctrlKey)', function () {
    it('should return function from event called if required parameters match', function () {
      var callbackCalled = false;
      var f = Callback.onKey(function () { callbackCalled = true; }, 'Enter', false, false);
      f({ key: 'Enter', shiftKey: false, ctrlKey: false });
      assert.isTrue(callbackCalled);
    });

    it('should accept multiple keys in an array', function () {
      var calledTimes = 0;
      var f = Callback.onKey(function () { calledTimes++; }, ['Enter', 'Escape'], false, false);
      f({ key: 'Enter', shiftKey: false, ctrlKey: false });
      f({ key: 'Escape', shiftKey: false, ctrlKey: false });
      assert.strictEqual(calledTimes, 2);
    });
  });

  describe('#onEnter(cb)', function () {
    it('should return function from event called on enter key pressed event', function () {
      var callbackCalled = false;
      var f = Callback.onEnter(function () { callbackCalled = true; });
      f({ key: 'Enter', shiftKey: false, ctrlKey: false });
      assert.isTrue(callbackCalled);

      callbackCalled = false;
      f = Callback.onEnter(function () { callbackCalled = true; });
      f({ key: 'Escape', shiftKey: false, ctrlKey: false });
      assert.isFalse(callbackCalled);
    });
  });

  describe('#onEscape(cb)', function () {
    it('should return function from event called on enter key pressed event', function () {
      var callbackCalled = false;
      var f = Callback.onEscape(function () { callbackCalled = true; });
      f({ key: 'Escape', shiftKey: false, ctrlKey: false });
      assert.isTrue(callbackCalled);

      callbackCalled = false;
      f = Callback.onEscape(function () { callbackCalled = true; });
      f({ key: 'Enter', shiftKey: false, ctrlKey: false });
      assert.isFalse(callbackCalled);
    });
  });

});
