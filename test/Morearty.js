var assert = require('chai').assert;
var sinon = require('sinon');
var domino = require('domino');
var Imm = require('immutable');
var IMap = Imm.Map;
var Morearty = require('../src/Morearty');
var Util = require('../src/Util');
var Binding = require('../src/Binding');

var waitRender = function (f) {
  setTimeout(f, 20);
};

var requireReact = function () {
  var window = domino.createWindow('<div><div id="root"></div><div id="altRoot"></div></div>');
  global.window = window;
  global.document = window.document;
  global.navigator = global.window.navigator;
  return require('react/addons');
};

var React = requireReact();

var createCtx, createComp, createClass;

createCtx = function (initialState, initialMetaState, options) {
  return Morearty.createContext({
    initialState: initialState || {},
    initialMetaState: initialMetaState || {},
    options: options || { requestAnimationFrameEnabled: false }
  });
};

createComp = function () {
  var comp = function () { return React.DOM.h1(null, 'Morearty rocks!'); };
  comp.forceUpdate = function () {};
  comp.isMounted = Util.constantly(true);
  return comp;
};

createClass = function (ctx, spec) {
  spec.mixins = [Morearty.Mixin];
  return React.createClass(spec);
};

describe('Morearty', function () {

  it('should expose modules', function () {
    assert.isObject(Morearty);
    assert.isObject(Morearty.Util);
    assert.isObject(Morearty.Callback);
    assert.isObject(Morearty.MergeStrategy);
    assert.isFunction(Morearty.createContext);
  });

  describe('#createContext(spec)', function () {
    it('should accept initial state as a JavaScript object', function () {
      var initialState = { foo: 'bar' };
      var ctx = createCtx(initialState);
      assert.isTrue(Imm.fromJS(initialState).equals(ctx.getCurrentState()));
    });

    it('should support no-arg call', function () {
      var ctx = Morearty.createContext();
      assert.isTrue(IMap().equals(ctx.getCurrentState()));
      assert.isTrue(IMap().equals(ctx.getCurrentMeta()));
    });

    it('should accept initial state as an immutable object', function () {
      var initialState = Imm.Map({ foo: 'bar' });
      var ctx = createCtx(initialState);
      assert.isTrue(initialState.equals(ctx.getCurrentState()));
    });

    it('should accept initial meta state as a JavaScript object', function () {
      var initialState = { foo: 'bar' };
      var ctx = createCtx(initialState, initialState);
      assert.isTrue(Imm.fromJS(initialState).equals(ctx.getCurrentMeta()));
    });

    it('should accept initial meta state as an immutable object', function () {
      var initialState = Imm.Map({ foo: 'bar' });
      var ctx = createCtx(initialState, initialState);
      assert.isTrue(initialState.equals(ctx.getCurrentMeta()));
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

    describe('#getMetaBinding()', function () {
      it('should return meta binding instance', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);
        assert.isTrue(ctx.getMetaBinding() instanceof Binding);
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

      it('should return previous state after state transition', function (done) {
        var rootComp = createComp();
        var ctx = createCtx(IMap({ key: 'value' }));
        ctx.init(rootComp);

        var clazz = createClass(ctx, {
          render: function () { return null; }
        });

        React.render(React.createFactory(clazz)({ binding: ctx.getBinding() }), global.document.getElementById('root'));

        var previousState = ctx.getCurrentState();
        ctx.getBinding().set('key2', 'value2');
        waitRender(function () {
          assert.strictEqual(ctx.getPreviousState(), previousState);
          done();
        });
      });
    });

    describe('#getCurrentMeta()', function () {
      it('should return current meta state', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState, initialState);
        assert.strictEqual(ctx.getCurrentMeta(), initialState);
      });
    });

    describe('#getPreviousMeta()', function () {
      it('should return null on new context', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState, initialState);
        assert.isNull(ctx.getPreviousMeta());
      });

      it('should return previous meta state after meta state transition', function (done) {
        var rootComp = createComp();
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        var clazz = createClass(ctx, {
          render: function () { return null; }
        });

        React.render(React.createFactory(clazz)({ binding: ctx.getBinding() }), global.document.getElementById('root'));

        var previousMeta = ctx.getCurrentMeta();
        ctx.getBinding().meta().set('meta');
        waitRender(function () {
          assert.strictEqual(ctx.getPreviousMeta(), previousMeta);
          done();
        });
      });
    });

    describe('#copy()', function () {
      it('should create context sharing same bindings', function () {
        var ctx1 = createCtx();
        var ctx2 = ctx1.copy();
        assert.strictEqual(ctx1.getBinding(), ctx2.getBinding());
        assert.strictEqual(ctx1.getMetaBinding(), ctx2.getMetaBinding());
      });

      it('should allow state sharing between multiple root components', function (done) {
        var ctx1 = createCtx();
        var ctx2 = ctx1.copy();

        var b = ctx1.getBinding();

        var render1CalledTimes = 0, render2CalledTimes = 0;

        var comp1 = createClass(ctx1, {
          render: function () {
            render1CalledTimes++;
            return React.DOM.h1(null, this.getDefaultBinding().get('key'));
          }
        });

        var comp2 = createClass(ctx2, {
          render: function () {
            render2CalledTimes++;
            return React.DOM.h2(null, this.getDefaultBinding().get('key'));
          }
        });

        var bootstrap1 = React.createFactory(ctx1.bootstrap(comp1));
        var bootstrap2 = React.createFactory(ctx2.bootstrap(comp2));

        React.render(bootstrap1(), global.document.getElementById('root'));
        React.render(bootstrap2(), global.document.getElementById('altRoot'));

        b.set('key', 'bar');
        waitRender(function () {
          assert.strictEqual(render1CalledTimes, 2);
          assert.strictEqual(render2CalledTimes, 2);
          done();
        });
      });

      it('should support optional subpath', function (done) {
        var originalCtx = createCtx(IMap({root: IMap({key1: 'value1', key2: 'value2'})}));
        var ctx = originalCtx.copy('root');

        var shouldUpdate = [];

        var subComp = createClass(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            var result = shouldComponentUpdate();
            shouldUpdate.push(result);
            return result;
          },

          render: function () {
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            var binding = this.getDefaultBinding();
            return React.createFactory(subComp)({ binding: binding.sub('key1') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));
        ctx.getBinding().set('key1', 'foo');
        waitRender(function () {
          ctx.getBinding().set('key2', 'bar');

          waitRender(function () {
            ctx.queueFullUpdate();
            ctx.getBinding().set('key3', 'baz');

            waitRender(function () {
              assert.deepEqual(shouldUpdate, [true, false, true]);
              done();
            });
          });

        });
      });
    });

    describe('#resetState(subpath, options)', function () {
      it('should reset to initial state', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
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
        state.addListener(function () { globalListenerCalled = true; });
        state.addListener('key1', function () { listenerCalled = true; });

        ctx.resetState();
        assert.isTrue(globalListenerCalled);
        assert.isTrue(listenerCalled);
      });

      it('should not notify listeners if notify option is false', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key1', 'value2');

        var globalListenerCalled = false, listenerCalled = false;
        var state = ctx.getBinding();
        state.addListener(function () { globalListenerCalled = true; });
        state.addListener('key1', function () { listenerCalled = true; });

        ctx.resetState({ notify: false });
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

      it('should reset meta by default', function () {
        var rootComp = createComp();
        var initialMetaState = IMap({ __meta__: 'meta1' });

        var ctx = createCtx({ key: 'value' }, initialMetaState);
        ctx.init(rootComp);

        ctx.getBinding().meta().set('meta2');

        assert.isTrue(ctx.getCurrentMeta().equals(IMap({ __meta__: 'meta2' })));
        ctx.resetState();
        assert.strictEqual(ctx.getCurrentMeta(), initialMetaState);
      });

      it('should reset meta is resetMeta argument is true', function () {
        var rootComp = createComp();
        var initialMetaState = IMap({ __meta__: 'meta1' });

        var ctx = createCtx({ key: 'value' }, initialMetaState);
        ctx.init(rootComp);

        ctx.getBinding().meta().set('meta2');

        assert.isTrue(ctx.getCurrentMeta().equals(IMap({ __meta__: 'meta2' })));
        ctx.resetState({ resetMeta: true });
        assert.strictEqual(ctx.getCurrentMeta(), initialMetaState);
      });

      it('should not reset meta is resetMeta argument is false', function () {
        var rootComp = createComp();
        var initialMetaState = IMap({ __meta__: 'meta1' });

        var ctx = createCtx({ key: 'value' }, initialMetaState);
        ctx.init(rootComp);

        ctx.getBinding().meta().set('meta2');

        assert.isTrue(ctx.getCurrentMeta().equals(IMap({ __meta__: 'meta2' })));
        ctx.resetState({ resetMeta: false });
        assert.isTrue(ctx.getCurrentMeta().equals(IMap({ __meta__: 'meta2' })));
      });
    });

    describe('#replaceState(newState, metaState, options)', function () {
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
        state.addListener(function () { globalListenerCalled = true; });
        state.addListener('key1', function () { listenerCalled = true; });

        ctx.replaceState(IMap({ key3: 'value3' }));
        assert.isTrue(globalListenerCalled);
        assert.isTrue(listenerCalled);
      });

      it('should not notify listeners if notify option is false', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        var globalListenerCalled = false, listenerCalled = false;
        var state = ctx.getBinding();
        state.addListener(function () { globalListenerCalled = true; });
        state.addListener('key1', function () { listenerCalled = true; });

        ctx.replaceState(IMap({ key3: 'value3' }), { notify: false });
        assert.isFalse(globalListenerCalled);
        assert.isFalse(listenerCalled);
      });

      it('should replace meta state if supplied', function () {
        var rootComp = createComp();
        var initialState = IMap({ key1: 'value1' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key2', 'value2');
        assert.isTrue(ctx.getCurrentState().equals(IMap({ key1: 'value1', key2: 'value2' })));

        var newMetaState = IMap({ __meta__: 'meta' });
        ctx.replaceState(initialState, newMetaState);
        assert.strictEqual(ctx.getCurrentMeta(), newMetaState);
      });
    });

    describe('#isChanged(binding, subpath, compare)', function () {
      it('should return true if binding value was changed', function (done) {
        var rootComp = createComp();
        var initialState = IMap({ key: 'initial' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('key', 'value1');
        waitRender(function () {
          assert.isTrue(ctx.isChanged(ctx.getBinding()));
          done();
        });
      });

      it('should return false if binding value was not changed', function (done) {
        var rootComp = createComp();
        var initialState = IMap({ root: IMap({ key1: 'initial', key2: 'value2' }) });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('root.key1', 'value1');
        waitRender(function () {
          assert.isFalse(ctx.isChanged(ctx.getBinding().sub('key2')));
          done();
        });
      });

      it('should accept subpath as a string or an array', function (done) {
        var rootComp = createComp();
        var initialState = IMap({ root: IMap({ key: 'initial' }) });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        ctx.getBinding().set('root.key', 'value1');
        waitRender(function () {
          assert.isTrue(ctx.isChanged(ctx.getBinding(), 'root.key'));
          assert.isTrue(ctx.isChanged(ctx.getBinding(), ['root', 'key']));
          done();
        });
      });

      it('should accept optional compare function', function (done) {
        var rootComp = createComp();
        var initialState = IMap({ key: 'initial', ignoredKey: 'foo' });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);

        var compare = function (currentValue, previousValue) {
          return currentValue.get('key') === previousValue.get('key');
        };

        ctx.getBinding().set('ignoredKey', 'bar');
        waitRender(function () {
          assert.isFalse(ctx.isChanged(ctx.getBinding(), compare));
          ctx.getBinding().set('key', 'value1');
          waitRender(function () {
            assert.isTrue(ctx.isChanged(ctx.getBinding(), compare));
            done();
          });
        });
      });

      it('should return false if new value is the same as previous', function (done) {
        var rootComp = createComp();
        var initialState = Imm.fromJS({ key: 'initial', v: [{x: 1}, {x: 2}] });
        var ctx = createCtx(initialState);
        ctx.init(rootComp);
        var b = ctx.getBinding();

        b.set('v.0', IMap({x: 1}));
        waitRender(function () {
          assert.isFalse(ctx.isChanged(b, 'v'));

          b.set('v.0.x', 1);
          waitRender(function () {
            assert.isFalse(ctx.isChanged(b, 'v'));
            assert.isFalse(ctx.isChanged(b, 'v.0.x'));
            done();
          });
        });
      });
    });

    describe('#init(rootComp)', function () {
      it('should call forceUpdate() on each render', function (done) {
        var rootComp = createComp();
        var mock = sinon.mock(rootComp);
        mock.expects('forceUpdate').twice(); // + initial render

        var ctx = createCtx();
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value');

        waitRender(function () {
          mock.verify();
          done();
        });
      });

      it('should call forceUpdate() once ignoring further state changes if renderOnce option is true', function (done) {
        var rootComp = createComp();
        var mock = sinon.mock(rootComp);
        mock.expects('forceUpdate').once(); // only initial render

        var ctx = createCtx({}, {}, { renderOnce: true });
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value');

        waitRender(function () {
          mock.verify();
          done();
        });
      });

      it('should not call forceUpdate() if state value isn\'t changed', function () {
        var rootComp = createComp();
        var mock = sinon.mock(rootComp);
        mock.expects('forceUpdate').once(); // just initial render

        var ctx = createCtx(IMap({ key: 'value' }));
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value');
        ctx.getBinding().update('key', Util.identity);
        mock.verify();
      });

      it('should render using requestAnimationFrame if available', function (done) {
        var requestAnimationFrameCalled = false;
        var originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function (f) {
          f();
          requestAnimationFrameCalled = true;
        };

        var rootComp = createComp();

        var ctx = createCtx({}, {}, {
          requestAnimationFrameEnabled: true
        });
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value');

        waitRender(function () {
          assert.isTrue(requestAnimationFrameCalled);
          window.requestAnimationFrame = originalRAF;
          done();
        });
      });

      it('should merge adjacent renders into one', function (done) {
        var requestAnimationFrameCalledTimes = 0;
        var originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function (f) {
          setTimeout(function () {
            f();
            requestAnimationFrameCalledTimes++;
          }, 1000/60);
        };

        var rootComp = createComp();

        var ctx = createCtx({}, {}, {
          requestAnimationFrameEnabled: true
        });
        ctx.init(rootComp);
        ctx.getBinding().set('key', 'value1');
        ctx.getBinding().set('key', 'value2');

        waitRender(function () {
          assert.strictEqual(requestAnimationFrameCalledTimes, 1);
          window.requestAnimationFrame = originalRAF;
          done();
        });
      });

      it('should skip render errors by default', function (done) {
        var rootComp = createComp();
        var errorThrown = false, calledAfterError = false;
        rootComp.forceUpdate = function () {
          if (!errorThrown) {
            errorThrown = true;
            throw new Error('render error');
          } else {
            calledAfterError = true;
          }
        };

        var ctx = createCtx({});
        ctx.init(rootComp);

        assert.isTrue(errorThrown);

        ctx.getBinding().set('key', 'value');
        waitRender(function () {
          assert.isTrue(calledAfterError);
          done();
        });
      });

      it('should stop on render errors if stopOnRenderError option is true', function (done) {
        var rootComp = createComp();
        var stopped = false, calledAfterError = false;
        rootComp.forceUpdate = function () {
          if (!stopped) {
            stopped = true;
            throw new Error('render error');
          } else {
            calledAfterError = true;
          }
        };

        var ctx = createCtx({}, {}, { stopOnRenderError: true, requestAnimationFrameEnabled: false });

        ctx.init(rootComp);

        assert.isTrue(stopped);

        ctx.getBinding().set('key', 'value');
        waitRender(function () {
          assert.isFalse(calledAfterError);
          done();
        });
      });

      it('should render synchronously on init', function () {
        var rootComp = createComp();
        var forceUpdateCalled = false;
        rootComp.forceUpdate = function () {
          forceUpdateCalled = true;
        };

        var ctx = createCtx();
        ctx.init(rootComp);

        assert.isTrue(forceUpdateCalled);
      });

    });

    describe('#bootstrap(rootComp)', function () {
      it('should return Morearty bootstrap component ready for rendering', function () {
        var ctx = createCtx();
        var rootComp = createClass(ctx, {
          render: function () {
            return null;
          }
        });
        var Bootstrap = React.createFactory(ctx.bootstrap(rootComp));

        React.render(Bootstrap(), global.document.getElementById('root'));
        assert.isTrue(true);
      });
    });

  });

  describe('Mixin', function () {
    describe('#shouldComponentUpdate(nextProps, nextState)', function () {
      it('should provide shouldComponentUpdate method', function () {
        var ctx = createCtx(IMap({ root: IMap() }));

        var shouldComponentUpdate = null;

        var appComp = createClass(ctx, {
          render: function () {
            shouldComponentUpdate = this.shouldComponentUpdate;
            return null;
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(appComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));
        assert.isFunction(shouldComponentUpdate);
      });

      var subComponentUpdateScenario = function (done, o) {
        var ctx = createCtx(o.initialState);

        var shouldUpdate = [];

        var subComp = createClass(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            var result = shouldComponentUpdate();
            shouldUpdate.push(result);
            return result;
          },

          render: function () {
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            var binding = this.getDefaultBinding();
            return React.createFactory(subComp)({ binding: binding.sub('root.key1') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));
        o.test1(ctx);
        waitRender(function () {
          o.test2(ctx);

          waitRender(function () {
            o.test3(ctx);

            waitRender(function () {
              o.assert(shouldUpdate);
              done();
            });
          });

        });
      };

      it('should return true if state is changed or full update was queued, false otherwise', function (done) {
        subComponentUpdateScenario(done, {
          initialState: IMap({ root: IMap({ key1: 'value1', key2: 'value2' }) }),
          test1: function(ctx) { ctx.getBinding().set('root.key1', 'foo'); },
          test2: function(ctx) { ctx.getBinding().set('root.key2', 'bar'); },
          test3: function(ctx) {
            ctx.queueFullUpdate();
            ctx.getBinding().set('root.key2', 'baz');
          },
          assert: function(shouldUpdate) { assert.deepEqual(shouldUpdate, [true, false, true]);  }
        });
      });

      it('should return true if meta state is changed or full update was queued, false otherwise', function (done) {
        subComponentUpdateScenario(done, {
          initialState: IMap({ root: IMap({ key1: 'value1', key2: 'value2' }) }),
          test1: function(ctx) { ctx.getBinding().sub('root.key1').meta().set('x', 'y'); },
          test2: function(ctx) { ctx.getBinding().sub('root.key2').meta().set('x', 'yy'); },
          test3: function(ctx) {
            ctx.queueFullUpdate();
            ctx.getBinding().meta('root.key2').set('x', 'yyy');
          },
          assert: function(shouldUpdate) { assert.deepEqual(shouldUpdate, [true, false, true]);  }
        });
      });

      it('should return false if meta data for non-data-bound state is changed', function (done) {
        subComponentUpdateScenario(done, {
          initialState: IMap({ root: IMap({ key1: 'value1', key2: 'value2', key3: IMap({k:'v'}) }) }),
          test1: function(ctx) {
            ctx.getBinding().sub('root').meta().set('x', 'y');
          },
          test2: function(ctx) {
            ctx.getBinding().sub('root.key2').meta().set('x', 'yy');
          },
          test3: function(ctx) {
            ctx.getBinding().sub('root.key3.k').meta().set('x', 'yyy');
          },
          assert: function(shouldUpdate) { assert.deepEqual(shouldUpdate, [false, false, false]);  }
        });
      });

      it('should return false if data and meta data for non-data-bound state is changed', function (done) {
        subComponentUpdateScenario(done, {
          initialState: IMap({ root: IMap({ key1: 'value1', key2: 'value2', key3: 'value3' }) }),
          test1: function(ctx) {
            ctx.getBinding().set('root.key2', 'foo');
            ctx.getBinding().sub('root.key2').meta().set('x', 'y');
          },
          test2: function(ctx) {
            ctx.getBinding().sub('root.key2').meta().set('x', 'yy');
            ctx.getBinding().set('root.key2', 'bar');
          },
          test3: function(ctx) {
            var tc = ctx.getBinding().atomically().set('root.key2', 'baz');
            ctx.getBinding().sub('root.key2').meta().set('x', 'yyy');
            tc.commit();
          },
          assert: function(shouldUpdate) { assert.deepEqual(shouldUpdate, [false, false, false]);  }
        });
      });

      it('should return false if data and meta data for non-data-bound state is changed (different order of update)', function (done) {
        subComponentUpdateScenario(done, {
          initialState: IMap({ root: IMap({ key1: 'value1', key2: 'value2', key3: 'value3' }) }),
          test1: function(ctx) {
            ctx.getBinding().sub('root.key2').meta().set('x', 'y');
            ctx.getBinding().set('root.key2', 'foo');
          },
          test2: function(ctx) {
            ctx.getBinding().set('root.key2', 'bar');
            ctx.getBinding().sub('root.key2').meta().set('x', 'yy');
          },
          test3: function(ctx) {
            var tc = ctx.getBinding().atomically().set('root.key2', 'baz');
            ctx.getBinding().sub('root.key2').meta().set('x', 'yyy');
            tc.commit();
          },
          assert: function(shouldUpdate) { assert.deepEqual(shouldUpdate, [false, false, false]);  }
        });
      });


      it('should return true if meta state is changed', function (done) {
        var ctx = createCtx(IMap({ root: IMap({ key1: 'value1', key2: 'value2' }) }));

        var shouldUpdate = [];

        var subComp = createClass(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            var result = shouldComponentUpdate();
            shouldUpdate.push(result);
            return result;
          },

          render: function () {
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            var binding = this.getDefaultBinding();
            return React.createFactory(subComp)({ binding: binding.sub('root.key1') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));
        ctx.getBinding().set('root.key1', 'foo');
        waitRender(function () {
          ctx.getMetaBinding().set('root.key1', 'meta');

          waitRender(function () {
            assert.deepEqual(shouldUpdate, [true, true]);
            done();
          });
        });
      });

      it('should allow to override shouldComponentUpdate with shouldComponentUpdateOverride method', function (done) {
        var ctx = createCtx(IMap({ root: IMap() }));

        var called = false;
        var appComp = createClass(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            assert.isFunction(shouldComponentUpdate);
            called = true;
            return shouldComponentUpdate();
          },

          render: function () {
            return null;
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(appComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));
        ctx.getBinding().set('root.key1', 'foo');
        waitRender(function () {
          assert.isTrue(called);
          done();
        });
      });

      it('should consider each non-null binding in multi-binding component', function (done) {
        var ctx = createCtx(IMap({ root: IMap({ key1: 'value1', key2: 'value2' }) }));
        var binding = ctx.getBinding();

        var shouldUpdate = [];

        var subComp = createClass(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            var result = shouldComponentUpdate();
            shouldUpdate.push(result);
            return result;
          },

          render: function () {
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            var binding = this.getDefaultBinding();
            return React.createFactory(subComp)({
              binding: {
                default: binding.sub('root.key1'),
                alt: binding.sub('root.key2'),
                bad: null
              }
            });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));
        binding.set('root.key1', 'foo');
        waitRender(function () {
          binding.set('root.key2', 'bar');
          waitRender(function () {
            binding.set('root.key3', 'baz');

            waitRender(function () {
              assert.deepEqual(shouldUpdate, [true, true, false]);
              done();
            });
          });
        });
      });
    });

    describe('#getBinding(name)', function () {
      it('should return correct value', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);

        var binding = null;

        var comp = createClass(ctx, {
          render: function () {
            binding = this.getBinding().sub('key');
            return null;
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(comp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isNotNull(binding);
        assert.strictEqual(binding.get(), 'value');
      });

      it('should return correct values for multi-binding state', function () {
        var initialState = IMap({ key1: 'value1', key2: 'value2' });
        var ctx = createCtx(initialState);

        var binding1 = null, binding2 = null;

        var comp = createClass(ctx, {
          render: function () {
            binding1 = this.getBinding('binding1');
            binding2 = this.getBinding('binding2');
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({
              binding: { binding1: ctx.getBinding().sub('key1'), binding2: ctx.getBinding().sub('key2') }
            });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));
        React.render(bootstrapComp(), global.document.getElementById('root'));

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

        var comp = createClass(ctx, {
          render: function () {
            binding = this.getDefaultBinding();
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isNotNull(binding);
        assert.strictEqual(binding.get(), 'value');
      });

      it('should return single binding for single-binding component (binding passed as an object)', function () {
        var initialState = IMap({ key: 'value' });
        var ctx = createCtx(initialState);

        var binding = null;

        var comp = createClass(ctx, {
          render: function () {
            binding = this.getDefaultBinding();
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: { any: ctx.getBinding().sub('key') } });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isNotNull(binding);
        assert.strictEqual(binding.get(), 'value');
      });

      it('should return default binding for multi-binding component', function () {
        var initialState = IMap({ key: 'value', aux: 'foo' });
        var ctx = createCtx(initialState);

        var binding = null;

        var comp = createClass(ctx, {
          render: function () {
            binding = this.getDefaultBinding();
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: { default: ctx.getBinding().sub('key'), aux: ctx.getBinding().sub('aux') } });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isNotNull(binding);
        assert.strictEqual(binding.get(), 'value');
      });
    });

    describe('#getPreviousState()', function () {
      it('should return correct value', function (done) {
        var ctx = createCtx(IMap({ root: IMap({ key: 'initial' }) }));

        var previousState = null;

        var subComp = createClass(ctx, {
          shouldComponentUpdateOverride: function (shouldComponentUpdate) {
            var result = shouldComponentUpdate;
            previousState = this.getPreviousState();
            return result;
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            var binding = this.getBinding();
            return React.createFactory(subComp)({ binding: binding.sub('root.key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        ctx.getBinding().set('root.key', 'value1');
        waitRender(function () {
          assert.deepEqual(previousState, 'initial');
          done();
        });
      });
    });

    describe('#observedBindings', function () {
      it('should consider observed bindings in shouldComponentUpdate', function (done) {
        var initialState = IMap({ key1: 'value1', key2: 'value2' });
        var ctx = createCtx(initialState);

        var key2Binding = ctx.getBinding().sub('key2');
        var renderCalledTimes = 0;

        var subComp = createClass(ctx, {
          observedBindings: [key2Binding],
          render: function () {
            renderCalledTimes++;
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(subComp)({ binding: this.getBinding().sub('key1') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));
        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.strictEqual(renderCalledTimes, 1);

        key2Binding.set('foo');
        waitRender(function () {
          assert.strictEqual(renderCalledTimes, 2);
          done();
        });
      });
    });

    describe('#observeBinding(binding, cont)', function () {
      it('should add observed binding', function (done) {
        var initialState = IMap({ key1: 'value1', key2: 'value2' });
        var ctx = createCtx(initialState);

        var key2Binding = ctx.getBinding().sub('key2');
        var renderCalledTimes = 0;

        var subComp = createClass(ctx, {
          render: function () {
            this.observeBinding(key2Binding);
            renderCalledTimes++;
            return null;
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(subComp)({ binding: this.getBinding().sub('key1') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));
        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.strictEqual(renderCalledTimes, 1);

        key2Binding.set('foo');
        waitRender(function () {
          assert.strictEqual(renderCalledTimes, 2);
          done();
        });
      });

      it('should support optional function syntax', function (done) {
        var initialState = IMap({ key1: 'value1', key2: 'value2' });
        var ctx = createCtx(initialState);

        var key2Binding = ctx.getBinding().sub('key2');
        var renderCalledTimes = 0;

        var subComp = createClass(ctx, {
          render: function () {
            return this.observeBinding(key2Binding, function (value2) {
              renderCalledTimes++;
              assert.strictEqual(value2, 'value2');
              return null;
            });
          }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(subComp)({ binding: this.getBinding().sub('key1') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));
        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.strictEqual(renderCalledTimes, 1);

        key2Binding.set('foo');
        waitRender(function () {
          assert.strictEqual(renderCalledTimes, 2);
          done();
        });
      });
    });

    describe('#getDefaultState()', function () {
      it('should deep merge on mount preserving existing values by default', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1' }) });
        var ctx = createCtx(initialState);

        var comp = createClass(ctx, {
          getDefaultState: function () {
            return IMap({ key1: 'foo', key2: 'value2' });
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'value1', key2: 'value2' })));
      });

      it('should overwrite existing values if merge strategy is OVERWRITE', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1' }) });
        var ctx = createCtx(initialState);

        var comp = createClass(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.OVERWRITE;
          },

          getDefaultState: function () {
            return IMap({ key1: 'foo', key2: 'value2' });
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'foo', key2: 'value2' })));
      });

      it('should overwrite existing empty values if merge strategy is OVERWRITE_EMPTY', function () {
        var initialState = IMap({ key: IMap() });
        var ctx = createCtx(initialState);

        var comp = createClass(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.OVERWRITE_EMPTY;
          },

          getDefaultState: function () {
            return IMap({ key1: 'value1', key2: 'value2' });
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'value1', key2: 'value2' })));
      });

      it('should keep existing non-empty values if merge strategy is OVERWRITE_EMPTY', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1' }) });
        var ctx = createCtx(initialState);

        var comp = createClass(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.OVERWRITE_EMPTY;
          },

          getDefaultState: function () {
            return IMap({ key1: 'foo', key2: 'value2' });
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'value1' })));
      });

      it('should deep merge on mount preserving existing values if merge strategy is MERGE_PRESERVE', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1' }) });
        var ctx = createCtx(initialState);

        var comp = createClass(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.MERGE_PRESERVE;
          },

          getDefaultState: function () {
            return IMap({ key1: 'foo', key2: 'value2' });
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'value1', key2: 'value2' })));
      });

      it('should deep merge on mount preserving new values if merge strategy is MERGE_REPLACE', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1', key2: 'value2' }) });
        var ctx = createCtx(initialState);

        var comp = createClass(ctx, {
          getMergeStrategy: function () {
            return Morearty.MergeStrategy.MERGE_REPLACE;
          },

          getDefaultState: function () {
            return IMap({ key1: 'foo' });
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ key1: 'foo', key2: 'value2' })));
      });

      it('should use custom merge function if merge strategy is function accepting current and default values', function () {
        var initialState = IMap({ key: IMap({ key1: 'value1', key2: 'value2' }) });
        var defaultState = IMap({ key1: 'foo' });
        var ctx = createCtx(initialState);

        var currentValue = null, defaultValue = null;
        var comp = createClass(ctx, {
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

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.strictEqual(currentValue, initialState.get('key'));
        assert.strictEqual(defaultValue, defaultState);
        assert.isTrue(ctx.getBinding().get('key').equals(IMap({ merge: 'result' })));
      });

      it('should support multi-binding components', function () {
        var initialState = IMap({ default: null, aux: null });
        var ctx = createCtx(initialState);
        var binding = ctx.getBinding();

        var comp = createClass(ctx, {
          getDefaultState: function () {
            return {
              default: 'foo',
              aux: 'bar'
            };
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: { default: binding.sub('default'), aux: binding.sub('aux') } });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isTrue(binding.get().equals(IMap({ default: 'foo', aux: 'bar' })));
      });

    });

    describe('#getMergeStrategy()', function () {
      it('should support per-binding configuration', function () {
        var initialState = IMap({ default: 'default', aux: null });
        var ctx = createCtx(initialState);
        var binding = ctx.getBinding();

        var comp = createClass(ctx, {
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

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: { default: binding.sub('default'), aux: binding.sub('aux') } });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        assert.isTrue(binding.get().equals(IMap({ default: 'default', aux: 'bar' })));
      });
    });

    describe('#addBindingListener(binding, subpath, cb)', function () {
      it('should add binding listener', function () {
        var initialState = IMap({ key: IMap({ key2: 'value2' }) });
        var ctx = createCtx(initialState);
        var binding = ctx.getBinding();

        var listenerCalled = false;

        var comp = createClass(ctx, {
          componentDidMount: function () {
            this.addBindingListener(this.getDefaultBinding(), 'key2', function () {
              listenerCalled = true;
            });
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        binding.set('key.key2', 'foo');
        assert.isTrue(listenerCalled);
      });

      it('should return listener id', function () {
        var initialState = IMap({ key: IMap({ key2: 'value2' }) });
        var ctx = createCtx(initialState);
        var binding = ctx.getBinding();

        var listenerId = null;

        var comp = createClass(ctx, {
          componentDidMount: function () {
            listenerId = this.addBindingListener(this.getDefaultBinding(), 'key2', function () {});
          },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return React.createFactory(comp)({ binding: ctx.getBinding().sub('key') });
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        binding.set('key.key2', 'foo');
        assert.isNotNull(listenerId);
        assert.isTrue(binding.removeListener(listenerId));
      });

      it('should auto-remove listener on unmount if shouldRemoveListeners returns true', function (done) {
        var initialState = IMap({ key: IMap({ key2: 'value2' }), show: true });
        var ctx = createCtx(initialState);
        var binding = ctx.getBinding();

        var listenerCalled = false;

        var subComp = createClass(ctx, {
          componentDidMount: function () {
            this.addBindingListener(this.getDefaultBinding(), 'key2', function () {
              listenerCalled = true;
            });
          },

          shouldRemoveListeners: function () { return true; },

          render: function () { return null; }
        });

        var rootComp = createClass(ctx, {
          render: function () {
            return binding.get('show') ? React.createFactory(subComp)({ binding: this.getDefaultBinding().sub('key') }) : null;
          }
        });

        var bootstrapComp = React.createFactory(ctx.bootstrap(rootComp));

        React.render(bootstrapComp(), global.document.getElementById('root'));

        binding.set('key.key2', 'foo');
        assert.isTrue(listenerCalled);

        listenerCalled = false;
        binding.set('show', false);

        waitRender(function () {
          binding.set('key.key2', 'bar');

          waitRender(function () {
            assert.isFalse(listenerCalled);
            done();
          });
        });

      });
    });

  });
});
