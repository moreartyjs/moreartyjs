var assert = require('chai').assert;
var config = require('../../package.json');
var Morearty = require('../../dist/morearty-' + config.version);
var Map = Morearty.Data.Map;
var Binding = Morearty.Binding;
var Callback = Morearty.Callback;

var createEvent;

createEvent = function (value) {
  return { target: { value: value } };
};

describe('Callback', function () {

  describe('#assoc()', function () {
    it('should return function which will assoc value on an event', function () {
      var b = Binding.init(Map.fill('key', 'value'));
      var cb = Callback.assoc(b.sub('key'));
      var event = createEvent('foo');
      cb(event);
      assert.strictEqual(b.val('key'), 'foo');
    });

    it('should support optional subpath as a dot-separated string or an array', function () {
      var b = Binding.init(Map.fill('key1', Map.fill('key2', 'value')));
      var cb, event;

      cb = Callback.assoc(b, 'key1.key2');
      event = createEvent('foo');
      cb(event);
      assert.strictEqual(b.val('key1.key2'), 'foo');

      cb = Callback.assoc(b, ['key1', 'key2']);
      event = createEvent('bar');
      cb(event);
      assert.strictEqual(b.val('key1.key2'), 'bar');
    });

    it('should support optional value transformer', function () {
      var b = Binding.init(Map.fill('key', 'value'));
      var cb = Callback.assoc(b.sub('key'), function (x) { return x + 1; });
      var event = createEvent(2);
      cb(event);
      assert.strictEqual(b.val('key'), 3);
    });
  });

  describe('#dissoc()', function () {
    it('should return function which will dissoc value on an event', function () {
      var b = Binding.init(Map.fill('key', 'value'));
      var cb = Callback.dissoc(b.sub('key'));
      var event = createEvent('foo');
      cb(event);
      assert.isTrue(b.val().isEmpty());
    });

    it('should support optional subpath as a dot-separated string or an array', function () {
      var b = Binding.init(Map.fill('key1', Map.fill('key2', 'value2'), Map.fill('key3', 'value3')));
      var cb, event;

      cb = Callback.dissoc(b, 'key1.key2');
      event = createEvent('foo');
      cb(event);
      assert.isFalse(b.val().contains('key1.key2'));

      cb = Callback.dissoc(b, ['key1', 'key3']);
      event = createEvent('bar');
      cb(event);
      assert.isFalse(b.val().contains('key1.key3'));
    });

    it('should support optional predicate which can prevent dissoc', function () {
      var b = Binding.init(Map.fill('key', 'value'));
      var cb = Callback.dissoc(b.sub('key'), function (x) { return x > 1; });
      var event = createEvent(1);
      cb(event);
      assert.strictEqual(b.val('key'), 'value');
    });
  });

  describe('#onKey(cb, keyCode, shiftKey, ctrlKey)', function () {
    it('should return function from event called if required parameteres match', function () {
      var callbackCalled = false;
      var f = Callback.onKey(function () { callbackCalled = true; }, 13, false, false);
      f({ charCode: 13, shiftKey: false, ctrlKey: false });
      assert.isTrue(callbackCalled);
    });

    it('function should return false if event parameters matched, true otherwise', function () {
      var f = Callback.onKey(function () {}, 13, false, false);
      assert.isFalse(f({ charCode: 13, shiftKey: false, ctrlKey: false }));
      assert.isTrue(f({ charCode: 27, shiftKey: false, ctrlKey: false }));
      assert.isTrue(f({ charCode: 13, shiftKey: true, ctrlKey: false }));
      assert.isTrue(f({ charCode: 13, shiftKey: false, ctrlKey: true }));
    });
  });

  describe('#onEnter(cb)', function () {
    it('should return function from event called on enter key pressed event', function () {
      var callbackCalled = false;
      var f = Callback.onEnter(function () { callbackCalled = true; });
      f({ charCode: 13, shiftKey: false, ctrlKey: false });
      assert.isTrue(callbackCalled);

      callbackCalled = false;
      f = Callback.onEnter(function () { callbackCalled = true; });
      f({ charCode: 27, shiftKey: false, ctrlKey: false });
      assert.isFalse(callbackCalled);
    });
  });

  describe('#onEscape(cb)', function () {
    it('should return function from event called on enter key pressed event', function () {
      var callbackCalled = false;
      var f = Callback.onEscape(function () { callbackCalled = true; });
      f({ charCode: 27, shiftKey: false, ctrlKey: false });
      assert.isTrue(callbackCalled);

      callbackCalled = false;
      f = Callback.onEscape(function () { callbackCalled = true; });
      f({ charCode: 13, shiftKey: false, ctrlKey: false });
      assert.isFalse(callbackCalled);
    });
  });

});
