/// <reference path="../../typings/mocha/mocha.d.ts" />
/// <reference path="../../typings/chai/chai.d.ts" />
/// <reference path="../../type-definitions/morearty.d.ts" />
/// <reference path="../../node_modules/immutable/dist/immutable.d.ts" />

import M = require('morearty');
import chai = require('chai');
import Imm = require('immutable');
import Map = Imm.Map;
import List = Imm.List;

var assert = chai.assert;
import Binding = M.Binding;
import Util = M.Util;

describe('Binding', () => {
  describe('#init(backingValue)', () => {
    it('should return binding with passed backing value', () => {
      var backingValue = Map({ key: 'value' });
      var b = Binding.init(backingValue);
      assert.strictEqual(b.get(), backingValue);
    });
  });

  describe('#withBackingValue(newBackingValue)', () => {
    it('should return binding with passed backing value', () => {
      var newBackingValue = Map({ key: 'value' });
      var b = Binding.init().withBackingValue(newBackingValue);
      assert.strictEqual(b.get(), newBackingValue);
    });

    it('should inherit existing listeners', () => {
      var b1 = Binding.init(Map({ key: 'value' }));
      var listenerCalled = 0;
      b1.addListener('', () => { listenerCalled++; });
      var b2 = b1.withBackingValue(Map({ key: 'value' }));
      b2.set('key', 'value2');
      assert.strictEqual(listenerCalled, 1);
    });
  });

  describe('#getPath()', () => {
    it('should return binding\'s path as an array', () => {
      var b = Binding.init();
      assert.deepEqual(b.getPath(), []);
      assert.deepEqual(b.sub('sub').getPath(), ['sub']);
    });
  });

  describe('#isChanged(alternativeBackingValue)', () => {
    it('should return true if binding value is changed', () => {
      var backingValue = Map<string, string>({ key1: Map({ key2: 'foo' }) });
      var b = Binding.init(backingValue);
      assert.isTrue(b.sub('key1').isChanged(backingValue.setIn(['key1', 'key2'], 'bar')));
    });

    it('should return false if binding value is not changed', () => {
      var backingValue = Map({ key1: Map({ key2: 'foo' }) });
      var b = Binding.init(backingValue);
      assert.isFalse(b.sub('key1').isChanged(backingValue));
    });

    it('should support undefined or null alternative backing value value', () => {
      var backingValue = Map({ key1: Map({ key2: 'foo' }) });
      var b = Binding.init(backingValue);
      assert.isTrue(b.sub('key1').isChanged(null));
      assert.isFalse(Binding.init().isChanged(null));
    });

    it('should support optional compare function', () => {
      var backingValue = Map({ key1: 'foo' });
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

  describe('#isRelative(otherBinding)', () => {
    it('should return true if bindings share same backing value', () => {
      var b1 = Binding.init();
      var b2 = b1.sub('sun');
      assert.isTrue(b1.isRelative(b2));
    });

    it('should return false if bindings don\'t share same backing value', () => {
      var b1 = Binding.init();
      var b2 = Binding.init().sub('foo');
      assert.isFalse(b1.isRelative(b2));
    });
  });

  describe('#meta(subpath)', () => {
    it('should auto-create meta binding by default', () => {
      var b = Binding.init(Map());
      var metaB = b.meta();
      assert.isTrue(metaB instanceof Binding);
      assert.strictEqual(b.meta(), metaB);
    });

    it('should accept subpath as a string or an array', () => {
      var b = Binding.init(Map());
      assert.strictEqual(b.meta('subpath'), b.meta().sub('subpath'));
    });

    it('should return metaBinding.sub(Binding.META_NODE) if meta binding is set', () => {
      var metaB = Binding.init(Map());
      var b = Binding.init(Map({ key: 'value' }), metaB);
      assert.strictEqual(b.meta(), metaB.sub(Binding.META_NODE));
      assert.strictEqual(b.sub('key').meta(), metaB.sub('key').sub(Binding.META_NODE));
    });

    it('should link meta binding to binding providing change notifications', () => {
      var b = Binding.init();
      var args = [];
      b.addGlobalListener(function (changes) {
        args = [changes.getPath(), changes.isMetaChanged(), changes.getPreviousMeta()];
      });
      b.sub('key').meta().set('meta');
      assert.deepEqual(args, [['key'], true, Map()]);
    });

    it('should create relative meta-bindings', () => {
      var b = Binding.init(Map());
      assert.isTrue(b.sub('key1').meta().isRelative(b.sub('key2').meta()));
    });

    it('should create relative meta-meta-bindings', () => {
      var b = Binding.init(Map());
      assert.isTrue(b.sub('key1').meta('foo').meta().isRelative(b.sub('key2').meta('bar').meta()));
    });
  });

  describe('#unlinkMeta()', () => {
    it('should return false if no meta binding unlinked', () => {
      var b = Binding.init(Map());
      assert.isFalse(b.unlinkMeta());
    });

    it('should return true and remove change notifications if meta binding unlinked', () => {
      var b = Binding.init(Map());
      var listenerCalled = false;
      b.addGlobalListener(() => {
        listenerCalled = true;
      });
      var metaB = b.sub('key').meta();
      assert.isTrue(b.sub('key').unlinkMeta());
      metaB.set('meta');

      assert.isFalse(listenerCalled);
    });
  });

  describe('#get(subpath)', () => {
    it('should return backing value on empty subpath', () => {
      var backingValue = Map({ key1: 'value1' });
      var b = Binding.init(backingValue);
      assert.strictEqual(b.get(), backingValue);
    });

    it('should return undefined on non-existent subpath', () => {
      var b = Binding.init(Map({ key1: 'value1' }));
      assert.isUndefined(b.get('missing'));
    });

    it('should return value at subpath', () => {
      var b = Binding.init(Map({ key1: Map({ key2: List.of('value1') }) }));
      assert.strictEqual(b.get('key1.key2.0'), 'value1');
    });

    it('should accept subpath as a string or an array', () => {
      var b = Binding.init(Map({ key1: Map({ key2: List.of('value1') }) }));
      assert.strictEqual(b.get('key1.key2.0'), 'value1');
      assert.strictEqual(b.get(['key1', 'key2', 0]), 'value1');
    });
  });

  describe('#toJS(subpath)', () => {
    it('should return JS representation of underlying immutable data', () => {
      var b = Binding.init(Map({ key: 'value' }));
      assert.deepEqual(b.toJS(), { key: 'value' });
      assert.strictEqual(b.toJS('key'), 'value');
    });

    it('should return undefined on non-existent subpath', () => {
      var b = Binding.init(Map({ key: 'value' }));
      assert.isUndefined(b.toJS('missing'));
    });
  });

  describe('#sub(subpath)', () => {
    it('should share same backing value', () => {
      var backingValue = Map({ key1: 'value1' });
      var b1 = Binding.init(backingValue);
      var b2 = b1.sub('');
      assert.strictEqual(b1.get(), b2.get());
    });

    it('should share listeners', () => {
      var b1 = Binding.init(Map({ key1: Map({ key2: 'value2', key3: 'value3' }) }));
      var b1ListenerCalled = 0;
      b1.addListener('key1.key2', () => { b1ListenerCalled++; });

      var b2 = b1.sub('key1');
      var b2ListenerCalled = 0;
      b2.addListener('key3', () => { b2ListenerCalled++; });

      b2.set('key2', 'foo');
      assert.strictEqual(b1ListenerCalled, 1);
      assert.strictEqual(b2ListenerCalled, 0);

      b1.set('key1.key3', 'foo');
      assert.strictEqual(b1ListenerCalled, 1);
      assert.strictEqual(b2ListenerCalled, 1);
    });

    it('should change the meaning of val()', () => {
      var b = Binding.init(Map({ key1: List.of('value1') })).sub('key1.0');
      assert.strictEqual(b.get(), 'value1');
    });

    it('should accept subpath as a string or an array', () => {
      var b = Binding.init(Map({ key1: List.of('value1') }));
      var b1 = b.sub('key1.0');
      var b2 = b.sub(['key1', 0]);
      assert.strictEqual(b1.get(), 'value1');
      assert.strictEqual(b2.get(), 'value1');
    });

    it('should cache sub-bindings', () => {
      var b = Binding.init();

      var sub1 = b.sub('key');
      var sub2 = b.sub('key');
      assert.strictEqual(sub1, sub2);

      var subSub1 = sub1.sub('foo');
      var subSub2 = sub2.sub('foo');
      assert.strictEqual(subSub1, subSub2);
    });

    it('should return this on empty subpath', () => {
      var b = Binding.init();
      assert.strictEqual(b, b.sub());
      assert.strictEqual(b, b.sub(''));
      assert.strictEqual(b, b.sub([]));
    });
  });

  describe('#update(subpath, f)', () => {
    it('should return this binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var b2 = b.update('key', Util.constantly('foo'));
      assert.strictEqual(b2, b);
    });

    it('should create subpaths if they don\'t exist', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b.update('non.existent', Util.constantly('foo'));
      assert.strictEqual(b.get('non.existent'), 'foo');
    });

    it('should do nothing if value isn\'t changed', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.get();
      b.update('key1.key2', Util.identity);
      assert.strictEqual(b.get(), originalValue);
    });

    it('should update value at subpath', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var updateFunction = function (x) { return x + 1; };
      b.update('key1.key2', updateFunction);
      assert.strictEqual(b.get('key1.key2'), updateFunction(0));
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      var updateFunction = function (x) { return x + 1; };
      sub.update(updateFunction);
      assert.strictEqual(b.get('key1.key2'), updateFunction(0));
    });

    it('should accept subpath as a string or an array', () => {
      var updateFunction = function (x) { return x + 1; };

      var b1 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b1.update('key1.key2', updateFunction);

      var b2 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b2.update(['key1', 'key2'], updateFunction);

      assert.strictEqual(b1.get('key1.key2'), updateFunction(0));
      assert.strictEqual(b2.get('key1.key2'), updateFunction(0));
    });

    it('should notify listeners', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.update('key1.key2', function (x) { return x + 1; });
      assert.deepEqual(args, [['key2'], true, Map({ key2: 0 })]);
    });

    it('should not notify listeners if value isn\'t changed', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerCalled = false;
      b.addListener('key1', () => { listenerCalled = true; });
      b.update('key1.key2', Util.identity);
      assert.isFalse(listenerCalled);
    });

    it('should support updating root value', () => {
      var b = Binding.init(Map());
      b.update(function (x) { return x.set('foo', 'bar'); });
      assert.isTrue(b.get().equals(Map({ foo: 'bar' })));
    });
  });

  describe('#set(subpath, newValue)', () => {
    it('should return this binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var b2 = b.set('key', 'foo');
      assert.strictEqual(b2, b);
    });

    it('should create subpaths if they don\'t exist', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b.set('non.existent', 'foo');
      assert.strictEqual(b.get('non.existent'), 'foo');
    });

    it('should do nothing if value isn\'t changed', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.get();
      b.set('key1.key2', 0);
      assert.strictEqual(b.get(), originalValue);
    });

    it('should set new value at subpath', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b.set('key1.key2', 1);
      assert.strictEqual(b.get('key1.key2'), 1);
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.set(1);
      assert.strictEqual(b.get('key1.key2'), 1);
    });

    it('should accept subpath as a string or an array', () => {
      var b1 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b1.set('key1.key2', 1);

      var b2 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b2.set(['key1', 'key2'], 1);

      assert.strictEqual(b1.get('key1.key2'), 1);
      assert.strictEqual(b2.get('key1.key2'), 1);
    });

    it('should notify appropriate listeners', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.set('key1.key2', 1);
      assert.deepEqual(args, [['key2'], true, Map({ key2: 0 })]);
    });

    it('should not notify listeners if value isn\'t changed', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerCalled = false;
      b.addListener('key1', () => { listenerCalled = true; });
      b.set('key1.key2', 0);
      assert.isFalse(listenerCalled);
    });

    it('should support setting root value', () => {
      var b = Binding.init(Map());
      b.set(Map({ foo: 'bar' }));
      assert.isTrue(b.get().equals(Map({ foo: 'bar' })));
    });
  });

  describe('#delete(subpath)', () => {
    it('should return this binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var b2 = b.delete('key');
      assert.strictEqual(b2, b);
    });

    it('should do nothing on non-existent subpath', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.get();
      b.delete('non.existent');
      assert.strictEqual(b.get(), originalValue);
    });

    it('should delete value at existent subpath', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b.delete('key1.key2');
      assert.isTrue(b.get().equals(Map({ key1: Map() })));
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.delete();
      assert.isUndefined(b.get('key1.key2'));
    });

    it('should accept subpath as a string or an array', () => {
      var b1 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b1.delete('key1.key2');

      var b2 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b2.delete('key1.key2');

      assert.isTrue(b1.get().equals(Map({ key1: Map() })));
      assert.isTrue(b2.get().equals(Map({ key1: Map() })));
    });

    it('should notify appropriate listeners', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.delete('key1.key2');
      assert.deepEqual(args, [[], true, Map({ key2: 0 })]);
    });

    it('should not notify listeners if value isn\'t changed', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerCalled = false;
      b.addListener('key1', () => { listenerCalled = true; });
      b.delete('key1.missing');
      assert.isFalse(listenerCalled);
    });
  });

  describe('#merge(subpath, preserve, newValue)', () => {
    it('should return this binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var b2 = b.merge('key', 'foo');
      assert.strictEqual(b2, b);
    });

    it('should create subpaths if they don\'t exist', () => {
      var b = Binding.init(Map());
      b.merge('non.existent', false, 'foo');
      assert.strictEqual(b.get('non.existent'), 'foo');
    });

    it('should deep merge new value into old value by default', () => {
      var b = Binding.init(Map({ root: Map({ key1: Map({ key2: 0 }), key3: 'foo' }) }));
      b.merge('root', Map({ key1: Map({ key2: 1, key4: 'bar' }) }));
      assert.isTrue(b.get('root').equals(Map({ key1: Map({ key2: 1, key4: 'bar' }), key3: 'foo' })));
    });

    it('should deep merge old value into new value if preserve is true', () => {
      var b = Binding.init(Map({ root: Map({ key1: Map({ key2: 1, key4: 'bar' }) }) }));
      b.merge('root', true, Map({ key1: Map({ key2: 0 }), key3: 'foo' }));
      assert.isTrue(b.get('root').equals(Map({ key1: Map({ key2: 1, key4: 'bar' }), key3: 'foo' })));
    });

    it('should replace old value with new value by default for non-mergeable values', () => {
      var b = Binding.init(Map({ root: 0 }));
      b.merge('root', 1);
      assert.strictEqual(b.get('root'), 1);
    });

    it('should replace keep old value for non-mergeable values if preserve is true', () => {
      var b = Binding.init(Map({ root: 0 }));
      b.merge('root', true, 1);
      assert.strictEqual(b.get('root'), 0);
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.merge(1);
      assert.strictEqual(b.get('key1.key2'), 1);
    });

    it('should accept subpath as a string or an array', () => {
      var b1 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b1.merge('key1.key2', 1);

      var b2 = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      b2.merge(['key1', 'key2'], 1);

      assert.strictEqual(b1.get('key1.key2'), 1);
      assert.strictEqual(b2.get('key1.key2'), 1);
    });

    it('should notify appropriate listeners', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.merge('key1.key2', 1);
      assert.deepEqual(args, [['key2'], true, Map({ key2: 0 })]);
    });

    it('should not notify listeners if value isn\'t changed', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var listenerCalled = false;
      b.addListener('key1', () => { listenerCalled = true; });
      b.merge('key1.key2', 0);
      assert.isFalse(listenerCalled);
    });
  });

  describe('#clear(subpath)', () => {
    it('should return this binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var b2 = b.clear('key');
      assert.strictEqual(b2, b);
    });

    it('should do nothing on non-existent subpath', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var originalValue = b.get();
      b.clear('non.existent');
      assert.strictEqual(b.get(), originalValue);
    });

    it('should clear existent associative or nullify otherwise', () => {
      var b = Binding.init(Map({
        key1: Map({ key2: 0 }),
        key2: List.of(1, 2, 3)
      }));
      b.clear('key1');
      assert.strictEqual(b.get('key1').count(), 0);
      b.clear('key2');
      assert.strictEqual(b.get('key2').count(), 0);
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var sub = b.sub('key1');
      sub.clear();
      assert.strictEqual(b.get('key1').count(), 0);
    });

    it('should accept subpath as a string or an array', () => {
      var b = Binding.init(
        Map({
            root: Map({
              key1: Map({ 'key2': 0 }),
              key2: List.of(1, 2, 3)
            })
          }
        ));
      b.clear('root.key1');
      assert.strictEqual(b.get('root.key1').count(), 0);
      b.clear(['root', 'key2']);
      assert.strictEqual(b.get('root.key2').count(), 0);
    });

    it('should notify appropriate listeners', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 1 }) }));
      var args = [];
      b.addListener('key1', function (changes) {
        args = [changes.getPath(), changes.isValueChanged(), changes.getPreviousValue()];
      });
      b.clear('key1.key2');
      assert.deepEqual(args, [['key2'], true, Map({ key2: 1 })]);
    });
  });

  describe('#addListener(path, cb)', () => {
    it('should return different ids for each listener', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var id1 = b.addListener(() => {});
      var id2 = b.addListener(() => {});
      assert.notStrictEqual(id1, id2);
    });

    it('should accept path as a string or an array', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var firstListenerCalled = 0, secondListenerCalled = 0;
      b.addListener('key', () => { firstListenerCalled++; });
      b.addListener(['key'], () => { secondListenerCalled++; });
      b.set('key', 'foo');
      assert.strictEqual(firstListenerCalled, 1);
      assert.strictEqual(secondListenerCalled, 1);
    });
  });

  describe('#addGlobalListener(cb)', () => {
    it('global listener should be notified on any change', () => {
      var b = Binding.init(Map({ key1: 'value1' }));
      var listenerCalled = 0;
      b.addGlobalListener(() => { listenerCalled++; });
      b.set('key1', 'foo');
      b.set('key2', 'value2');
      assert.strictEqual(listenerCalled, 2);
    });

    it('global listener should be notified first', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var listeners = [];
      b.addListener('key', () => { listeners.push('l1'); });
      b.addGlobalListener(() => { listeners.push('g'); });
      b.addListener('key', () => { listeners.push('l2'); });
      b.set('key', 'foo');
      assert.deepEqual(listeners, ['g', 'l1', 'l2']);
    });

    it('global listener should be notified when meta binding is changed', () => {
      var b = Binding.init(Map(), Binding.init(Map()));
      var args = [];
      b.addGlobalListener(function (changes) {
        args = [
          changes.getPath(),
          changes.isValueChanged(), changes.isMetaChanged(),
          changes.getPreviousValue(), changes.getPreviousMeta()
        ];
      });
      b.meta().set('meta');
      assert.deepEqual(args, [[], false, true, null, Map()]);
    });

    it('global listener should not be notified when meta binding isn\'t changed', () => {
      var b = Binding.init(Map(), Binding.init(Map()));
      var listenerCalled = false;
      b.meta().set('meta');
      b.addGlobalListener(() => { listenerCalled = true; });
      b.meta().set('meta');
      assert.isFalse(listenerCalled);
    });

    it('global listener should be notified when meta-meta-binding is changed', () => {
      var b = Binding.init(Map());
      var metaB = b.meta();
      var metaMetaB = metaB.meta();

      var args = [];
      b.addGlobalListener(function (changes) {
        args = [
          changes.getPath(),
          changes.isValueChanged(), changes.isMetaChanged(),
          changes.getPreviousValue(), changes.getPreviousMeta()
        ];
      });
      metaMetaB.set('meta');
      assert.deepEqual(args, [[], false, true, null, Map()]);
    });

    it('global listener should be notified when meta-meta-meta-binding is changed', () => {
      var b = Binding.init(Map());
      var metaB = b.meta();
      var metaMetaB = metaB.meta();
      var metaMetaMetaB = metaMetaB.meta();

      var args = [];
      b.addGlobalListener(function (changes) {
        args = [
          changes.getPath(),
          changes.isValueChanged(), changes.isMetaChanged(),
          changes.getPreviousValue(), changes.getPreviousMeta()
        ];
      });
      metaMetaMetaB.set('meta');
      assert.deepEqual(args, [[], false, true, null, Map()]);
    });
  });

  describe('#enableListener(listenerId)', () => {
    it('should return this binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerId = b.addListener('key', () => {});
      var b2 = b.enableListener(listenerId);
      assert.strictEqual(b2, b);
    });

    it('should re-enable previousely disabled listener', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerCalled = false;
      var listenerId = b.addListener('key', () => {
        listenerCalled = true;
      });
      b.disableListener(listenerId);
      b.enableListener(listenerId);
      b.set('key', 'foo');
      assert.isTrue(listenerCalled);
    });
  });

  describe('#disableListener(listenerId)', () => {
    it('should return this binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerId = b.addListener('key', () => {});
      var b2 = b.disableListener(listenerId);
      assert.strictEqual(b2, b);
    });

    it('should disable listener', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerCalled = false;
      var listenerId = b.addListener('key', () => {
        listenerCalled = true;
      });
      b.disableListener(listenerId);
      b.set('key', 'foo');
      assert.isFalse(listenerCalled);
    });
  });

  describe('#withDisabledListener(listenerId, f)', () => {
    it('should return this binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerId = b.addListener('key', () => {});
      var b2 = b.withDisabledListener(listenerId, () => {});
      assert.strictEqual(b2, b);
    });

    it('should execute function with listener muted', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var listenerCalled = false;
      var listenerId = b.addListener('key', () => {
        listenerCalled = true;
      });
      b.withDisabledListener(listenerId, () => {
        b.set('key', 'foo');
      });
      assert.isFalse(listenerCalled);
    });
  });

  describe('#removeListener(id)', () => {
    it('should return false on non-existent listener id', () => {
      var b = Binding.init(Map({ key: 'value' }));
      assert.isFalse(b.removeListener('missing'));
    });

    it('should return true when listener exists and false on subsequent calls for same listener id', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var id = b.addListener('key', () => {});
      assert.isTrue(b.removeListener(id));
      assert.isFalse(b.removeListener(id));
      assert.isFalse(b.removeListener(id));
    });
  });

  describe('#atomically()', () => {
    it('should return new transaction context', () => {
      var tx1 = Binding.init().atomically();
      var tx2 = Binding.init().atomically();
      assert.isNotNull(tx1);
      assert.isNotNull(tx2);
      assert.notStrictEqual(tx1, tx2);
    });
  });

  describe('#asArrayPath(pathAsString)', () => {
    it('should return array argument as is', () => {
      var arrayPath = ['foo', 'bar'];
      assert.strictEqual(Binding.asArrayPath(arrayPath), arrayPath);
    });

    it('should return empty array if passed empty string', () => {
      assert.deepEqual(Binding.asArrayPath(''), []);
    });

    it('should convert string path to array path', () => {
      assert.deepEqual(Binding.asArrayPath('foo.bar'), ['foo', 'bar']);
    });
  });

  describe('#asStringPath(pathAsAnArray)', () => {
    it('should return string argument as is', () => {
      var stringPath = 'foo.bar';
      assert.strictEqual(Binding.asStringPath(stringPath), stringPath);
    });

    it('should return empty string if passed empty array', () => {
      assert.strictEqual(Binding.asStringPath([]), '');
    });

    it('should convert array path to string path', () => {
      assert.strictEqual(Binding.asStringPath(['foo', 'bar']), 'foo.bar');
    });
  });

  describe('#META_NODE', () => {
    it('should be equal to __meta__', () => {
      assert.strictEqual(Binding.META_NODE, '__meta__');
    });
  });

});

describe('TransactionContext', () => {
  describe('#update(subpath, binding, f)', () => {
    it('should modify binding value on commit', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var value = b.get();
      var tx = b.atomically().update('key', Util.constantly('foo'));
      assert.strictEqual(b.get(), value);
      tx.commit();
      assert.isTrue(b.get().equals(Map({ key: 'foo' })));
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().update(Util.constantly('foo')).commit();
      assert.isTrue(b.get().equals(Map({ key: 'foo' })));
    });

    it('can supply alternative binding that shares same backing value', () => {
      var b = Binding.init(Map({ key: 'value' }));
      b.atomically().update(b.sub('key'), Util.constantly('foo')).commit();
      assert.isTrue(b.get().equals(Map({ key: 'foo' })));
    });

    it('should return this', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.update('key', Util.constantly('foo')), tx);
    });
  });

  describe('#set(subpath, binding, newValue)', () => {
    it('should modify binding value on commit', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var value = b.get();
      var tx = b.atomically().set('key', 'foo');
      assert.strictEqual(b.get(), value);
      tx.commit();
      assert.isTrue(b.get().equals(Map({ key: 'foo' })));
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().set('foo').commit();
      assert.isTrue(b.get().equals(Map({ key: 'foo' })));
    });

    it('can supply alternative binding that shares same backing value', () => {
      var b = Binding.init(Map({ key: 'value' }));
      b.atomically().set(b.sub('key'), 'foo').commit();
      assert.isTrue(b.get().equals(Map({ key: 'foo' })));
    });

    it('should return this', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.set('key', 'foo'), tx);
    });
  });

  describe('#delete(subpath, binding)', () => {
    it('should modify binding value on commit', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var value = b.get();
      var tx = b.atomically().delete('key');
      assert.strictEqual(b.get(), value);
      tx.commit();
      assert.strictEqual(b.get().count(), 0);
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var sub = b.sub('key');
      sub.atomically().delete().commit();
      assert.strictEqual(b.get().count(), 0);
    });

    it('can supply alternative binding that shares same backing value', () => {
      var b = Binding.init(Map({ key: 'value' }));
      b.atomically().delete(b.sub('key')).commit();
      assert.strictEqual(b.get().count(), 0);
    });

    it('should return this', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.delete('key'), tx);
    });
  });

  describe('#merge(subpath, preserve, binding, newValue)', () => {
    it('should modify binding value on commit', () => {
      var b = Binding.init(Map({ root: Map({ key: 'value' }) }));
      var value = b.get();
      var tx = b.atomically().merge('root', Map({ key2: 'value2' }));
      assert.strictEqual(b.get(), value);
      tx.commit();
      assert.isTrue(b.get('root').equals(Map({ key: 'value', key2: 'value2' })));
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ key1: Map({ key2: 0 }) }));
      var sub = b.sub('key1.key2');
      sub.atomically().merge(1).commit();
      assert.strictEqual(b.get('key1.key2'), 1);
    });

    it('can supply alternative binding that shares same backing value', () => {
      var b = Binding.init(Map({ key: 'value' }));
      b.atomically().merge(b.sub('key'), 'foo').commit();
      assert.isTrue(b.get().equals(Map({ key: 'foo' })));
    });

    it('should return this', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var tx = b.atomically();
      assert.strictEqual(tx.merge('root', Map({ key2: 'value2' })), tx);
    });
  });

  describe('#clear(subpath, binding)', () => {
    it('should clear binding value on commit', () => {
      var b = Binding.init(Map({ root: Map({ key: 'value' }) }));
      var value = b.get();
      var tx = b.atomically().clear('root');
      assert.strictEqual(b.get('root').count(), 1);
      tx.commit();
      assert.strictEqual(b.get('root').count(), 0);
    });

    it('can omit subpath for sub-binding', () => {
      var b = Binding.init(Map({ root: Map({ key: 'value' }) }));
      var sub = b.sub('root');
      sub.atomically().clear().commit();
      assert.strictEqual(b.get('root').count(), 0);
    });

    it('can supply alternative binding that shares same backing value', () => {
      var b = Binding.init(Map({ root: Map({ key: 'value' }) }));
      b.atomically().clear(b.sub('root')).commit();
      assert.strictEqual(b.get('root').count(), 0);
    });

    it('should return this', () => {
      var b = Binding.init(Map({ root: Map({ key: 'value' }) }));
      var tx = b.atomically();
      assert.strictEqual(tx.clear('root'), tx);
    });
  });

  describe('#commit()', () => {
    it('should throw on recurrent commit', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var tx = b.atomically().delete('key');
      tx.commit();
      assert.throws(
        () => { tx.commit(); }, Error, 'Transaction already committed'
      );
    });

    it('should not notify listeners if notify option is false', () => {
      var b = Binding.init(Map({ key: 'value' }));
      var globalListenerCalled = false, listenerCalled = false;
      b.addGlobalListener(() => { globalListenerCalled = true; });
      b.addListener('key', () => { listenerCalled = true; });
      b.atomically().delete('key').commit({ notify: false });
      assert.isFalse(globalListenerCalled);
      assert.isFalse(listenerCalled);
    });

    it('should notify each appropriate listener once', () => {
      var b = Binding.init(Map({ key1: Map({ key2: Map({ key3: 'foo' }) }) }));
      var globalListenerCalled = 0;
      var upperListenerCalled = 0, lowerListenerCalled = 0;
      var irrelevantListenerCalled = 0;

      b.addGlobalListener(() => { globalListenerCalled++; });
      b.addListener('key1', () => { upperListenerCalled++; });
      b.addListener('key1.key2.key3', () => { lowerListenerCalled++; });
      b.addListener('missing', () => { irrelevantListenerCalled++; });
      b.atomically().delete('key1.key2').commit();

      assert.strictEqual(globalListenerCalled, 1);
      assert.strictEqual(upperListenerCalled, 1);
      assert.strictEqual(lowerListenerCalled, 1);
      assert.strictEqual(irrelevantListenerCalled, 0);
    });

    it('should notify listener once for intersecting paths using most common path', () => {
      var b = Binding.init(Map({ key1: Map({ key2: Map({ key3: 'foo' }) }) }));
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

    it('should notify listener once for sibling paths', () => {
      var b = Binding.init(Map({ key: List.of() }));
      var sub = b.sub('key');

      var listenerCalled = 0;
      sub.addGlobalListener(function() { listenerCalled++; });
      sub.atomically().set(0, 0).set(1, 1).set(2, 2).commit();

      assert.strictEqual(listenerCalled, 1);
    });

    it('should allow to modify state and meta state within single transaction', () => {
      var metaB = Binding.init(Map({ key: 'meta1' }));
      var b = Binding.init(Map({ key: 'value' }), metaB);

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



