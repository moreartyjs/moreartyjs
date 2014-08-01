var assert = require('chai').assert;
var Imm = require('immutable');
var Map = Imm.Map;
var Vector = Imm.Vector;
var Util = require('../dist/umd/Util');
var Binding = require('../dist/umd/Binding');

describe('Binding', function () {

  describe('#init(backingValue)', function () {
    it('should return binding with passed backing value', function () {
      var backingValue = Map({ key: 'value' });
      var b = Binding.init(backingValue);
      assert.strictEqual(b.val(), backingValue);
    });

    it('should not inherit existing listeners', function () {
      var b1 = Binding.init(Map({ key: 'value' }));
      var listenerCalled = 0;
      b1.addListener('', function () { listenerCalled++; });
      var b2 = b1.init(Map({ key: 'value' }));
      b2.set('key', 'value2');
      assert.strictEqual(listenerCalled, 0);
    });
  });

  describe('#withBackingValue(newBackingValue)', function () {
    it('should return binding with passed backing value', function () {
      var newBackingValue = Map({ key: 'value' });
      var b = Binding.withBackingValue(newBackingValue);
      assert.strictEqual(b.val(), newBackingValue);
    });

    it('should inherit existing listeners', function () {
      var b1 = Binding.init(Map({ key: 'value' }));
      var listenerCalled = 0;
      b1.addListener('', function () { listenerCalled++; });
      var b2 = b1.withBackingValue(Map({ key: 'value' }));
      b2.set('key', 'value2');
      assert.strictEqual(listenerCalled, 1);
    });
  });

  describe('#setBackingValue(newBackingValue, notifyListeners)', function () {
    it('should replace backing value', function () {
      var b = Binding.init(Map({ key1: 'value1' }));
      var newBackingValue = Map({ key2: 'value2' });
      b.setBackingValue(newBackingValue);
      assert.isTrue(b.val().equals(newBackingValue));
    });

    it('should notify listeners by default', function () {
      var b = Binding.init(Map({ key1: 'value1' }));

      var globalListenerCalled = false, listenerCalled = false;
      b.addGlobalListener(function () { globalListenerCalled = true; });
      b.addListener('key1', function () { listenerCalled = true; });

      var newBackingValue = Map({ key2: 'value2' });
      b.setBackingValue(newBackingValue);

      assert.isTrue(globalListenerCalled);
      assert.isTrue(listenerCalled);
    });

    it('should not notify listeners if notifyListeners argument is false', function () {
      var b = Binding.init(Map({ key1: 'value1' }));

      var globalListenerCalled = false, listenerCalled = false;
      b.addGlobalListener(function () { globalListenerCalled = true; });
      b.addListener('key1', function () { listenerCalled = true; });

      var newBackingValue = Map({ key2: 'value2' });
      b.setBackingValue(newBackingValue, false);

      assert.isFalse(globalListenerCalled);
      assert.isFalse(listenerCalled);
    });
  });

  describe('#val(subpath)', function () {
    it('should return backing value value on empty subpath', function () {
      var backingValue = Map({ key1: 'value1' });
      var b = Binding.init(backingValue);
      assert.strictEqual(b.val(), backingValue);
    });

    it('should return undefined on non-existent subpath', function () {
      var b = Binding.init(Map({ key1: 'value1' }));
      assert.isUndefined(b.val('missing'));
    });

    it('should return value at subpath', function () {
      var b = Binding.init(Map({ key1: Map({ key2: Vector('value1') }) }));
      assert.strictEqual(b.val('key1.key2.0'), 'value1');
    });

    it('should accept subpath as a string or an array', function () {
      var b = Binding.init(Map({ key1: Map({ key2: Vector('value1') }) }));
      assert.strictEqual(b.val('key1.key2.0'), 'value1');
      assert.strictEqual(b.val(['key1', 'key2', 0]), 'value1');
    });
  });

  describe('#sub(subpath)', function () {
    it('should share same backing value', function () {
      var backingValue = Map({ key1: 'value1' });
      var b1 = Binding.init(backingValue);
      var b2 = b1.sub('');
      assert.strictEqual(b1.val(), b2.val());
    });

    it('should share listeners', function () {
      var b1 = Binding.init(Map({ key1: Map({ key2: 'value2', key3: 'value3' }) }));
      var b1ListenerCalled = 0;
      b1.addListener('key1.key2', function () { b1ListenerCalled++; });

      var b2 = b1.sub('key1');
      var b2ListenerCalled = 0;
      b2.addListener('key3', function () { b2ListenerCalled++; });

      b2.set('key2', 'foo');
      assert.strictEqual(b1ListenerCalled, 1);
      assert.strictEqual(b2ListenerCalled, 0);

      b1.set('key1.key3', 'foo');
      assert.strictEqual(b1ListenerCalled, 1);
      assert.strictEqual(b2ListenerCalled, 1);
    });

    it('should change the meaning of val()', function () {
      var b = Binding.init(Map({ key1: Vector('value1') })).sub('key1.0');
      assert.strictEqual(b.val(), 'value1');
    });

    it('should accept subpath as a string or an array', function () {
      var b = Binding.init(Map({ key1: Vector('value1') }));
      var b1 = b.sub('key1.0');
      var b2 = b.sub(['key1', 0]);
      assert.strictEqual(b1.val(), 'value1');
      assert.strictEqual(b2.val(), 'value1');
    });
  });

  describe('#update(update, subpath)', function () {
    it('should do nothing on non-existent subpath', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.val();
      b.update('non.existent', Util.constantly('foo'));
      assert.strictEqual(b.val(), originalValue);
    });

    it('should do nothing if value isn\'t changed', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.val();
      b.update('key1.key2', Util.identity);
      assert.strictEqual(b.val(), originalValue);
    });

    it('should update value at subpath', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var updateFunction = function (x) { return x + 1; };
      b.update('key1.key2', updateFunction);
      assert.strictEqual(b.val('key1.key2'), updateFunction(0));
    });

    it('can omit subpath if sub-binding already points to a key', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      var updateFunction = function (x) { return x + 1; };
      sub.update(updateFunction);
      assert.strictEqual(b.val('key1.key2'), updateFunction(0));
    });

    it('should accept subpath as a string or an array', function () {
      var updateFunction = function (x) { return x + 1; };

      var b1 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b1.update('key1.key2', updateFunction);

      var b2 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b2.update(['key1', 'key2'], updateFunction);

      assert.strictEqual(b1.val('key1.key2'), updateFunction(0));
      assert.strictEqual(b2.val('key1.key2'), updateFunction(0));
    });

    it('should notify listeners if value is changed', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerArgs = [];
      b.addListener('key1.key2', function (newValue, oldValue, absolutePath, relativePath) {
        listenerArgs = [newValue, oldValue, absolutePath, relativePath];
      });
      b.update('key1.key2', function (x) { return x + 1; });
      assert.deepEqual(listenerArgs, [1, 0, 'key1.key2', '']);
    });

    it('should not notify listeners if value isn\'t changed', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerCalled = 0;
      b.addListener('key1.key2', function () { listenerCalled++; });
      b.update('key1.key2', Util.identity);
      assert.strictEqual(listenerCalled, 0);
    });
  });

  describe('#set(newValue, subpath)', function () {
    it('should do nothing on non-existent subpath', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.val();
      b.set('non.existent', 'foo');
      assert.strictEqual(b.val(), originalValue);
    });

    it('should do nothing if value isn\'t changed', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.val();
      b.set('key1.key2', 0);
      assert.strictEqual(b.val(), originalValue);
    });

    it('should set new value at subpath', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b.set('key1.key2', 1);
      assert.strictEqual(b.val('key1.key2'), 1);
    });

    it('can omit subpath if sub-binding already points to a key', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.set(1);
      assert.strictEqual(b.val('key1.key2'), 1);
    });

    it('should accept subpath as a string or an array', function () {
      var b1 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b1.set('key1.key2', 1);

      var b2 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b2.set(['key1', 'key2'], 1);

      assert.strictEqual(b1.val('key1.key2'), 1);
      assert.strictEqual(b2.val('key1.key2'), 1);
    });

    it('should notify listeners if value is changed', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerArgs = [];
      b.addListener('key1.key2', function (newValue, oldValue, absolutePath, relativePath) {
        listenerArgs = [newValue, oldValue, absolutePath, relativePath];
      });
      b.set('key1.key2', 1);
      assert.deepEqual(listenerArgs, [1, 0, 'key1.key2', '']);
    });

    it('should not notify listeners if value isn\'t changed', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerCalled = 0;
      b.addListener('key1.key2', function () { listenerCalled++; });
      b.set('key1.key2', 0);
      assert.strictEqual(listenerCalled, 0);
    });
  });

  describe('#delete(subpath)', function () {
    it('should do nothing on non-existent subpath', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.val();
      b.delete('non.existent');
      assert.strictEqual(b.val(), originalValue);
    });

    it('should delete on existent subpath', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b.delete('key1.key2');
      assert.isTrue(b.val().equals(Map({ key1: Map.empty() })));
    });

    it('should accept subpath as a string or an array', function () {
      var b1 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b1.delete('key1.key2');

      var b2 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b2.delete('key1.key2');

      assert.isTrue(b1.val().equals(Map({ key1: Map.empty() })));
      assert.isTrue(b2.val().equals(Map({ key1: Map.empty() })));
    });

    it('should notify listeners if value is changed', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerArgs = [];
      b.addListener('key1.key2', function (newValue, oldValue, absolutePath, relativePath) {
        listenerArgs = [newValue, oldValue, absolutePath, relativePath];
      });
      b.delete('key1.key2');
      assert.deepEqual(listenerArgs, [undefined, 0, 'key1', '']);
    });

    it('should not notify listeners if value isn\'t changed', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerCalled = 0;
      b.addListener('key1.key2', function () { listenerCalled++; });
      b.delete('non.existent');
      assert.strictEqual(listenerCalled, 0);
    });
  });

  describe('#clear(subpath)', function () {
    it('should do nothing on non-existent subpath', function () {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.val();
      b.clear('non.existent');
      assert.strictEqual(b.val(), originalValue);
    });

    it('should clear existent associative or nullify otherwise', function () {
      var b = Binding.init(Map({
        key1: Map({ key2: 0 }),
        key2: Vector(1, 2, 3)
      }));
      b.clear('key1');
      assert.strictEqual(b.val('key1').length, 0);
      b.clear('key2');
      assert.strictEqual(b.val('key2').length, 0);
    });

    it('should accept subpath as a string or an array', function () {
      var b = Binding.init(
        Map({
            root: Map({
              key1: Map({ 'key2': 0 }),
              key2: Vector(1, 2, 3)
            })
          }
        ));
      b.clear('root.key1');
      assert.strictEqual(b.val('root.key1').length, 0);
      b.clear(['root', 'key2']);
      assert.strictEqual(b.val('root.key2').length, 0);
    });
  });

  describe('#addListener(path, cb)', function () {
    it('should return different ids for each listener', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var id1 = b.addListener('', function () {});
      var id2 = b.addListener('', function () {});
      assert.notStrictEqual(id1, id2);
    });

    it('should accept path as a string or an array', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var firstListenerCalled = 0, secondListenerCalled = 0;
      b.addListener('key', function () { firstListenerCalled++; });
      b.addListener(['key'], function () { secondListenerCalled++; });
      b.set('key', 'foo');
      assert.strictEqual(firstListenerCalled, 1);
      assert.strictEqual(secondListenerCalled, 1);
    });
  });

  describe('#addGlobalListener(cb)', function () {
    it('global listener should be notified on any change', function () {
      var b = Binding.init(Map({ key1: 'value1' }));
      var listenerCalled = 0;
      b.addGlobalListener(function () { listenerCalled++; });
      b.set('key1', 'foo');
      b.set('key2', 'value2');
      assert.strictEqual(listenerCalled, 2);
    });

    it('global listener should be notified last', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var lastListenerCalled = null;
      b.addListener('foo', function () { lastListenerCalled = 'l1'; });
      b.addGlobalListener(function () { lastListenerCalled = 'g'; });
      b.addListener('foo', function () { lastListenerCalled = 'l2'; });
      b.set('key', 'foo');
      assert.strictEqual(lastListenerCalled, 'g');
    });

    it('global listener should not be notified when listener nesting value > 1', function () {
      var b = Binding.init(Map({ root: Map({ key1: 'value1' }) }));
      var globalListenerCalled = 0;
      b.addGlobalListener(function () {
        globalListenerCalled++;
        b.set('root.key3', 'value3'); // nested
      });
      b.addListener('root.key2', function () {
        b.set('root.key4', 'value4'); // nested
      });
      b.sub('root').addListener('key2', function () {
        b.set('root.key4', 'value4'); // nested
      });
      b.set('root.key2', 'value2');
      assert.strictEqual(globalListenerCalled, 1);
    });
  });

  describe('#enableListener(listenerId)', function () {
    it('should re-enable previousely disabled listener', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerCalled = false;
      var listenerId = b.addListener('key', function () {
        listenerCalled = true;
      });
      b.disableListener(listenerId);
      b.enableListener(listenerId);
      b.set('key', 'foo');
      assert.isTrue(listenerCalled);
    });
  });

  describe('#disableListener(listenerId)', function () {
    it('should disable listener', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerCalled = false;
      var listenerId = b.addListener('key', function () {
        listenerCalled = true;
      });
      b.disableListener(listenerId);
      b.set('key', 'foo');
      assert.isFalse(listenerCalled);
    });
  });

  describe('#withDisabledListener(listenerId, f)', function () {
    it('should execute function with listener muted', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerCalled = false;
      var listenerId = b.addListener('key', function () {
        listenerCalled = true;
      });
      b.withDisabledListener(listenerId, function () {
        b.set('key', 'foo');
      });
      assert.isFalse(listenerCalled);
    });
  });

  describe('#removeListener(id)', function () {
    it('should return false on non-existent listener id', function () {
      var b = Binding.init(Map({ key: 'value' }));
      assert.isFalse(b.removeListener('missing'));
    });

    it('should return true when listener exists and false on subsequent calls for same listener id', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var id = b.addListener('key', function () {});
      assert.isTrue(b.removeListener(id));
      assert.isFalse(b.removeListener(id));
      assert.isFalse(b.removeListener(id));
    });
  });

  describe('#atomically()', function () {
    it('should return new transaction context', function () {
      var tx1 = Binding.atomically();
      var tx2 = Binding.atomically();
      assert.isNotNull(tx1);
      assert.isNotNull(tx2);
      assert.notStrictEqual(tx1, tx2);
    });
  });

  describe('#asArrayPath(pathAsString)', function () {
    it('should return array argument as is', function () {
      var arrayPath = ['foo', 'bar'];
      assert.strictEqual(Binding.asArrayPath(arrayPath), arrayPath);
    });

    it('should return empty array if passed empty string', function () {
      assert.deepEqual(Binding.asArrayPath(''), []);
    });

    it('should convert string path to array path', function () {
      assert.deepEqual(Binding.asArrayPath('foo.bar'), ['foo', 'bar']);
    });

    it('should convert path elements containing numbers to numbers', function () {
      assert.deepEqual(Binding.asArrayPath('foo.bar.1'), ['foo', 'bar', 1]);
    });
  });

  describe('#asStringPath(pathAsAnArray)', function () {
    it('should return string argument as is', function () {
      var stringPath = 'foo.bar';
      assert.strictEqual(Binding.asStringPath(stringPath), stringPath);
    });

    it('should return empty string if passed empty array', function () {
      assert.strictEqual(Binding.asStringPath([]), '');
    });

    it('should convert array path to string path', function () {
      assert.strictEqual(Binding.asStringPath(['foo', 'bar']), 'foo.bar');
    });
  });

  describe('#isInstance(obj)', function () {
    it('should return true on binding', function () {
      assert.isTrue(Binding.isInstance(Binding));
      assert.isTrue(Binding.isInstance(Binding.init(Map('key', 'value'))));
    });

    it('should return false otherwise', function () {
      assert.isFalse(Binding.isInstance(0));
      assert.isFalse(Binding.isInstance('foo'));
      assert.isFalse(Binding.isInstance({}));
      assert.isFalse(Binding.isInstance(function () {}));
    });
  });

});

describe('TransactionContext', function () {
  describe('#update(update, subpath, binding)', function () {
    it('should modify binding value on commit', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var value = b.val();
      var tx = b.atomically().update('key', Util.constantly('foo'));
      assert.strictEqual(b.val(), value);
      tx.commit();
      assert.isTrue(b.val().equals(Map({ key: 'foo' })));
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().update(Util.constantly('foo')).commit();
      assert.isTrue(b.val().equals(Map({ key: 'foo' })));
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(Map({ key: 'value' }));
      b.atomically().update(b.sub('key'), Util.constantly('foo')).commit();
      assert.isTrue(b.val().equals(Map({ key: 'foo' })));
    });

    it('should apply changes to backing value at commit time', function () {
      var b = Binding.init(Map({ key: 0 }));
      var inc = function (x) { return x + 1; };
      var tx = b.atomically().update('key', inc);
      b.update('key', inc);
      tx.commit();
      assert.deepEqual(b.val('key'), inc(inc(0)));
    });
  });

  describe('#set(newValue, subpath, binding)', function () {
    it('should modify binding value on commit', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var value = b.val();
      var tx = b.atomically().set('key', 'foo');
      assert.strictEqual(b.val(), value);
      tx.commit();
      assert.isTrue(b.val().equals(Map({ key: 'foo' })));
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().set('foo').commit();
      assert.isTrue(b.val().equals(Map({ key: 'foo' })));
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(Map({ key: 'value' }));
      b.atomically().set(b.sub('key'), 'foo').commit();
      assert.isTrue(b.val().equals(Map({ key: 'foo' })));
    });

    it('should apply changes to backing value at commit time', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var tx = b.atomically().set('key', 'foo');
      b.set('key2', 'value2');
      tx.commit();
      assert.isTrue(b.val().equals(Map({ key: 'foo', key2: 'value2' })));
    });
  });

  describe('#delete(subpath, binding)', function () {
    it('should modify binding value on commit', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var value = b.val();
      var tx = b.atomically().delete('key');
      assert.strictEqual(b.val(), value);
      tx.commit();
      assert.strictEqual(b.val().length, 0);
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().delete().commit();
      assert.strictEqual(b.val().length, 0);
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(Map({ key: 'value' }));
      b.atomically().delete(b.sub('key')).commit();
      assert.strictEqual(b.val().length, 0);
    });

    it('should apply changes to backing value at commit time', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var tx = b.atomically().delete('key');
      b.set('key2', 'value2');
      tx.commit();
      assert.isTrue(b.val().equals(Map({ key2: 'value2' })));
    });
  });

  describe('#clear(subpath, binding)', function () {
    it('should clear binding value on commit', function () {
      var b = Binding.init(Map({ root: Map({ key: 'value' }) }));
      var value = b.val();
      var tx = b.atomically().clear('root');
      assert.strictEqual(b.val('root').length, 1);
      tx.commit();
      assert.strictEqual(b.val('root').length, 0);
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(Map({ root: Map({ key: 'value' }) }));
      var sub = b.sub('root');
      sub.atomically().clear().commit();
      assert.strictEqual(b.val('root').length, 0);
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(Map({ root: Map({ key: 'value' }) }));
      b.atomically().clear(b.sub('root')).commit();
      assert.strictEqual(b.val('root').length, 0);
    });
  });

  describe('#commit()', function () {
    it('should throw on recurrent commit', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var tx = b.atomically().delete('key');
      tx.commit();
      assert.throws(
        function () { tx.commit(); }, Error, 'Transaction already committed'
      );
    });

    it('should not notify listeners if notifyListeners argument is false', function () {
      var b = Binding.init(Map({ key: 'value' }));
      var globalListenerCalled = false, listenerCalled = false;
      b.addGlobalListener(function () { globalListenerCalled = true; });
      b.addListener('key', function () { listenerCalled = true; });
      b.atomically().delete('key').commit(false);
      assert.isFalse(globalListenerCalled);
      assert.isFalse(listenerCalled);
    });

    it('should notify each appropriate listener once', function () {
      var b = Binding.init(Map({ key1: Map({ key2: Map({ key3: 'foo' }) }) }));
      var globalListenerCalled = 0;
      var upperListenerCalled = 0, lowerListenerCalled = 0;
      var irrelevantListenerCalled = 0;

      b.addGlobalListener(function () { globalListenerCalled++; });
      b.addListener('key1', function () { upperListenerCalled++; });
      b.addListener('key1.key2.key3', function () { lowerListenerCalled++; });
      b.addListener('missing', function () { irrelevantListenerCalled++; });
      b.atomically().delete('key1.key2').commit();

      assert.strictEqual(globalListenerCalled, 1);
      assert.strictEqual(upperListenerCalled, 1);
      assert.strictEqual(lowerListenerCalled, 1);
      assert.strictEqual(irrelevantListenerCalled, 0);
    });

    it('should notify listener once for intersecting paths using most common path', function () {
      var b = Binding.init(Map({ key1: Map({ key2: Map({ key3: 'foo' }) }) }));
      var listenerCalled = 0, abs = null, rel = null;

      b.addListener('key1', function (_newValue, _oldValue, absolutePath, relativePath) {
        abs = absolutePath;
        rel = relativePath;
        listenerCalled++;
      });

      b.atomically()
        .update('key1', function (m) { return m.set('key0', 'bar'); })
        .update('key1.key2', function (m) { return m.set('key4', 'baz'); })
        .set('key1.key2.key3', 'boo')
        .commit();

      assert.strictEqual(abs, 'key1');
      assert.strictEqual(rel, '');
      assert.strictEqual(listenerCalled, 1);
    });
  });
});
