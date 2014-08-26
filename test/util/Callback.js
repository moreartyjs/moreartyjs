/* jshint -W079:true */
var assert = require('chai').assert;
var Morearty = require('../../src/Morearty');
var Imm = require('immutable');
var Map = Imm.Map;
var Binding = require('../../src/Binding')(Imm);
var Callback = require('../../src/util/Callback');

var createEvent;

createEvent = function (value) {
  return { target: { value: value } };
};

describe('Callback', function () {

  describe('#set()', function () {
    it('should return function which will set value on an event', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var cb = Callback.set(b.sub('key'));
      var event = createEvent('foo');
      cb(event);
      assert.strictEqual(b.val('key'), 'foo');
    });

    it('should support optional subpath as a dot-separated string or an array', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 'value' }) }));
      var cb, event;

      cb = Callback.set(b, 'key1.key2');
      event = createEvent('foo');
      cb(event);
      assert.strictEqual(b.val('key1.key2'), 'foo');

      cb = Callback.set(b, ['key1', 'key2']);
      event = createEvent('bar');
      cb(event);
      assert.strictEqual(b.val('key1.key2'), 'bar');
    });

    it('should support optional value transformer', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var cb = Callback.set(b.sub('key'), function (x) { return x + 1; });
      var event = createEvent(2);
      cb(event);
      assert.strictEqual(b.val('key'), 3);
    });
  });

  describe('#delete()', function () {
    it('should return function which will delete value on an event', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var cb = Callback.delete(b.sub('key'));
      var event = createEvent('foo');
      cb(event);
      assert.strictEqual(b.val().length, 0);
    });

    it('should support optional subpath as a dot-separated string or an array', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 'value2', key3: 'value3' }) }));
      var cb, event;

      cb = Callback.delete(b, 'key1.key2');
      event = createEvent('foo');
      cb(event);
      assert.isFalse(b.val().contains('key1.key2'));

      cb = Callback.delete(b, ['key1', 'key3']);
      event = createEvent('bar');
      cb(event);
      assert.isFalse(b.val().contains('key1.key3'));
    });

    it('should support optional predicate which can prevent delete', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var cb = Callback.delete(b.sub('key'), function (x) { return x > 1; });
      var event = createEvent(1);
      cb(event);
      assert.strictEqual(b.val('key'), 'value');
    });
  });

  describe('#onKey(cb, key, shiftKey, ctrlKey)', function () {
    it('should return function from event called if required parameteres match', function () {
      var callbackCalled = false;
      var f = Callback.onKey(function () { callbackCalled = true; }, 'Enter', false, false);
      f({ key: 'Enter', shiftKey: false, ctrlKey: false });
      assert.isTrue(callbackCalled);
    });

    it('function should return false if event parameters matched, true otherwise', function () {
      var f = Callback.onKey(function () {}, 'Enter', false, false);
      assert.isFalse(f({ key: 'Enter', shiftKey: false, ctrlKey: false }));
      assert.isTrue(f({ key: 'Escape', shiftKey: false, ctrlKey: false }));
      assert.isTrue(f({ key: 'Enter', shiftKey: true, ctrlKey: false }));
      assert.isTrue(f({ key: 'Enter', shiftKey: false, ctrlKey: true }));
    });

    it('should accept multiple keys in an array', function () {
      var f = Callback.onKey(function () {}, ['Enter', 'Escape'], false, false);
      assert.isFalse(f({ key: 'Enter', shiftKey: false, ctrlKey: false }));
      assert.isFalse(f({ key: 'Escape', shiftKey: false, ctrlKey: false }));
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
