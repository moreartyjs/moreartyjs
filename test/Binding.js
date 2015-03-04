var assert = require('chai').assert;
var Imm = require('immutable');
var IMap = Imm.Map;
var List = Imm.List;
var Util = require('../src/Util');
var Binding = require('../src/Binding');

describe('Binding', function () {

  describe('#init(backingValue)', function () {
    it('should return binding with passed backing value', function () {
      var backingValue = IMap({ key: 'value' });
      var b = Binding.init(backingValue);
      assert.strictEqual(b.get(), backingValue);
    });
  });

  describe('#withBackingValue(newBackingValue)', function () {
    it('should return binding with passed backing value', function () {
      var newBackingValue = IMap({ key: 'value' });
      var b = Binding.init().withBackingValue(newBackingValue);
      assert.strictEqual(b.get(), newBackingValue);
    });

    it('should inherit existing listeners', function () {
      var b1 = Binding.init(IMap({ key: 'value' }));
      var listenerCalled = 0;
      b1.addListener('', function () { listenerCalled++; });
      var b2 = b1.withBackingValue(IMap({ key: 'value' }));
      b2.set('key', 'value2');
      assert.strictEqual(listenerCalled, 1);
    });
  });

  describe('#getPath()', function () {
    it('should return binding\'s path as an array', function () {
      var b = Binding.init();
      assert.deepEqual(b.getPath(), []);
      assert.deepEqual(b.sub('sub').getPath(), ['sub']);
    });
  });

  describe('#isChanged(alternativeBackingValue)', function () {
    it('should return true if binding value is changed', function () {
      var backingValue = IMap({ key1: IMap({ key2: 'foo' }) });
      var b = Binding.init(backingValue);
      assert.isTrue(b.sub('key1').isChanged(backingValue.setIn(['key1', 'key2'], 'bar')));
    });

    it('should return false if binding value is not changed', function () {
      var backingValue = IMap({ key1: IMap({ key2: 'foo' }) });
      var b = Binding.init(backingValue);
      assert.isFalse(b.sub('key1').isChanged(backingValue));
    });

    it('should support undefined or null alternative backing value value', function () {
      var backingValue = IMap({ key1: IMap({ key2: 'foo' }) });
      var b = Binding.init(backingValue);
      assert.isTrue(b.sub('key1').isChanged(null));
      assert.isTrue(Binding.init(IMap()).isChanged(null));
    });

    it('should support optional compare function', function () {
      var backingValue = IMap({ key1: 'foo' });
      var b = Binding.init(backingValue);
      var args = [];
      var changed = b.sub('key1').isChanged(backingValue.set('key1', 'bar'), function (value, alternativeValue) {
        args = [value, alternativeValue];
        return false;
      });
      assert.isTrue(changed);
      assert.deepEqual(args, ['foo', 'bar']);
    });
  });

  describe('#isRelative(otherBinding)', function () {
    it('should return true if bindings share same backing value', function () {
      var b1 = Binding.init();
      var b2 = b1.sub('sun');
      assert.isTrue(b1.isRelative(b2));
    });

    it('should return false if bindings don\'t share same backing value', function () {
      var b1 = Binding.init();
      var b2 = Binding.init().sub('foo');
      assert.isFalse(b1.isRelative(b2));
    });
  });

  describe('#meta(subpath)', function () {
    it('should auto-create meta binding by default', function () {
      var b = Binding.init(IMap());
      var metaB = b.meta();
      assert.isTrue(metaB instanceof Binding);
      assert.strictEqual(b.meta(), metaB);
    });

    it('should accept subpath as a string or an array', function () {
      var b = Binding.init(IMap());
      assert.strictEqual(b.meta('subpath'), b.meta().sub('subpath'));
    });

    it('should return metaBinding.sub(Binding.META_NODE) if meta binding is set', function () {
      var metaB = Binding.init(IMap());
      var b = Binding.init(IMap({ key: 'value' }), metaB);
      assert.strictEqual(b.meta(), metaB.sub(Binding.META_NODE));
      assert.strictEqual(b.sub('key').meta(), metaB.sub('key').sub(Binding.META_NODE));
    });

    it('should link meta binding to binding providing change notifications', function () {
      var b = Binding.init();
      var args = [];
      b.addListener(function (changes) {
        args = [changes.getPath(), changes.isMetaChanged(), changes.getPreviousMeta()];
      });
      b.sub('key').meta().set('meta');
      assert.deepEqual(args, [['key'], true, IMap()]);
    });

    it('should create relative meta-bindings', function () {
      var b = Binding.init(IMap());
      assert.isTrue(b.sub('key1').meta().isRelative(b.sub('key2').meta()));
    });

    it('should create relative meta-meta-bindings', function () {
      var b = Binding.init(IMap());
      assert.isTrue(b.sub('key1').meta('foo').meta().isRelative(b.sub('key2').meta('bar').meta()));
    });
  });

  describe('#unlinkMeta()', function () {
    it('should return false if no meta binding unlinked', function () {
      var b = Binding.init(IMap());
      assert.isFalse(b.unlinkMeta());
    });

    it('should return true and remove change notifications if meta binding unlinked', function () {
      var b = Binding.init(IMap());
      var listenerCalled = false;
      b.addListener(function () {
        listenerCalled = true;
      });
      var metaB = b.sub('key').meta();
      assert.isTrue(b.sub('key').unlinkMeta());
      metaB.set('meta');

      assert.isFalse(listenerCalled);
    });
  });

  describe('#get(subpath)', function () {
    it('should return backing value on empty subpath', function () {
      var backingValue = IMap({ key1: 'value1' });
      var b = Binding.init(backingValue);
      assert.strictEqual(b.get(), backingValue);
    });

    it('should return undefined on non-existent subpath', function () {
      var b = Binding.init(IMap({ key1: 'value1' }));
      assert.isUndefined(b.get('missing'));
    });

    it('should return value at subpath', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: List.of('value1') }) }));
      assert.strictEqual(b.get('key1.key2.0'), 'value1');
    });

    it('should accept subpath as a string or an array', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: List.of('value1') }) }));
      assert.strictEqual(b.get('key1.key2.0'), 'value1');
      assert.strictEqual(b.get(['key1', 'key2', 0]), 'value1');
    });
  });

  describe('#toJS(subpath)', function () {
    it('should return JS representation of underlying immutable data', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      assert.deepEqual(b.toJS(), { key: 'value' });
      assert.strictEqual(b.toJS('key'), 'value');
    });

    it('should return undefined on non-existent subpath', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      assert.isUndefined(b.toJS('missing'));
    });
  });

  describe('#sub(subpath)', function () {
    it('should share same backing value', function () {
      var backingValue = IMap({ key1: 'value1' });
      var b1 = Binding.init(backingValue);
      var b2 = b1.sub('');
      assert.strictEqual(b1.get(), b2.get());
    });

    it('should share listeners', function () {
      var b1 = Binding.init(IMap({ key1: IMap({ key2: 'value2', key3: 'value3' }) }));
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
      var b = Binding.init(IMap({ key1: List.of('value1') })).sub('key1.0');
      assert.strictEqual(b.get(), 'value1');
    });

    it('should accept subpath as a string or an array', function () {
      var b = Binding.init(IMap({ key1: List.of('value1') }));
      var b1 = b.sub('key1.0');
      var b2 = b.sub(['key1', 0]);
      assert.strictEqual(b1.get(), 'value1');
      assert.strictEqual(b2.get(), 'value1');
    });

    it('should cache sub-bindings', function () {
      var b = Binding.init();

      var sub1 = b.sub('key');
      var sub2 = b.sub('key');
      assert.strictEqual(sub1, sub2);

      var subSub1 = sub1.sub('foo');
      var subSub2 = sub2.sub('foo');
      assert.strictEqual(subSub1, subSub2);
    });

    it('should return this on empty subpath', function () {
      var b = Binding.init();
      assert.strictEqual(b, b.sub());
      assert.strictEqual(b, b.sub(''));
      assert.strictEqual(b, b.sub([]));
    });
  });

  describe('#update(subpath, f)', function () {
    it('should return this binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var b2 = b.update('key', Util.constantly('foo'));
      assert.strictEqual(b2, b);
    });

    it('should create subpaths if they don\'t exist', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b.update('non.existent', Util.constantly('foo'));
      assert.strictEqual(b.get('non.existent'), 'foo');
    });

    it('should do nothing if value isn\'t changed', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var originalValue = b.get();
      b.update('key1.key2', Util.identity);
      assert.strictEqual(b.get(), originalValue);
    });

    it('should update value at subpath', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var updateFunction = function (x) { return x + 1; };
      b.update('key1.key2', updateFunction);
      assert.strictEqual(b.get('key1.key2'), updateFunction(0));
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      var updateFunction = function (x) { return x + 1; };
      sub.update(updateFunction);
      assert.strictEqual(b.get('key1.key2'), updateFunction(0));
    });

    it('should accept subpath as a string or an array', function () {
      var updateFunction = function (x) { return x + 1; };

      var b1 = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b1.update('key1.key2', updateFunction);

      var b2 = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b2.update(['key1', 'key2'], updateFunction);

      assert.strictEqual(b1.get('key1.key2'), updateFunction(0));
      assert.strictEqual(b2.get('key1.key2'), updateFunction(0));
    });

    it('should notify listeners', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.update('key1.key2', function (x) { return x + 1; });
      assert.deepEqual(args, [['key2'], true, IMap({ key2: 0 })]);
    });

    it('should not notify listeners if value isn\'t changed', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var listenerCalled = false;
      b.addListener('key1', function () { listenerCalled = true; });
      b.update('key1.key2', Util.identity);
      assert.isFalse(listenerCalled);
    });

    it('should support updating root value', function () {
      var b = Binding.init(IMap());
      b.update(function (x) { return x.set('foo', 'bar'); });
      assert.isTrue(b.get().equals(IMap({ foo: 'bar' })));
    });
  });

  describe('#set(subpath, newValue)', function () {
    it('should return this binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var b2 = b.set('key', 'foo');
      assert.strictEqual(b2, b);
    });

    it('should create subpaths if they don\'t exist', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b.set('non.existent', 'foo');
      assert.strictEqual(b.get('non.existent'), 'foo');
    });

    it('should do nothing if value isn\'t changed', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var originalValue = b.get();
      b.set('key1.key2', 0);
      assert.strictEqual(b.get(), originalValue);
    });

    it('should set new value at subpath', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b.set('key1.key2', 1);
      assert.strictEqual(b.get('key1.key2'), 1);
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.set(1);
      assert.strictEqual(b.get('key1.key2'), 1);
    });

    it('should accept subpath as a string or an array', function () {
      var b1 = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b1.set('key1.key2', 1);

      var b2 = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b2.set(['key1', 'key2'], 1);

      assert.strictEqual(b1.get('key1.key2'), 1);
      assert.strictEqual(b2.get('key1.key2'), 1);
    });

    it('should notify appropriate listeners', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.set('key1.key2', 1);
      assert.deepEqual(args, [['key2'], true, IMap({ key2: 0 })]);
    });

    it('should not notify listeners if value isn\'t changed', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var listenerCalled = false;
      b.addListener('key1', function () { listenerCalled = true; });
      b.set('key1.key2', 0);
      assert.isFalse(listenerCalled);
    });

    it('should support setting root value', function () {
      var b = Binding.init(IMap());
      b.set(IMap({ foo: 'bar' }));
      assert.isTrue(b.get().equals(IMap({ foo: 'bar' })));
    });
  });

  describe('#delete', function () {
    it('should strictly equal #remove', function () {
      assert.strictEqual(Binding.prototype.remove, Binding.prototype['delete']);
    });
  });

  describe('#remove(subpath)', function () {
    it('should return this binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var b2 = b.remove('key');
      assert.strictEqual(b2, b);
    });

    it('should do nothing on non-existent subpath', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var originalValue = b.get();
      b.remove('non.existent');
      assert.strictEqual(b.get(), originalValue);
    });

    it('should delete value at existent subpath', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b.remove('key1.key2');
      assert.isTrue(b.get().equals(IMap({ key1: IMap() })));
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.remove();
      assert.isUndefined(b.get('key1.key2'));
    });

    it('should accept subpath as a string or an array', function () {
      var b1 = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b1.remove('key1.key2');

      var b2 = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b2.remove('key1.key2');

      assert.isTrue(b1.get().equals(IMap({ key1: IMap() })));
      assert.isTrue(b2.get().equals(IMap({ key1: IMap() })));
    });

    it('should notify appropriate listeners', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.remove('key1.key2');
      assert.deepEqual(args, [[], true, IMap({ key2: 0 })]);
    });

    it('should not notify listeners if value isn\'t changed', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var listenerCalled = false;
      b.addListener('key1', function () { listenerCalled = true; });
      b.remove('key1.missing');
      assert.isFalse(listenerCalled);
    });
  });

  describe('#merge(subpath, preserve, newValue)', function () {
    it('should return this binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var b2 = b.merge('key', 'foo');
      assert.strictEqual(b2, b);
    });

    it('should create subpaths if they don\'t exist', function () {
      var b = Binding.init(IMap());
      b.merge('non.existent', false, 'foo');
      assert.strictEqual(b.get('non.existent'), 'foo');
    });

    it('should deep merge new value into old value by default', function () {
      var b = Binding.init(IMap({ root: IMap({ key1: IMap({ key2: 0 }), key3: 'foo' }) }));
      b.merge('root', IMap({ key1: IMap({ key2: 1, key4: 'bar' }) }));
      assert.isTrue(b.get('root').equals(IMap({ key1: IMap({ key2: 1, key4: 'bar' }), key3: 'foo' })));
    });

    it('should deep merge old value into new value if preserve is true', function () {
      var b = Binding.init(IMap({ root: IMap({ key1: IMap({ key2: 1, key4: 'bar' }) }) }));
      b.merge('root', true, IMap({ key1: IMap({ key2: 0 }), key3: 'foo' }));
      assert.isTrue(b.get('root').equals(IMap({ key1: IMap({ key2: 1, key4: 'bar' }), key3: 'foo' })));
    });

    it('should replace old value with new value by default for non-mergeable values', function () {
      var b = Binding.init(IMap({ root: 0 }));
      b.merge('root', 1);
      assert.strictEqual(b.get('root'), 1);
    });

    it('should replace keep old value for non-mergeable values if preserve is true', function () {
      var b = Binding.init(IMap({ root: 0 }));
      b.merge('root', true, 1);
      assert.strictEqual(b.get('root'), 0);
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.merge(1);
      assert.strictEqual(b.get('key1.key2'), 1);
    });

    it('should accept subpath as a string or an array', function () {
      var b1 = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b1.merge('key1.key2', 1);

      var b2 = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      b2.merge(['key1', 'key2'], 1);

      assert.strictEqual(b1.get('key1.key2'), 1);
      assert.strictEqual(b2.get('key1.key2'), 1);
    });

    it('should notify appropriate listeners', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.merge('key1.key2', 1);
      assert.deepEqual(args, [['key2'], true, IMap({ key2: 0 })]);
    });

    it('should not notify listeners if value isn\'t changed', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var listenerCalled = false;
      b.addListener('key1', function () { listenerCalled = true; });
      b.merge('key1.key2', 0);
      assert.isFalse(listenerCalled);
    });
  });

  describe('#clear(subpath)', function () {
    it('should return this binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var b2 = b.clear('key');
      assert.strictEqual(b2, b);
    });

    it('should do nothing on non-existent subpath', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var originalValue = b.get();
      b.clear('non.existent');
      assert.strictEqual(b.get(), originalValue);
    });

    it('should clear existent associative or nullify otherwise', function () {
      var b = Binding.init(IMap({
        key1: IMap({ key2: 0 }),
        key2: List.of(1, 2, 3)
      }));
      b.clear('key1');
      assert.isTrue(b.get('key1').isEmpty());
      b.clear('key2');
      assert.isTrue(b.get('key2').isEmpty());
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var sub = b.sub('key1');
      sub.clear();
      assert.isTrue(b.get('key1').isEmpty());
    });

    it('should accept subpath as a string or an array', function () {
      var b = Binding.init(
        IMap({
            root: IMap({
              key1: IMap({ 'key2': 0 }),
              key2: List.of(1, 2, 3)
            })
          }
        ));
      b.clear('root.key1');
      assert.isTrue(b.get('root.key1').isEmpty());
      b.clear(['root', 'key2']);
      assert.isTrue(b.get('root.key2').isEmpty());
    });

    it('should notify appropriate listeners', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 1 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.clear('key1.key2');
      assert.deepEqual(args, [['key2'], true, IMap({ key2: 1 })]);
    });
  });

  describe('#addListener(path, cb)', function () {
    it('should return different ids for each listener', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var id1 = b.addListener(function () {});
      var id2 = b.addListener(function () {});
      assert.notStrictEqual(id1, id2);
    });

    it('should accept path as a string or an array', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var firstListenerCalled = 0, secondListenerCalled = 0;
      b.addListener('key', function () { firstListenerCalled++; });
      b.addListener(['key'], function () { secondListenerCalled++; });
      b.set('key', 'foo');
      assert.strictEqual(firstListenerCalled, 1);
      assert.strictEqual(secondListenerCalled, 1);
    });

    it('should be notified when meta binding is changed', function () {
      var b = Binding.init(IMap(), Binding.init(IMap()));
      var args = [];
      b.addListener(function (changes) {
        args = [
          changes.getPath(),
          changes.isValueChanged(), changes.isMetaChanged(),
          changes.getPreviousValue(), changes.getPreviousMeta()
        ];
      });
      b.meta().set('meta');
      assert.deepEqual(args, [[], false, true, null, IMap()]);
    });

    it('should not be notified when meta binding isn\'t changed', function () {
      var b = Binding.init(IMap(), Binding.init(IMap()));
      var listenerCalled = false;
      b.meta().set('meta');
      b.addListener(function () { listenerCalled = true; });
      b.meta().set('meta');
      assert.isFalse(listenerCalled);
    });

    it('should be notified when meta-meta-binding is changed', function () {
      var b = Binding.init(IMap());
      var metaB = b.meta();
      var metaMetaB = metaB.meta();

      var args = [];
      b.addListener(function (changes) {
        args = [
          changes.getPath(),
          changes.isValueChanged(), changes.isMetaChanged(),
          changes.getPreviousValue(), changes.getPreviousMeta()
        ];
      });
      metaMetaB.set('meta');
      assert.deepEqual(args, [[], false, true, null, IMap()]);
    });

    it('should be notified when meta-meta-meta-binding is changed', function () {
      var b = Binding.init(IMap());
      var metaB = b.meta();
      var metaMetaB = metaB.meta();
      var metaMetaMetaB = metaMetaB.meta();

      var args = [];
      b.addListener(function (changes) {
        args = [
          changes.getPath(),
          changes.isValueChanged(), changes.isMetaChanged(),
          changes.getPreviousValue(), changes.getPreviousMeta()
        ];
      });
      metaMetaMetaB.set('meta');
      assert.deepEqual(args, [[], false, true, null, IMap()]);
    });

    it('should notify global listener first', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var listeners = [];
      b.addListener('key', function () { listeners.push('l1'); });
      b.addListener(function () { listeners.push('g'); });
      b.addListener('key', function () { listeners.push('l2'); });
      b.set('key', 'foo');
      assert.deepEqual(listeners, ['g', 'l1', 'l2']);
    });
  });

  describe('#enableListener(listenerId)', function () {
    it('should return this binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var listenerId = b.addListener('key', function () {});
      var b2 = b.enableListener(listenerId);
      assert.strictEqual(b2, b);
    });

    it('should re-enable previousely disabled listener', function () {
      var b = Binding.init(IMap({ key: 'value' }));
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
    it('should return this binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var listenerId = b.addListener('key', function () {});
      var b2 = b.disableListener(listenerId);
      assert.strictEqual(b2, b);
    });

    it('should disable listener', function () {
      var b = Binding.init(IMap({ key: 'value' }));
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
    it('should return this binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var listenerId = b.addListener('key', function () {});
      var b2 = b.withDisabledListener(listenerId, function () {});
      assert.strictEqual(b2, b);
    });

    it('should execute function with listener muted', function () {
      var b = Binding.init(IMap({ key: 'value' }));
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
      var b = Binding.init(IMap({ key: 'value' }));
      assert.isFalse(b.removeListener('missing'));
    });

    it('should return true when listener exists and false on subsequent calls for same listener id', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var id = b.addListener('key', function () {});
      assert.isTrue(b.removeListener(id));
      assert.isFalse(b.removeListener(id));
      assert.isFalse(b.removeListener(id));
    });
  });

  describe('#atomically()', function () {
    it('should return new transaction context', function () {
      var tx1 = Binding.init().atomically();
      var tx2 = Binding.init().atomically();
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

  describe('#META_NODE', function () {
    it('should be equal to __meta__', function () {
      assert.strictEqual(Binding.META_NODE, '__meta__');
    });
  });

});

describe('TransactionContext', function () {
  describe('#update(subpath, binding, f)', function () {
    it('should modify binding value on commit', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var value = b.get();
      var tx = b.atomically().update('key', Util.constantly('foo'));
      assert.strictEqual(b.get(), value);
      tx.commit();
      assert.isTrue(b.get().equals(IMap({ key: 'foo' })));
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().update(Util.constantly('foo')).commit();
      assert.isTrue(b.get().equals(IMap({ key: 'foo' })));
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      b.atomically().update(b.sub('key'), Util.constantly('foo')).commit();
      assert.isTrue(b.get().equals(IMap({ key: 'foo' })));
    });

    it('should return this', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.update('key', Util.constantly('foo')), tx);
    });
  });

  describe('#set(subpath, binding, newValue)', function () {
    it('should modify binding value on commit', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var value = b.get();
      var tx = b.atomically().set('key', 'foo');
      assert.strictEqual(b.get(), value);
      tx.commit();
      assert.isTrue(b.get().equals(IMap({ key: 'foo' })));
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().set('foo').commit();
      assert.isTrue(b.get().equals(IMap({ key: 'foo' })));
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      b.atomically().set(b.sub('key'), 'foo').commit();
      assert.isTrue(b.get().equals(IMap({ key: 'foo' })));
    });

    it('should return this', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.set('key', 'foo'), tx);
    });
  });

  describe('#delete', function () {
    it('should strictly equal #remove', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.remove, tx['delete']);
    });
  });

  describe('#remove(subpath, binding)', function () {
    it('should modify binding value on commit', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var value = b.get();
      var tx = b.atomically().remove('key');
      assert.strictEqual(b.get(), value);
      tx.commit();
      assert.isTrue(b.get().isEmpty());
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().remove().commit();
      assert.isTrue(b.get().isEmpty());
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      b.atomically().remove(b.sub('key')).commit();
      assert.isTrue(b.get().isEmpty());
    });

    it('should return this', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.remove('key'), tx);
    });
  });

  describe('#merge(subpath, preserve, binding, newValue)', function () {
    it('should modify binding value on commit', function () {
      var b = Binding.init(IMap({ root: IMap({ key: 'value' }) }));
      var value = b.get();
      var tx = b.atomically().merge('root', IMap({ key2: 'value2' }));
      assert.strictEqual(b.get(), value);
      tx.commit();
      assert.isTrue(b.get('root').equals(IMap({ key: 'value', key2: 'value2' })));
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.atomically().merge(1).commit();
      assert.strictEqual(b.get('key1.key2'), 1);
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      b.atomically().merge(b.sub('key'), 'foo').commit();
      assert.isTrue(b.get().equals(IMap({ key: 'foo' })));
    });

    it('should return this', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.merge('root', IMap({ key2: 'value2' })), tx);
    });
  });

  describe('#clear(subpath, binding)', function () {
    it('should clear binding value on commit', function () {
      var b = Binding.init(IMap({ root: IMap({ key: 'value' }) }));
      var value = b.get();
      var tx = b.atomically().clear('root');
      assert.strictEqual(b.get('root').count(), 1);
      tx.commit();
      assert.isTrue(b.get('root').isEmpty());
    });

    it('can omit subpath for sub-binding', function () {
      var b = Binding.init(IMap({ root: IMap({ key: 'value' }) }));
      var sub = b.sub('root');
      sub.atomically().clear().commit();
      assert.isTrue(b.get('root').isEmpty());
    });

    it('can supply alternative binding that shares same backing value', function () {
      var b = Binding.init(IMap({ root: IMap({ key: 'value' }) }));
      b.atomically().clear(b.sub('root')).commit();
      assert.isTrue(b.get('root').isEmpty());
    });

    it('should return this', function () {
      var b = Binding.init(IMap({ root: IMap({ key: 'value' }) }));
      var tx = b.atomically();
      assert.strictEqual(tx.clear('root'), tx);
    });
  });

  describe('#commit()', function () {
    it('should throw on recurrent commit', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var tx = b.atomically().remove('key');
      tx.commit();
      assert.throws(
        function () { tx.commit(); }, Error, 'Transaction already committed'
      );
    });

    it('should not notify listeners if notify option is false', function () {
      var b = Binding.init(IMap({ key: 'value' }));
      var globalListenerCalled = false, listenerCalled = false;
      b.addListener(function () { globalListenerCalled = true; });
      b.addListener('key', function () { listenerCalled = true; });
      b.atomically().remove('key').commit({ notify: false });
      assert.isFalse(globalListenerCalled);
      assert.isFalse(listenerCalled);
    });

    it('should notify each appropriate listener once', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: IMap({ key3: 'foo' }) }) }));
      var globalListenerCalled = 0;
      var upperListenerCalled = 0, lowerListenerCalled = 0;
      var irrelevantListenerCalled = 0;

      b.addListener(function () { globalListenerCalled++; });
      b.addListener('key1', function () { upperListenerCalled++; });
      b.addListener('key1.key2.key3', function () { lowerListenerCalled++; });
      b.addListener('missing', function () { irrelevantListenerCalled++; });
      b.atomically().remove('key1.key2').commit();

      assert.strictEqual(globalListenerCalled, 1);
      assert.strictEqual(upperListenerCalled, 1);
      assert.strictEqual(lowerListenerCalled, 1);
      assert.strictEqual(irrelevantListenerCalled, 0);
    });

    it('should notify listener once for intersecting paths using most common path', function () {
      var b = Binding.init(IMap({ key1: IMap({ key2: IMap({ key3: 'foo' }) }) }));
      var listenerCalled = 0, path = null;

      b.addListener('key1', function (changes) {
        path = changes.getPath();
        listenerCalled++;
      });

      b.atomically()
        .update('key1', function (m) { return m.set('key0', 'bar'); })
        .update('key1.key2', function (m) { return m.set('key4', 'baz'); })
        .set('key1.key2.key3', 'foo')
        .commit();

      assert.deepEqual(path, []);
      assert.strictEqual(listenerCalled, 1);
    });

    it('should notify listener once for sibling paths', function () {
      var b = Binding.init(IMap({ key: List.of() }));
      var sub = b.sub('key');

      var listenerCalled = 0;
      sub.addListener(function() { listenerCalled++; });
      sub.atomically().set(0, 0).set(1, 1).set(2, 2).commit();

      assert.strictEqual(listenerCalled, 1);
    });

    it('should allow to modify state and meta state within single transaction', function () {
      var metaB = Binding.init(IMap({ key: 'meta1' }));
      var b = Binding.init(IMap({ key: 'value' }), metaB);

      var args = [];
      b.addListener('key', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue(), changes.getPreviousMeta()];
      });

      b.atomically()
        .set('key', 'foo')
        .set(b.meta(), 'meta2')
        .commit();

      assert.strictEqual(b.meta().get(), 'meta2');
      assert.deepEqual(args, [[], true, 'value', 'meta1']);
    });
  });
});

