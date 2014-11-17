/**
 * @name Morearty
 * @namespace
 * @classdesc Morearty main module. Exposes [createContext]{@link Morearty.createContext} function.
 */
var Imm      = require('immutable');
var React    = require('react');
var Util     = require('./Util');
var Binding  = require('./Binding');
var History  = require('./History');
var Callback = require('./util/Callback');
var DOM      = require('./DOM');

var MERGE_STRATEGY = Object.freeze({
  OVERWRITE: 'overwrite',
  OVERWRITE_EMPTY: 'overwrite-empty',
  MERGE_PRESERVE: 'merge-preserve',
  MERGE_REPLACE: 'merge-replace'
});

var getBinding, bindingChanged, stateChanged;

getBinding = function (comp, key) {
  var binding = comp.props.binding;
  return key ? binding[key] : binding;
};

bindingChanged = function (binding, context) {
  return (context._stateChanged && binding.isChanged(context._previousState)) ||
    (context._metaChanged && context._metaBinding.sub(binding.getPath()).isChanged(context._previousMetaState));
};

stateChanged = function (context, state) {
  if (state instanceof Binding) {
    return bindingChanged(state, context);
  } else {
    var bindings = Util.getPropertyValues(state);
    return !!Util.find(bindings, function (binding) {
      return binding && bindingChanged(binding, context);
    });
  }
};

var merge = function (mergeStrategy, defaultState, stateBinding) {
  var tx = stateBinding.atomically();

  if (typeof mergeStrategy === 'function') {
    tx = tx.update(function (currentState) {
      return mergeStrategy(currentState, defaultState);
    });
  } else {
    switch (mergeStrategy) {
      case MERGE_STRATEGY.OVERWRITE:
        tx = tx.set(defaultState);
        break;
      case MERGE_STRATEGY.OVERWRITE_EMPTY:
        tx = tx.update(function (currentState) {
          var empty = Util.undefinedOrNull(currentState) ||
            (currentState instanceof Imm.Iterable && currentState.count() === 0);
          return empty ? defaultState : currentState;
        });
        break;
      case MERGE_STRATEGY.MERGE_PRESERVE:
        tx = tx.merge(true, defaultState);
        break;
      case MERGE_STRATEGY.MERGE_REPLACE:
        tx = tx.merge(false, defaultState);
        break;
      default:
        throw new Error('Invalid merge strategy: ' + mergeStrategy);
    }
  }

  tx.commit({ notify: false });
};

var getRenderRoutine = function (self) {
  var requestAnimationFrame = (typeof window !== 'undefined') && window.requestAnimationFrame;
  var fallback = function (f) { setTimeout(f, 1000 / 60); };

  if (self._options.requestAnimationFrameEnabled) {
    if (requestAnimationFrame) return requestAnimationFrame;
    else {
      console.warn('Morearty: requestAnimationFrame is not available, will render in setTimeout');
      return fallback;
    }
  } else {
    return fallback;
  }
};

/** Morearty context constructor.
 * @param {Immutable.Map} initialState initial state
 * @param {Immutable.Map} initialMetaState initial meta-state
 * @param {Object} options options
 * @public
 * @class Context
 * @classdesc Represents Morearty context.
 * <p>Exposed modules:
 * <ul>
 *   <li>[Util]{@link Util};</li>
 *   <li>[Binding]{@link Binding};</li>
 *   <li>[History]{@link History};</li>
 *   <li>[Callback]{@link Callback};</li>
 *   <li>[DOM]{@link DOM}.</li>
 * </ul> */
var Context = function (initialState, initialMetaState, options) {
  /** @private */
  this._initialMetaState = initialMetaState;
  /** @private */
  this._previousMetaState = null;
  /** @private */
  this._metaBinding = Binding.init(initialMetaState);
  /** @private */
  this._metaChanged = false;

  /** @private */
  this._initialState = initialState;
  /** @protected
   * @ignore */
  this._previousState = null;
  /** @private */
  this._stateBinding = Binding.init(initialState, this._metaBinding);
  /** @private */
  this._stateChanged = false;

  /** @private */
  this._options = options;

  /** @private */
  this._renderQueued = false;
  /** @private */
  this._fullUpdateQueued = false;
  /** @protected
   * @ignore */
  this._fullUpdateInProgress = false;
};

Context.prototype = Object.freeze( /** @lends Context.prototype */ {
  /** Get state binding.
   * @return {Binding} state binding
   * @see Binding */
  getBinding: function () {
    return this._stateBinding;
  },

  /** Get meta binding.
   * @return {Binding} meta binding
   * @see Binding */
  getMetaBinding: function () {
    return this._metaBinding;
  },

  /** Get current state.
   * @return {Immutable.Map} current state */
  getCurrentState: function () {
    return this.getBinding().get();
  },

  /** Get previous state (before last render).
   * @return {Immutable.Map} previous state */
  getPreviousState: function () {
    return this._previousState;
  },

  /** Get current meta state.
   * @returns {Immutable.Map} current meta state */
  getCurrentMeta: function () {
    var metaBinding = this.getMetaBinding();
    return metaBinding ? metaBinding.get() : undefined;
  },

  /** Get previous meta state (before last render).
   * @return {Immutable.Map} previous meta state */
  getPreviousMeta: function () {
    return this._previousMetaState;
  },

  /** Revert to initial state.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Object} [options] options object, supported options are:
   * <ul>
   *   <li>notify - should listeners be notified, true by default, set to false to disable notification;</li>
   *   <li>resetMeta - should meta state be reverted, true by default, set to false to disable.</li>
   * </ul> */
  resetState: function (subpath, options) {
    var args = Util.resolveArgs(
      arguments,
      function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?options'
    );

    var pathAsArray = args.subpath ? Binding.asArrayPath(args.subpath) : [];

    var tx = this.getBinding().atomically();
    tx.set(pathAsArray, this._initialState.getIn(pathAsArray));

    var effectiveOptions = args.options || {};
    if (effectiveOptions.resetMeta !== false) {
      tx.set(this.getMetaBinding(), pathAsArray, this._initialMetaState.getIn(pathAsArray));
    }

    tx.commit({ notify: effectiveOptions.notify });
  },

  /** Replace whole state with new value.
   * @param {Immutable.Map} newState new state
   * @param {Immutable.Map} [newMetaState] new meta state
   * @param {Object} [options] options object, supported options are:
   * <ul>
   *   <li>notify - should listeners be notified, true by default, set to false to disable notification.</li>
   * </ul> */
  replaceState: function (newState, newMetaState, options) {
    var args = Util.resolveArgs(
      arguments,
      'newState', function (x) { return x instanceof Imm.Map ? 'newMetaState' : null; }, '?options'
    );

    var effectiveOptions = args.options || {};

    var tx = this.getBinding().atomically();
    tx.set(newState);

    if (args.newMetaState) tx.set(this.getMetaBinding(), args.newMetaState);

    tx.commit({ notify: effectiveOptions.notify });
  },

  /** Check if binding value was changed on last re-render.
   * @param {Binding} binding binding
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} [compare] compare function, '===' for primitives / Immutable.is for collections by default */
  isChanged: function (binding, subpath, compare) {
    var args = Util.resolveArgs(
      arguments,
      'binding', function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?compare'
    );

    return args.binding.sub(args.subpath).isChanged(this._previousState, args.compare || Imm.is);
  },

  /** Initialize rendering.
   * @param {*} rootComp root application component */
  init: function (rootComp) {
    var self = this;
    var stop = false;
    var renderQueue = [];

    var transitionState = function () {
      var stateChanged, metaChanged;
      var elderFrame = renderQueue[0];

      if (renderQueue.length === 1) {
        stateChanged = elderFrame.stateChanged;
        metaChanged = elderFrame.metaChanged;
      } else {
        stateChanged = !!Util.find(renderQueue, function (q) { return q.stateChanged; });
        metaChanged = !!Util.find(renderQueue, function (q) { return q.metaChanged; });
      }

      self._stateChanged = stateChanged;
      self._metaChanged = metaChanged;

      if (stateChanged || !self._previousState) self._previousState = elderFrame.previousState;
      if (metaChanged) self._previousMetaState = elderFrame.previousMetaState;

      renderQueue = [];
    };

    var catchingRenderErrors = function (f) {
      try {
        if (rootComp.isMounted()) {
          f();
        }
      } catch (e) {
        if (self._options.stopOnRenderError) {
          stop = true;
        }

        console.error('Morearty: render error. ' + (stop ? 'Exiting.' : 'Continuing.'), e);
      }
    };

    var render = function () {
      transitionState();

      self._renderQueued = false;

      catchingRenderErrors(function () {
        if (self._fullUpdateQueued) {
          self._fullUpdateInProgress = true;
          rootComp.forceUpdate(function () {
            self._fullUpdateQueued = false;
            self._fullUpdateInProgress = false;
          });
        } else {
          rootComp.forceUpdate();
        }
      });
    };

    if (!self._options.renderOnce) {
      var renderRoutine = getRenderRoutine(self);

      var listenerId = self._stateBinding.addListener(function (changes) {
        if (stop) {
          self._stateBinding.removeListener(listenerId);
        } else {
          var stateChanged = changes.isValueChanged(), metaChanged = changes.isMetaChanged();

          if (stateChanged || metaChanged) {
            renderQueue.push({
              stateChanged: stateChanged,
              metaChanged: metaChanged,
              previousState: (stateChanged || null) && changes.getPreviousValue(),
              previousMetaState: (metaChanged || null) && changes.getPreviousMeta()
            });

            if (!self._renderQueued) {
              self._renderQueued = true;
              renderRoutine(render);
            }
          }
        }
      });
    }

    catchingRenderErrors(rootComp.forceUpdate.bind(rootComp));
  },

  /** Queue full update on next render. */
  queueFullUpdate: function () {
    this._fullUpdateQueued = true;
  },

  /** Create Morearty bootstrap component ready for rendering.
   * @param {*} rootComp root application component
   * @return {*} Morearty bootstrap component */
  bootstrap: function (rootComp) {
    var ctx = this;

    return React.createClass({
      displayName: 'Bootstrap',

      componentWillMount: function () {
        ctx.init(this);
      },

      render: function () {
        return React.withContext({ morearty: ctx }, function () {
          return React.createFactory(rootComp)({ binding: ctx.getBinding() });
        });
      }
    });
  }

});

module.exports = {

  /** Binding module.
   * @memberOf Morearty
   * @see Binding */
  Binding: Binding,

  /** History module.
   * @memberOf Morearty
   * @see History */
  History: History,

  /** Util module.
   * @memberOf Morearty
   * @see Util */
  Util: Util,

  /** Callback module.
   * @memberOf Morearty
   * @see Callback */
  Callback: Callback,

  /** DOM module.
   * @memberOf Morearty
   * @see DOM */
  DOM: DOM,

  /** Merge strategy.
   * <p>Describes how existing state should be merged with component's default state on mount. Predefined strategies:
   * <ul>
   *   <li>OVERWRITE - overwrite current state with default state;</li>
   *   <li>OVERWRITE_EMPTY - overwrite current state with default state only if current state is null or empty collection;</li>
   *   <li>MERGE_PRESERVE - deep merge current state into default state;</li>
   *   <li>MERGE_REPLACE - deep merge default state into current state.</li>
   * </ul> */
  MergeStrategy: MERGE_STRATEGY,

  /** Morearty mixin.
   * @memberOf Morearty
   * @namespace
   * @classdesc Mixin */
  Mixin: {
    contextTypes: { morearty: function () {} },

    /** Get Morearty context.
     * @returns {Context} */
    getMoreartyContext: function () {
      return this.context.morearty;
    },

    /** Get component state binding. Returns binding specified in component's binding attribute.
     * @param {String} [name] binding name (can only be used with multi-binding state)
     * @return {Binding|Object} component state binding */
    getBinding: function (name) {
      return getBinding(this, name);
    },

    /** Get default component state binding. Use this to get component's binding.
     * <p>Default binding is single binding for single-binding components or
     * binding with key 'default' for multi-binding components.
     * This method allows smooth migration from single to multi-binding components, e.g. you start with:
     * <pre><code>{ binding: foo }</code></pre>
     * or
     * <pre><code>{ binding: { default: foo } }</code></pre>
     * or even
     * <pre><code>{ binding: { any: foo } }</code></pre>
     * and add more bindings later:
     * <pre><code>{ binding: { default: foo, aux: auxiliary } }</code></pre>
     * This way code changes stay minimal.
     * @return {Binding} default component state binding */
    getDefaultBinding: function () {
      var binding = getBinding(this);
      if (binding instanceof Binding) {
        return binding;
      } else if (typeof binding === 'object') {
        var keys = Object.keys(binding);
        return keys.length === 1 ? binding[keys[0]] : binding['default'];
      }
    },

    /** Get component previous state value.
     * @param {String} [name] binding name (can only be used with multi-binding state)
     * @return {Binding} previous component state value */
    getPreviousState: function (name) {
      var ctx = this.getMoreartyContext();
      return getBinding(this, name).withBackingValue(ctx._previousState).get();
    },

    componentWillMount: function () {
      if (typeof this.getDefaultState === 'function') {
        var ctx = this.getMoreartyContext();
        var defaultState = this.getDefaultState();
        if (defaultState) {
          var binding = getBinding(this);
          var mergeStrategy =
            typeof this.getMergeStrategy === 'function' ? this.getMergeStrategy() : MERGE_STRATEGY.MERGE_PRESERVE;

          var immutableInstance = defaultState instanceof Imm.Iterable;

          if (binding instanceof Binding) {
            var effectiveDefaultState = immutableInstance ? defaultState : defaultState['default'];
            merge.call(ctx, mergeStrategy, effectiveDefaultState, binding);
          } else {
            var keys = Object.keys(binding);
            var defaultKey = keys.length === 1 ? keys[0] : 'default';
            var effectiveMergeStrategy = typeof mergeStrategy === 'string' ? mergeStrategy : mergeStrategy[defaultKey];

            if (immutableInstance) {
              merge.call(ctx, effectiveMergeStrategy, defaultState, binding[defaultKey]);
            } else {
              keys.forEach(function (key) {
                if (defaultState[key]) {
                  merge.call(ctx, effectiveMergeStrategy, defaultState[key], binding[key]);
                }
              });
            }
          }
        }
      }
    },

    shouldComponentUpdate: function (nextProps, nextState) {
      var self = this;
      var ctx = self.getMoreartyContext();
      var shouldComponentUpdate = function () {
        if (ctx._fullUpdateInProgress) {
          return true;
        } else {
          var binding = getBinding(self);
          return !binding || stateChanged(ctx, binding);
        }
      };

      var shouldComponentUpdateOverride = self.shouldComponentUpdateOverride;
      return shouldComponentUpdateOverride ?
        shouldComponentUpdateOverride(shouldComponentUpdate, nextProps, nextState) :
        shouldComponentUpdate();
    },

    /** Add binding listener. Listener will be automatically removed on unmount
     * if this.shouldRemoveListeners() returns true.
     * @param {Binding} [binding] binding to attach listener to, default binding if omitted
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Function} cb function receiving changes descriptor
     * @return {String} listener id */
    addBindingListener: function (binding, subpath, cb) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return x instanceof Binding ? 'binding' : null; },
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; },
        'cb'
      );

      var defaultBinding = this.getDefaultBinding();

      if (defaultBinding) {
        var effectiveBinding = args.binding || defaultBinding;
        var listenerId = effectiveBinding.addListener(args.subpath, args.cb);
        defaultBinding.meta().atomically()
          .update('listeners', function (listeners) {
            return listeners ? listeners.push(listenerId) : Imm.List.of(listenerId);
          })
          .commit({notify: false});

        return listenerId;
      } else {
        console.warn('Morearty: cannot attach binding listener to a component without default binding');
      }
    },

    componentWillUnmount: function () {
      if (typeof this.shouldRemoveListeners === 'function' && this.shouldRemoveListeners()) {
        var binding = this.getDefaultBinding();
        if (binding) {
          var listenersBinding = binding.meta('listeners');
          var listeners = listenersBinding.get();
          if (listeners) {
            listeners.forEach(binding.removeListener.bind(binding));
            listenersBinding.atomically().delete().commit({notify: false});
          }
        }
      }
    }
  },

  /** Create Morearty context.
   * @param {Immutable.Map|Object} initialState initial state
   * @param {Immutable.Map|Object} initialMetaState initial meta-state
   * @param {Object} [options] Morearty configuration. Supported parameters:
   * <ul>
   *   <li>requestAnimationFrameEnabled - enable rendering in requestAnimationFrame,
   *                                      true by default, set to false to fallback to setTimeout;</li>
   *   <li>renderOnce - ensure render is executed only once (useful for server-side rendering to save resources),
   *                    any further state updates are ignored, false by default;</li>
   *   <li>stopOnRenderError - stop on errors during render, false by default.</li>
   * </ul>
   * @return {Context}
   * @memberOf Morearty */
  createContext: function (initialState, initialMetaState, options) {
    var ensureImmutable = function (state) {
      return state instanceof Imm.Iterable ? state : Imm.fromJS(state);
    };

    var state = ensureImmutable(initialState);
    var metaState = initialMetaState ? ensureImmutable(initialMetaState) : Imm.Map();
    var effectiveOptions = options || {};
    return new Context(state, metaState, {
      requestAnimationFrameEnabled: effectiveOptions.requestAnimationFrameEnabled !== false,
      renderOnce: effectiveOptions.renderOnce || false,
      stopOnRenderError: effectiveOptions.stopOnRenderError || false
    });
  }

};

