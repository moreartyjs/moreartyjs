var assert = require('chai').assert;
var sinon = require('sinon');
var domino = require('domino');
var config = require('../package.json');
var Morearty = require('../dist/morearty-' + config.version);
var Util = Morearty.Util;
var Map = Morearty.Data.Map;

var requireReact = function () {
  var window = domino.createWindow('<div id="root"></div>');
  global.window = window;
  global.document = window.document;
  global.navigator = global.window.navigator;
  return require('react/addons');
};

var React = requireReact();

var createCtx = function (initialState) {
  return Morearty.createContext(React, initialState || {});
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
      assert.isNotNull(ctx.Util);
      assert.isNotNull(ctx.Data.Map);
      assert.isNotNull(ctx.Data.Vector);
      assert.isNotNull(ctx.Data.Util);
      assert.isNotNull(ctx.Binding);
      assert.isNotNull(ctx.History);
      assert.isNotNull(ctx.Callback);
    });
  });

  it('should expose modules', function () {
    assert.isNotNull(Morearty);
    assert.isNotNull(Morearty.Util);
    assert.isNotNull(Morearty.Data.Map);
    assert.isNotNull(Morearty.Data.Vector);
    assert.isNotNull(Morearty.Data.Util);
    assert.isNotNull(Morearty.Binding);
    assert.isNotNull(Morearty.History);
    assert.isNotNull(Morearty.Callback);
  });

});

describe('Context', function () {

  describe('#state()', function () {
    it('should return current state binding', function () {
      var initialState = Map.fill('key', 'value');
      var ctx = createCtx(initialState);
      assert.strictEqual(ctx.state().val(), initialState);
    });
  });

  describe('#currentState()', function () {
    it('should return current state', function () {
      var initialState = Map.fill('key', 'value');
      var ctx = createCtx(initialState);
      assert.strictEqual(ctx.currentState(), initialState);
    });
  });

  describe('#previousState()', function () {
    it('should return empty map on new context', function () {
      var ctx = createCtx(Map.fill('key', 'value'));
      assert.isTrue(ctx.previousState().equals(Map));
    });

    it('should return previous state after state transition', function (done) {
      var rootComp = createComp();
      var ctx = createCtx(Map.fill('key', 'value'));
      ctx.init(rootComp);

      var clazz = ctx.createClass({
        render: function () {
          return React.DOM.div();
        }
      });

      React.renderComponent(clazz({ state: ctx.state() }), global.document.getElementById('root'));

      var previousState = ctx.currentState();
      ctx.state().assoc('key2', 'value2');
      setTimeout(function () {
        assert.strictEqual(ctx.previousState(), previousState);
        done();
      }, 32);
    });
  });

  describe('#init(rootComp)', function () {
    it('should call forceUpdate() on each render', function (done) {
      var rootComp = createComp();
      var mock = sinon.mock(rootComp);
      mock.expects('forceUpdate').twice();

      var ctx = createCtx();
      ctx.init(rootComp);
      ctx.state().assoc('key', 'value');
      ctx.state().assoc('key2', 'value2');

      setTimeout(function () {
        mock.verify();
        done();
      }, 32);
    });

    it('should queue render using requestAnimationFrame if available', function (done) {
      var requestAnimationFrameCalled = false;
      global.window.requestAnimationFrame = function (f) {
        f();
        requestAnimationFrameCalled = true;
      };

      var rootComp = createComp();

      var ctx = createCtx();
      ctx.init(rootComp);
      ctx.state().assoc('key', 'value');

      setTimeout(function () {
        assert.isTrue(requestAnimationFrameCalled);
        global.window.requestAnimationFrame = null;
        done();
      }, 32);
    });

    it('should not call forceUpdate() if state value isn\'t changed', function () {
      var rootComp = createComp();
      var mock = sinon.mock(rootComp);
      mock.expects('forceUpdate').never();

      var ctx = createCtx(Map.fill('key', 'value'));
      ctx.init(rootComp);
      ctx.state().assoc('key', 'value');
      ctx.state().update('key', Util.identity);
      mock.verify();
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

    it('should enrich spec with shouldComponentUpdate, shouldComponentUpdateSuper, and getState methods', function () {
      var initialState = Map.fill('key', 'value');
      var ctx = createCtx(initialState);

      var spec = {
        render: function () {
          return React.DOM.div();
        }
      };
      ctx.createClass(spec);

      assert.isFunction(spec.shouldComponentUpdate);
      assert.isFunction(spec.shouldComponentUpdateSuper);
      assert.strictEqual(spec.shouldComponentUpdate, spec.shouldComponentUpdateSuper);
      assert.isFunction(spec.getState);
    });

    it('shouldComponentUpdate should return true if state is changed or force update was queued, false otherwise', function (done) {
      var ctx = createCtx(Map.fill('root', Map.fill('key1', 'value1', 'key2', 'value2')));

      var shouldUpdate = [];

      var subComp = ctx.createClass({
        shouldComponentUpdate: function () {
          var result = this.shouldComponentUpdateSuper();
          shouldUpdate.push(result);
          return result;
        },

        render: function () {
          return React.DOM.div();
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
      ctx.state().assoc('root.key1', 'foo');
      ctx.state().assoc('root.key2', 'bar');

      setTimeout(function () {
        ctx.queueForceUpdate();
        ctx.state().assoc('root.key3', 'baz');

        setTimeout(function () {
          assert.deepEqual(shouldUpdate, [true, false, true]);
          done();
        }, 32);
      }, 32);
    });

    it('getState should return correct value', function () {
      var initialState = Map.fill('key', 'value');
      var ctx = createCtx(initialState);

      var state = null;

      var clazz = ctx.createClass({
        render: function () {
          state = this.getState();
          return React.DOM.div();
        }
      });

      React.renderComponent(clazz({ state: ctx.state().sub('key') }), global.document.getElementById('root'));

      assert.isNotNull(state);
      assert.strictEqual(state.val(), 'value');
    });

    it('getState should return correct values for multi-binding state', function () {
      var initialState = Map.fill('key1', 'value1', 'key2', 'value2');
      var ctx = createCtx(initialState);

      var state1 = null, state2 = null;

      var clazz = ctx.createClass({
        render: function () {
          state1 = this.getState('state1');
          state2 = this.getState('state2');
          return React.DOM.div();
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

});
