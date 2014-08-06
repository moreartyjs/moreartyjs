var assert = require('chai').assert;
var sinon = require('sinon');
var domino = require('domino');
var Imm = require('immutable');
var Map = Imm.Map;
var Morearty = require('../dist/umd/Morearty');
var Util = require('../dist/umd/Util');

var requireReact = function () {
  var window = domino.createWindow('<div id="root"></div>');
  global.window = window;
  global.document = window.document;
  global.navigator = global.window.navigator;
  return require('react/addons');
};

var React = requireReact();

var createCtx = function (initialState, configuration) {
  return Morearty.createContext(React, Imm, initialState || {}, configuration || {});
};

var createComp = function () {
  return { forceUpdate: function () {} };
};

describe('Morearty', function () {

  describe('#createContext(React, initialState, configuration)', function () {
    it('should expose modules', function () {
      var ctx = createCtx();
      assert.isNotNull(ctx);
      assert.isNotNull(ctx.React);
      assert.isNotNull(ctx.Immutable);
      assert.isNotNull(ctx.Imm);
      assert.isNotNull(ctx.Util);
      assert.isNotNull(ctx.Binding);
      assert.isNotNull(ctx.History);
      assert.isNotNull(ctx.Callback);
      assert.isNotNull(ctx.MergeStrategy);
    });
  });

  it('should expose modules', function () {
    assert.isNotNull(Morearty);
    assert.isNotNull(Morearty.Util);
    assert.isNotNull(Morearty.Binding);
    assert.isNotNull(Morearty.History);
    assert.isNotNull(Morearty.Callback);
  });

});

describe('Context', function () {

  describe('#state()', function () {
    it('should return current state binding', function () {
      var initialState = Map({ key: 'value' });
      var ctx = createCtx(initialState);
      assert.strictEqual(ctx.state().val(), initialState);
    });
  });

  describe('#currentState()', function () {
    it('should return current state', function () {
      var initialState = Map({ key: 'value' });
      var ctx = createCtx(initialState);
      assert.strictEqual(ctx.currentState(), initialState);
    });
  });

  describe('#previousState()', function () {
    it('should return null on new context', function () {
      var ctx = createCtx(Map({ key: 'value' }));
      assert.isNull(ctx.previousState());
    });

    it('should return previous state after state transition', function () {
      var rootComp = createComp();
      var ctx = createCtx(Map({ key: 'value' }));
      ctx.init(rootComp);

      var clazz = ctx.createClass({
        render: function () { return null; }
      });

      React.renderComponent(clazz({ state: ctx.state() }), global.document.getElementById('root'));

      var previousState = ctx.currentState();
      ctx.state().set('key2', 'value2');
      assert.strictEqual(ctx.previousState(), previousState);
    });
  });

  describe('#resetState(notifyListeners)', function () {
    it('should reset strictly to initial state if initial state is associative data structure', function () {
      var rootComp = createComp();
      var initialState = Map({ key1: 'value1' });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      ctx.state().set('key2', 'value2');
      assert.isTrue(ctx.currentState().equals(Map({ key1: 'value1', key2: 'value2' })));
      ctx.resetState();
      assert.strictEqual(ctx.currentState(), initialState);
    });

    it('should reset to initial state if initial state is JavaScript object', function () {
      var rootComp = createComp();
      var initialState = { key1: 'value1' };
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      ctx.state().set('key2', 'value2');
      assert.isTrue(ctx.currentState().equals(Map({ key1: 'value1', key2: 'value2' })));
      ctx.resetState();
      assert.isTrue(ctx.currentState().equals(Map(initialState)));
    });

    it('should notify listeners by default', function () {
      var rootComp = createComp();
      var initialState = Map({ key1: 'value1' });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      ctx.state().set('key1', 'value2');

      var globalListenerCalled = false, listenerCalled = false;
      var state = ctx.state();
      state.addGlobalListener(function () { globalListenerCalled = true; });
      state.addListener('key1', function () { listenerCalled = true; });

      ctx.resetState();
      assert.isTrue(globalListenerCalled);
      assert.isTrue(listenerCalled);
    });

    it('should not notify listeners if notifyListeners is false', function () {
      var rootComp = createComp();
      var initialState = Map({ key1: 'value1' });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      ctx.state().set('key1', 'value2');

      var globalListenerCalled = false, listenerCalled = false;
      var state = ctx.state();
      state.addGlobalListener(function () { globalListenerCalled = true; });
      state.addListener('key1', function () { listenerCalled = true; });

      ctx.resetState(false);
      assert.isFalse(globalListenerCalled);
      assert.isFalse(listenerCalled);
    });
  });

  describe('#replaceState(newState, notifyListeners)', function () {
    it('should replace state with new value', function () {
      var rootComp = createComp();
      var initialState = Map({ key1: 'value1' });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      ctx.state().set('key2', 'value2');
      assert.isTrue(ctx.currentState().equals(Map({ key1: 'value1', key2: 'value2' })));

      var newState = Map({ key3: 'value3' });
      ctx.replaceState(newState);
      assert.strictEqual(ctx.currentState(), newState);
    });

    it('should notify listeners by default', function () {
      var rootComp = createComp();
      var initialState = Map({ key1: 'value1' });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      var globalListenerCalled = false, listenerCalled = false;
      var state = ctx.state();
      state.addGlobalListener(function () { globalListenerCalled = true; });
      state.addListener('key1', function () { listenerCalled = true; });

      ctx.replaceState(Map({ key3: 'value3' }));
      assert.isTrue(globalListenerCalled);
      assert.isTrue(listenerCalled);
    });

    it('should not notify listeners if notifyListeners is false', function () {
      var rootComp = createComp();
      var initialState = Map({ key1: 'value1' });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      var globalListenerCalled = false, listenerCalled = false;
      var state = ctx.state();
      state.addGlobalListener(function () { globalListenerCalled = true; });
      state.addListener('key1', function () { listenerCalled = true; });

      ctx.replaceState(Map({ key3: 'value3' }), false);
      assert.isFalse(globalListenerCalled);
      assert.isFalse(listenerCalled);
    });
  });

  describe('#changed(binding, subpath, compare)', function () {
    it('should return true if binding value was changed', function () {
      var rootComp = createComp();
      var initialState = Map({ key: 'initial' });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      ctx.state().set('key', 'value1');
      assert.isTrue(ctx.changed(ctx.state()));
    });

    it('should return false if binding value was not changed', function () {
      var rootComp = createComp();
      var initialState = Map({ root: Map({ key1: 'initial', key2: 'value2' }) });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      ctx.state().set('root.key1', 'value1');
      assert.isFalse(ctx.changed(ctx.state().sub('key2')));
    });

    it('should accept subpath as a string or an array', function () {
      var rootComp = createComp();
      var initialState = Map({ root: Map({ key: 'initial' }) });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      ctx.state().set('root.key', 'value1');
      assert.isTrue(ctx.changed(ctx.state(), 'root.key'));
      assert.isTrue(ctx.changed(ctx.state(), ['root', 'key']));
    });

    it('should accept optional compare function', function () {
      var rootComp = createComp();
      var initialState = Map({ key: 'initial', ignoredKey: 'foo' });
      var ctx = createCtx(initialState);
      ctx.init(rootComp);

      var compare = function (currentValue, oldValue) {
        return currentValue.get('key') === oldValue.get('key');
      };

      ctx.state().set('ignoredKey', 'bar');
      assert.isFalse(ctx.changed(ctx.state(), compare));
      ctx.state().set('key', 'value1');
      assert.isTrue(ctx.changed(ctx.state(), compare));
    });
  });

  describe('#init(rootComp)', function () {
    it('should call forceUpdate() on each render', function () {
      var rootComp = createComp();
      var mock = sinon.mock(rootComp);
      mock.expects('forceUpdate').twice();

      var ctx = createCtx();
      ctx.init(rootComp);
      ctx.state().set('key', 'value');
      ctx.state().set('key2', 'value2');
      mock.verify();
    });

    it('should not call forceUpdate() if state value isn\'t changed', function () {
      var rootComp = createComp();
      var mock = sinon.mock(rootComp);
      mock.expects('forceUpdate').never();

      var ctx = createCtx(Map({ key: 'value' }));
      ctx.init(rootComp);
      ctx.state().set('key', 'value');
      ctx.state().update('key', Util.identity);
      mock.verify();
    });

    it('should render using requestAnimationFrame if enabled and available', function (done) {
      var requestAnimationFrameCalled = false;
      var originalRAF = window.requestAnimationFrame;
      global.requestAnimationFrame = function (f) {
        f();
        requestAnimationFrameCalled = true;
      };

      var rootComp = createComp();

      var ctx = createCtx({}, {
        requestAnimationFrameEnabled: true
      });
      ctx.init(rootComp);
      ctx.state().set('key', 'value');

      setTimeout(function () {
        assert.isTrue(requestAnimationFrameCalled);
        window.requestAnimationFrame = originalRAF;
        done();
      }, 20);
    });
  });

  describe('#createClass(spec)', function () {
    it('should not replace existing shouldComponentUpdate method', function () {
      var ctx = createCtx();

      var existingShouldComponentUpdate = function () { return true; };
      var spec = {
        render: function () {},
        shouldComponentUpdate: existingShouldComponentUpdate
      };

      ctx.createClass(spec);
      assert.strictEqual(spec.shouldComponentUpdate, existingShouldComponentUpdate);
    });

    it('should enrich spec with shouldComponentUpdate, shouldComponentUpdateSuper, getState, and getPreviousState methods', function () {
      var initialState = Map({ key: 'value' });
      var ctx = createCtx(initialState);

      var spec = {
        render: function () { return null; }
      };
      ctx.createClass(spec);

      assert.isFunction(spec.shouldComponentUpdate);
      assert.isFunction(spec.shouldComponentUpdateSuper);
      assert.strictEqual(spec.shouldComponentUpdate, spec.shouldComponentUpdateSuper);
      assert.isFunction(spec.getState);
      assert.isFunction(spec.getPreviousState);
    });

    it('shouldComponentUpdate should return true if state is changed or full update was queued, false otherwise', function () {
      var ctx = createCtx(Map({ root: Map({ key1: 'value1', key2: 'value2' }) }));

      var shouldUpdate = [];

      var subComp = ctx.createClass({
        shouldComponentUpdate: function () {
          var result = this.shouldComponentUpdateSuper();
          shouldUpdate.push(result);
          return result;
        },

        render: function () {
          return null;
        }
      });

      var rootComp = ctx.createClass({
        render: function () {
          var state = this.getState();
          return subComp({ state: state.sub('root.key1') });
        }
      });

      //noinspection JSUnusedGlobalSymbols
      var bootstrapComp = ctx.createClass({
        componentWillMount: function () {
          ctx.init(this);
        },

        render: function () {
          return rootComp({ state: ctx.state() });
        }
      });

      React.renderComponent(bootstrapComp(), global.document.getElementById('root'));
      ctx.state().set('root.key1', 'foo');
      ctx.state().set('root.key2', 'bar');
      ctx.queueFullUpdate();
      ctx.state().set('root.key3', 'baz');
      assert.deepEqual(shouldUpdate, [true, false, true]);
    });

    describe('#getState()', function () {
      it('getState should return correct value', function () {
        var initialState = Map({ key: 'value' });
        var ctx = createCtx(initialState);

        var state = null;

        var clazz = ctx.createClass({
          render: function () {
            state = this.getState();
            return null;
          }
        });

        React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

        assert.isNotNull(state);
        assert.strictEqual(state.val(), 'value');
      });

      it('getState should return correct values for multi-binding state', function () {
        var initialState = Map({ key1: 'value1', key2: 'value2' });
        var ctx = createCtx(initialState);

        var state1 = null, state2 = null;

        var clazz = ctx.createClass({
          render: function () {
            state1 = this.getState('state1');
            state2 = this.getState('state2');
            return null;
          }
        });

        React.renderComponent(
          clazz({ state: { state1: ctx.state().sub('key1'), state2: ctx.state().sub('key2') } }),
          global.document.getElementById('root')
        );

        assert.isNotNull(state1);
        assert.strictEqual(state1.val(), 'value1');
        assert.isNotNull(state2);
        assert.strictEqual(state2.val(), 'value2');
      });
    });

    it('getPreviousState should return correct value', function () {
      var ctx = createCtx(Map({ root: Map({ key: 'initial' }) }));

      var previousState = null;

      var subComp = ctx.createClass({
        shouldComponentUpdate: function () {
          var result = this.shouldComponentUpdateSuper();
          previousState = this.getPreviousState();
          return result;
        },

        render: function () { return null; }
      });

      var rootComp = ctx.createClass({
        render: function () {
          var state = this.getState();
          return subComp({ state: state.sub('root.key') });
        }
      });

      //noinspection JSUnusedGlobalSymbols
      var bootstrapComp = ctx.createClass({
        componentWillMount: function () {
          ctx.init(this);
        },

        render: function () {
          return rootComp({ state: ctx.state() });
        }
      });

      React.renderComponent(bootstrapComp(), global.document.getElementById('root'));
      ctx.state().set('root.key', 'value1');
      assert.deepEqual(previousState, 'initial');
    });

    describe('#getDefaultState()', function () {
      it('should deep merge on mount preserving existing values by default', function () {
        var initialState = Map({ key: Map({ key1: 'key1' }) });
        var ctx = createCtx(initialState);

        var clazz = ctx.createClass({
          getDefaultState: function () {
            return Map({ key1: 'foo', key2: 'key2' });
          },

          render: function () { return null; }
        });

        React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

        assert.isTrue(ctx.state().val('key').equals(Map({ key1: 'key1', key2: 'key2' })));
      });

      it('should overwrite existing values if merge strategy is OVERWRITE', function () {
        var initialState = Map({ key: Map({ key1: 'key1' }) });
        var ctx = createCtx(initialState);

        var clazz = ctx.createClass({
          getMergeStrategy: function () {
            return ctx.MergeStrategy.OVERWRITE;
          },

          getDefaultState: function () {
            return Map({ key1: 'foo', key2: 'key2' });
          },

          render: function () { return null; }
        });

        React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

        assert.isTrue(ctx.state().val('key').equals(Map({ key1: 'foo', key2: 'key2' })));
      });

      it('should overwrite existing empty values if merge strategy is OVERWRITE_EMPTY', function () {
        var initialState = Map({ key: Map.empty() });
        var ctx = createCtx(initialState);

        var clazz = ctx.createClass({
          getMergeStrategy: function () {
            return ctx.MergeStrategy.OVERWRITE_EMPTY;
          },

          getDefaultState: function () {
            return Map({ key1: 'key1', key2: 'key2' });
          },

          render: function () { return null; }
        });

        React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

        assert.isTrue(ctx.state().val('key').equals(Map({ key1: 'key1', key2: 'key2' })));
      });

      it('should keep existing non-empty values if merge strategy is OVERWRITE_EMPTY', function () {
        var initialState = Map({ key: Map({ key1: 'key1' }) });
        var ctx = createCtx(initialState);

        var clazz = ctx.createClass({
          getMergeStrategy: function () {
            return ctx.MergeStrategy.OVERWRITE_EMPTY;
          },

          getDefaultState: function () {
            return Map({ key1: 'foo', key2: 'key2' });
          },

          render: function () { return null; }
        });

        React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

        assert.isTrue(ctx.state().val('key').equals(Map({ key1: 'key1' })));
      });

      it('should deep merge on mount preserving existing values if merge strategy is MERGE_PRESERVE', function () {
        var initialState = Map({ key: Map({ key1: 'key1' }) });
        var ctx = createCtx(initialState);

        var clazz = ctx.createClass({
          getMergeStrategy: function () {
            return ctx.MergeStrategy.MERGE_PRESERVE;
          },

          getDefaultState: function () {
            return Map({ key1: 'foo', key2: 'key2' });
          },

          render: function () { return null; }
        });

        React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

        assert.isTrue(ctx.state().val('key').equals(Map({ key1: 'key1', key2: 'key2' })));
      });

      it('should deep merge on mount preserving new values if merge strategy is MERGE_REPLACE', function () {
        var initialState = Map({ key: Map({ key1: 'key1', key2: 'key2' }) });
        var ctx = createCtx(initialState);

        var clazz = ctx.createClass({
          getMergeStrategy: function () {
            return ctx.MergeStrategy.MERGE_REPLACE;
          },

          getDefaultState: function () {
            return Map({ key1: 'foo' });
          },

          render: function () { return null; }
        });

        React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

        assert.isTrue(ctx.state().val('key').equals(Map({ key1: 'foo', key2: 'key2' })));
      });

      it('should use custom merge function if merge strategy is function accepting current and default values', function () {
        var initialState = Map({ key: Map({ key1: 'key1', key2: 'key2' }) });
        var defaultState = Map({ key1: 'foo' });
        var ctx = createCtx(initialState);

        var currentValue = null, defaultValue = null;
        var clazz = ctx.createClass({
          getMergeStrategy: function () {
            return function (current, default_) {
              currentValue = current;
              defaultValue = default_;
              return Map({ merge: 'result' });
            };
          },

          getDefaultState: function () {
            return defaultState;
          },

          render: function () { return null; }
        });

        React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

        assert.strictEqual(currentValue, initialState.get('key'));
        assert.strictEqual(defaultValue, defaultState);
        assert.isTrue(ctx.state().val('key').equals(Map({ merge: 'result' })));
      });
    });
  });

});
