var assert = require('chai').assert;
var sinon = require('sinon');
var domino = require('domino');
var Imm = require('immutable');
var IMap = Imm.Map;
var Morearty = require('../src/Morearty');
var Util = require('../src/Util');

var requireReact = function () {
  var window = domino.createWindow('<div id="root"></div>');
  global.window = window;
  global.document = window.document;
  global.navigator = global.window.navigator;
  return require('react/addons');
};

var React = requireReact();

var createCtx, createComp, createFactory, addContext;

createCtx = function (initialState, configuration) {
  return Morearty.createContext(initialState || {}, configuration || {});
};

createComp = function () {
  return {
    forceUpdate: function () {},
    isMounted: Util.constantly(true)
  };
};

createFactory = function (ctx, spec) {
  spec.mixins = [Morearty.Mixin];
  var reactClass = React.createClass(spec);
  return React.createFactory(reactClass);
};

addContext = function (ctx, cb) {
  return React.withContext({ morearty: ctx }, cb);
};

describe('Morearty', function () {

  it('should expose modules', function () {
    assert.isObject(Morearty);
    assert.isObject(Morearty.Util);
    assert.isObject(Morearty.Callback);
    assert.isObject(Morearty.MergeStrategy);
    assert.isFunction(Morearty.createContext);
  });

  describe('#createContext(React, initialState, configuration)', function () {
    it('should accept initial state as a JavaScript object', function () {
      var initialState = { foo: 'bar' };
      var ctx = createCtx(initialState);
      assert.isTrue(Imm.fromJS(initialState).equals(ctx.getCurrentState()));
    });

    it('should accept initial state as an immutable object', function () {
      var initialState = Imm.Map({ foo: 'bar' });
      var ctx = createCtx(initialState);
      assert.isTrue(initialState.equals(ctx.getCurrentState()));
    });
  });

  describe('Context', function () {

    describe('#getBinding()', function () {
      it('should return current state binding', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);
        assert.strictEqual(ctx.getBinding().get(), initialState);
      });
    });

    describe('#getCurrentState()', function () {
      it('should return current state', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);
        assert.strictEqual(ctx.getCurrentState(), initialState);
      });
    });

    describe('#getPreviousState()', function () {
      it('should return null on new context', function () {
        var ctx = createCtx(IMap({ key: 'value' }));
        assert.isNull(ctx.getPreviousState());
      });

      it('should return previous state after state transition', function () {
        var rootComp = createComp();
        var ctx = createCtx(IMap({ key: 'value' }));
        ctx.init(rootComp);

        var clazz = createFactory(ctx, {
          render: function () { return null; }
        });

        React.render(clazz({ binding: ctx.getBinding() }), global.document.getElementById('root'));

        var previousState = ctx.getCurrentState();
        ctx.getBinding().set('key2', 'value2');
        assert.strictEqual(ctx.getPreviousState(), previousState);
      });
    });

    describe('#resetState(notifyListeners, subpath)', function () {
      it('should reset strictly to initial state if initial state is immutable data structure', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key2', 'value2');
        assert.isTrue(ctx.getCurrentState().equals(IMap({ key1: 'value1', key2: 'value2' })));
        ctx.resetState();
        assert.strictEqual(ctx.getCurrentState(), initialState);
      });

      it('should reset to initial state if initial state is JavaScript object', function () {
        var rootComp = createComp();
        var initialState = { key1: 'value1' };
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key2', 'value2');
        assert.isTrue(ctx.getCurrentState().equals(IMap({ key1: 'value1', key2: 'value2' })));
        ctx.resetState();
        assert.isTrue(ctx.getCurrentState().equals(IMap(initialState)));
      });

      it('should notify listeners by default', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key1', 'value2');

        var globalListenerCalled = false, listenerCalled = false;
        var state = ctx.getBinding();
        state.addGlobalListener(function () { globalListenerCalled = true; });
        state.addListener('key1', function () { listenerCalled = true; });

        ctx.resetState();
        assert.isTrue(globalListenerCalled);
        assert.isTrue(listenerCalled);
      });

      it('should not notify listeners if notifyListeners is false', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key1', 'value2');

        var globalListenerCalled = false, listenerCalled = false;
        var state = ctx.getBinding();
        state.addGlobalListener(function () { globalListenerCalled = true; });
        state.addListener('key1', function () { listenerCalled = true; });

        ctx.resetState(false);
        assert.isFalse(globalListenerCalled);
        assert.isFalse(listenerCalled);
      });

      it('should reset state at subpath if supplied', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: IMap({ key2: 'foo' }) });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().atomically()
          .set('key1.key2', 'bar')
          .set('key3', 'something')
          .commit();

        assert.isTrue(ctx.getCurrentState().equals(IMap({ key1: IMap({ key2: 'bar' }), key3: 'something' })));
        ctx.resetState('key1.key2');
        assert.isTrue(ctx.getCurrentState().equals(IMap({ key1: IMap({ key2: 'foo' }), key3: 'something' })));
      });
    });

    describe('#replaceState(newState, notifyListeners)', function () {
      it('should replace state with new value', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key2', 'value2');
        assert.isTrue(ctx.getCurrentState().equals(IMap({ key1: 'value1', key2: 'value2' })));

        var newState = IMap({ key3: 'value3' });
        ctx.replaceState(newState);
        assert.strictEqual(ctx.getCurrentState(), newState);
      });

      it('should notify listeners by default', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        var globalListenerCalled = false, listenerCalled = false;
        var state = ctx.getBinding();
        state.addGlobalListener(function () { globalListenerCalled = true; });
        state.addListener('key1', function () { listenerCalled = true; });

        ctx.replaceState(IMap({ key3: 'value3' }));
        assert.isTrue(globalListenerCalled);
        assert.isTrue(listenerCalled);
      });

      it('should not notify listeners if notifyListeners is false', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        var globalListenerCalled = false, listenerCalled = false;
        var state = ctx.getBinding();
        state.addGlobalListener(function () { globalListenerCalled = true; });
        state.addListener('key1', function () { listenerCalled = true; });

        ctx.replaceState(IMap({ key3: 'value3' }), false);
        assert.isFalse(globalListenerCalled);
        assert.isFalse(listenerCalled);
      });
    });

    describe('#isChanged(binding, subpath, compare)', function () {
      it('should return true if binding value was changed', function () {
        var rootComp = createComp();
        var initialState = IMap({ key: 'initial' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key', 'value1');
        assert.isTrue(ctx.isChanged(ctx.getBinding()));
      });

      it('should return false if binding value was not changed', function () {
        var rootComp = createComp();
        var initialState = IMap({ root: IMap({ key1: 'initial', key2: 'value2' }) });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('root.key1', 'value1');
        assert.isFalse(ctx.isChanged(ctx.getBinding().sub('key2')));
      });

      it('should accept subpath as a string or an array', function () {
        var rootComp = createComp();
        var initialState = IMap({ root: IMap({ key: 'initial' }) });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('root.key', 'value1');
        assert.isTrue(ctx.isChanged(ctx.getBinding(), 'root.key'));
        assert.isTrue(ctx.isChanged(ctx.getBinding(), ['root', 'key']));
      });

      it('should accept optional compare function', function () {
        var rootComp = createComp();
        var initialState = IMap({ key: 'initial', ignoredKey: 'foo' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        var compare = function (currentValue, oldValue) {
          return currentValue.get('key') === oldValue.get('key');
        };

        ctx.getBinding().set('ignoredKey', 'bar');
        assert.isFalse(ctx.isChanged(ctx.getBinding(), compare));
        ctx.getBinding().set('key', 'value1');
        assert.isTrue(ctx.isChanged(ctx.getBinding(), compare));
      });

      it('should return false if new value is the same as previous', function () {
        var rootComp = createComp();
        var initialState = Imm.fromJS({ key: 'initial', v: [{x: 1}, {x: 2}] });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);
        var b = ctx.getBinding();

        b.set('v.0', IMap({x: 1}));
        assert.isFalse(ctx.isChanged(b, 'v'));

        b.set('v.0.x', 1);
        assert.isFalse(ctx.isChanged(b, 'v'));
        assert.isFalse(ctx.isChanged(b, 'v.0.x'));
      });
    });

    describe('#init(rootComp)', function () {
      it('should call forceUpdate() on each render', function () {
        var rootComp = createComp();
        var mock = sinon.mock(rootComp);
        mock.expects('forceUpdate').twice();

        var ctx = createCtx();
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value');
        ctx.getBinding().set('key2', 'value2');
        mock.verify();
      });

      it('should not call forceUpdate() if state value isn\'t changed', function () {
        var rootComp = createComp();
        var mock = sinon.mock(rootComp);
        mock.expects('forceUpdate').never();

        var ctx = createCtx(IMap({ key: 'value' }));
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value');
        ctx.getBinding().update('key', Util.identity);
        mock.verify();
      });

      it('should render using requestAnimationFrame if enabled and available', function (done) {
        var requestAnimationFrameCalled = false;
        var originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function (f) {
          f();
          requestAnimationFrameCalled = true;
        };

        var rootComp = createComp();

        var ctx = createCtx({}, {
          requestAnimationFrameEnabled: true
        });
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value');

        setTimeout(function () {
          assert.isTrue(requestAnimationFrameCalled);
          window.requestAnimationFrame = originalRAF;
          done();
        }, 20);
      });

      it('should skip render errors by default', function () {
        var rootComp = createComp();
        rootComp.forceUpdate = function () {
          throw new Error('render error');
        };

        var ctx = createCtx({});
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value');

        assert.isTrue(true);
      });

      it('should stop on render errors if stopOnRenderError configuration parameter is true', function () {
        var rootComp = createComp();
        rootComp.forceUpdate = function () {
          throw new Error('render error');
        };

        var ctx = createCtx({}, {
          stopOnRenderError: true
        });
        ctx.init(rootComp);

        assert.throws(
          function () { ctx.getBinding().set('key', 'value'); }, Error, 'render error'
        );
      });
    });

  });

  describe('Mixin', function () {
    describe('#shouldComponentUpdate(nextProps, nextState)', function () {
      it('should provide shouldComponentUpdate method', function () {
        var ctx = createCtx(IMap({ root: IMap() }));

        var shouldComponentUpdate = null;

        var appComp = createFactory(ctx, {
          render: function () {
            shouldComponentUpdate = this.shouldComponentUpdate;
            return null;
          }
        });

        var bootstrapComp = createFactory(ctx, {
          componentWillMount: function () {
            ctx.init(this);
          },

          render: function () {
            return addContext(ctx, function () { return appComp({ binding: ctx.getBinding() }); });
          }
        });

        React.render(bootstrapComp(), global.document.getElementById('root'));
        assert.isFunction(shouldComponentUpdate);
      });

      it('should return true if state is changed or full update was queued, false otherwise', function () {
        var ctx = createCtx(IMap({ root: IMap({ key1: 'value1', key2: 'value2' }) }));

        var shouldUpdate = [];

        var subComp = createFactory(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            var result = shouldComponentUpdate();
            shouldUpdate.push(result);
            return result;
          },

          render: function () {
            return null;
          }
        });

        var rootComp = createFactory(ctx, {
          render: function () {
            var binding = this.getDefaultBinding();
            return subComp({ binding: binding.sub('root.key1') });
          }
        });

        var bootstrapComp = createFactory(ctx, {
          componentWillMount: function () {
            ctx.init(this);
          },

          render: function () {
            return addContext(ctx, function () { return rootComp({ binding: ctx.getBinding() }); });
          }
        });

        React.render(bootstrapComp(), global.document.getElementById('root'));
        ctx.getBinding().set('root.key1', 'foo');
        ctx.getBinding().set('root.key2', 'bar');
        ctx.queueFullUpdate();
        ctx.getBinding().set('root.key3', 'baz');
        assert.deepEqual(shouldUpdate, [true, false, true]);
      });

      it('should allow to override shouldComponentUpdate with shouldComponentUpdateOverride method', function () {
        var ctx = createCtx(IMap({ root: IMap() }));

        var called = false;
        var appComp = createFactory(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            assert.isFunction(shouldComponentUpdate);
            called = true;
            return shouldComponentUpdate();
          },

          render: function () {
            return null;
          }
        });

        var bootstrapComp = createFactory(ctx, {
          componentWillMount: function () {
            ctx.init(this);
          },

          render: function () {
            return addContext(ctx, function () {
              return appComp({ binding: ctx.getBinding() });
            });
          }
        });

        React.render(bootstrapComp(), global.document.getElementById('root'));
        ctx.getBinding().set('root.key1', 'foo');
        assert.isTrue(called);
      });

      it('should consider each non-null binding in multi-binding component', function () {
        var ctx = createCtx(IMap({ root: IMap({ key1: 'value1', key2: 'value2' }) }));
        var binding = ctx.getBinding();

        var shouldUpdate = [];

        var subComp = createFactory(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            var result = shouldComponentUpdate();
            shouldUpdate.push(result);
            return result;
          },

          render: function () {
            return null;
          }
        });

        var rootComp = createFactory(ctx, {
          render: function () {
            var binding = this.getDefaultBinding();
            return subComp({
              binding: {
                default: binding.sub('root.key1'),
                alt: binding.sub('root.key2'),
                bad: null
              }
            });
          }
        });

        var bootstrapComp = createFactory(ctx, {
          componentWillMount: function () {
            ctx.init(this);
          },

          render: function () {
            return addContext(ctx, function () { return rootComp({ binding: binding }); });
          }
        });

        React.render(bootstrapComp(), global.document.getElementById('root'));
        binding.set('root.key1', 'foo');
        binding.set('root.key2', 'bar');
        binding.set('root.key3', 'baz');
        assert.deepEqual(shouldUpdate, [true, true, false]);
      });
    });

    describe('#getBinding(name)', function () {
      it('should return correct value', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);

        var binding = null;

        var clazz = createFactory(ctx, {
          render: function () {
            binding = this.getBinding();
            return null;
          }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.isNotNull(binding);
        assert.strictEqual(binding.get(), 'value');
      });

      it('should return correct values for multi-binding state', function () {
        var initialState = IMap({ key1: 'value1', key2: 'value2' });
        var ctx = createCtx(initialState);

        var binding1 = null, binding2 = null;

        var clazz = createFactory(ctx, {
          render: function () {
            binding1 = this.getBinding('binding1');
            binding2 = this.getBinding('binding2');
            return null;
          }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({
              binding: { binding1: ctx.getBinding().sub('key1'), binding2: ctx.getBinding().sub('key2') }
            });
          }),
          global.document.getElementById('root')
        );

        assert.isNotNull(binding1);
        assert.strictEqual(binding1.get(), 'value1');
        assert.isNotNull(binding2);
        assert.strictEqual(binding2.get(), 'value2');
      });
    });

    describe('#getDefaultBinding()', function () {
      it('should return single binding for single-binding component', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);

        var binding = null;

        var clazz = createFactory(ctx, {
          render: function () {
            binding = this.getDefaultBinding();
            return null;
          }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.isNotNull(binding);
        assert.strictEqual(binding.get(), 'value');
      });

      it('should return single binding for single-binding component (binding passed as an object)', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);

        var binding = null;

        var clazz = createFactory(ctx, {
          render: function () {
            binding = this.getDefaultBinding();
            return null;
          }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: { any: ctx.getBinding().sub('key') } });
          }),
          global.document.getElementById('root')
        );

        assert.isNotNull(binding);
        assert.strictEqual(binding.get(), 'value');
      });

      it('should return default binding for multi-binding component', function () {
        var initialState = IMap({ key: 'value', aux: 'foo' });
        var ctx = createCtx(initialState);

        var binding = null;

        var clazz = createFactory(ctx, {
          render: function () {
            binding = this.getDefaultBinding();
            return null;
          }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: { default: ctx.getBinding().sub('key'), aux: ctx.getBinding().sub('aux') } });
          }),
          global.document.getElementById('root')
        );

        assert.isNotNull(binding);
        assert.strictEqual(binding.get(), 'value');
      });
    });

    describe('#getPreviousState()', function () {
      it('should return correct value', function () {
        var ctx = createCtx(IMap({ root: IMap({ key: 'initial' }) }));

        var previousState = null;

        var subComp = createFactory(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            var result = shouldComponentUpdate;
            previousState = this.getPreviousState();
            return result;
          },

          render: function () { return null; }
        });

        var rootComp = createFactory(ctx, {
          render: function () {
            var binding = this.getBinding();
            return subComp({ binding: binding.sub('root.key') });
          }
        });

        var bootstrapComp = createFactory(ctx, {
          componentWillMount: function () {
            ctx.init(this);
          },

          render: function () {
            return addContext(ctx, function () { return rootComp({ binding: ctx.getBinding() }); });
          }
        });

        React.render(bootstrapComp(), global.document.getElementById('root'));
        ctx.getBinding().set('root.key', 'value1');
        assert.deepEqual(previousState, 'initial');
      });
    });

    describe('#getDefaultState()', function () {
      it('should deep merge on mount preserving existing values by default', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1' }) });
        var ctx = createCtx(initialState);

        var clazz = createFactory(ctx, {
          getDefaultState: function () {
            return IMap({ key1: 'foo', key2: 'value2' });
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'value1', key2: 'value2' })));
      });

      it('should overwrite existing values if merge strategy is OVERWRITE', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1' }) });
        var ctx = createCtx(initialState);

        var clazz = createFactory(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.OVERWRITE;
          },

          getDefaultState: function () {
            return IMap({ key1: 'foo', key2: 'value2' });
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'foo', key2: 'value2' })));
      });

      it('should overwrite existing empty values if merge strategy is OVERWRITE_EMPTY', function () {
        var initialState = IMap({ key: IMap() });
        var ctx = createCtx(initialState);

        var clazz = createFactory(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.OVERWRITE_EMPTY;
          },

          getDefaultState: function () {
            return IMap({ key1: 'value1', key2: 'value2' });
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'value1', key2: 'value2' })));
      });

      it('should keep existing non-empty values if merge strategy is OVERWRITE_EMPTY', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1' }) });
        var ctx = createCtx(initialState);

        var clazz = createFactory(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.OVERWRITE_EMPTY;
          },

          getDefaultState: function () {
            return IMap({ key1: 'foo', key2: 'value2' });
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'value1' })));
      });

      it('should deep merge on mount preserving existing values if merge strategy is MERGE_PRESERVE', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1' }) });
        var ctx = createCtx(initialState);

        var clazz = createFactory(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.MERGE_PRESERVE;
          },

          getDefaultState: function () {
            return IMap({ key1: 'foo', key2: 'value2' });
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'value1', key2: 'value2' })));
      });

      it('should deep merge on mount preserving new values if merge strategy is MERGE_REPLACE', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1', key2: 'value2' }) });
        var ctx = createCtx(initialState);

        var clazz = createFactory(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.MERGE_REPLACE;
          },

          getDefaultState: function () {
            return IMap({ key1: 'foo' });
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'foo', key2: 'value2' })));
      });

      it('should use custom merge function if merge strategy is function accepting current and default values', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1', key2: 'value2' }) });
        var defaultState = IMap({ key1: 'foo' });
        var ctx = createCtx(initialState);

        var currentValue = null, defaultValue = null;
        var clazz = createFactory(ctx, {
          getMergeStrategy: function () {
            return function (current, default_) {
              currentValue = current;
              defaultValue = default_;
              return IMap({ merge: 'result' });
            };
          },

          getDefaultState: function () {
            return defaultState;
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: ctx.getBinding().sub('key') });
          }),
          global.document.getElementById('root')
        );

        assert.strictEqual(currentValue, initialState.get('key'));
        assert.strictEqual(defaultValue, defaultState);
        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ merge: 'result' })));
      });

      it('should support multi-binding components', function () {
        var initialState = IMap({ default: null, aux: null});
        var ctx = createCtx(initialState);
        var binding = ctx.getBinding();

        var clazz = createFactory(ctx, {
          getDefaultState: function () {
            return {
              default: 'foo',
              aux: 'bar'
            };
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: { default: binding.sub('default'), aux: binding.sub('aux') } });
          }),
          global.document.getElementById('root')
        );

        assert.isTrue(binding.get().equals(IMap({ default: 'foo', aux: 'bar' })));
      });

    });

    describe('#getMergeStrategy()', function () {
      it('should support per-binding configuration', function () {
        var initialState = IMap({ default: 'default', aux: null});
        var ctx = createCtx(initialState);
        var binding = ctx.getBinding();

        var clazz = createFactory(ctx, {
          getMergeStrategy: function () {
            return {
              default: Morearty.MergeStrategy.MERGE_PRESERVE,
              aux: Morearty.MergeStrategy.MERGE_REPLACE
            };
          },

          getDefaultState: function () {
            return {
              default: 'foo',
              aux: 'bar'
            };
          },

          render: function () { return null; }
        });

        React.render(
          addContext(ctx, function () {
            return clazz({ binding: { default: binding.sub('default'), aux: binding.sub('aux') } });
          }),
          global.document.getElementById('root')
        );

        assert.isTrue(binding.get().equals(IMap({ default: 'default', aux: 'bar' })));
      });
    });

  });
});
