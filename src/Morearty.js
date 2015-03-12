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

var getBinding, bindingChanged, observedBindingsChanged, stateChanged;

getBinding = function (props, key) {
  var binding = props.binding;
  return key ? binding[key] : binding;
};

bindingChanged = function (context, currentBinding) {
  return (context._stateChanged && currentBinding.isChanged(context._previousState)) ||
         (context._metaChanged && context._metaBinding.sub(currentBinding.getPath()).isChanged(context._previousMetaState));
};

observedBindingsChanged = function (self) {
  return self.observedBindings &&
      !!Util.find(self.observedBindings, function (binding) {
        return bindingChanged(self.getMoreartyContext(), binding);
      });
};

stateChanged = function (self, currentBinding, previousBinding) {
  var observedChanged = observedBindingsChanged(self);
  if (!currentBinding && !observedChanged) {
    return false;
  } else {
    if (observedChanged) {
      return true;
    } else {
      var context = self.getMoreartyContext();
      if (currentBinding instanceof Binding) {
        return currentBinding !== previousBinding || bindingChanged(context, currentBinding);
      } else {
        if (context._stateChanged || context._metaChanged) {
          var keys = Object.keys(currentBinding);
          return !!Util.find(keys, function (key) {
            var binding = currentBinding[key];
            return binding && (binding !== previousBinding[key] || bindingChanged(context, binding));
          });
        } else {
          return false;
        }
      }
    }
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
            (currentState instanceof Imm.Iterable && currentState.isEmpty());
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
 * @param {Binding} binding state binding
 * @param {Binding} metaBinding meta state binding
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
var Context = function (binding, metaBinding, options) {
  /** @private */
  this._initialMetaState = metaBinding.get();
  /** @private */
  this._previousMetaState = null;
  /** @private */
  this._metaBinding = metaBinding;
  /** @protected
   * @ignore */
  this._metaChanged = false;

  /** @private */
  this._initialState = binding.get();
  /** @protected
   * @ignore */
  this._previousState = null;
  /** @private */
  this._stateBinding = binding;
  /** @protected
   * @ignore */
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

  /** Create a copy of this context sharing same bindings and options.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @returns {Context} */
  copy: function (subpath) {
    return new Context(this._stateBinding.sub(subpath), this._metaBinding.sub(subpath), this._options);
  },

  /** Revert to initial state.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Object} [options] options object
   * @param {Boolean} [options.notify=true] should listeners be notified
   * @param {Boolean} [options.resetMeta=true] should meta state be reverted */
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
   * @param {Object} [options] options object
   * @param {Boolean} [options.notify=true] should listeners be notified */
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

      if (renderQueue.length === 1) {
        var singleFrame = renderQueue[0];

        stateChanged = singleFrame.stateChanged;
        metaChanged = singleFrame.metaChanged;

        if (stateChanged) self._previousState = singleFrame.previousState;
        if (metaChanged) self._previousMetaState = singleFrame.previousMetaState;
      } else {
        var elderStateChangedFrame = Util.find(renderQueue, function (q) { return q.stateChanged; });
        var elderMetaChangedFrame = Util.find(renderQueue, function (q) { return q.metaChanged; });

        stateChanged = !!elderStateChangedFrame;
        metaChanged = !!elderMetaChangedFrame;

        if (stateChanged) self._previousState = elderStateChangedFrame.previousState;
        if (metaChanged) self._previousMetaState = elderMetaChangedFrame.previousMetaState;
      }

      self._stateChanged = stateChanged;
      self._metaChanged = metaChanged;

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

        console.error('Morearty: render error. ' + (stop ? 'Exiting.' : 'Continuing.'));
        console.error('Error details: %s', e.message, e.stack);
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
              previousState: (stateChanged || null) && changes.getPreviousBackingValue(),
              previousMetaState: (metaChanged || null) && changes.getPreviousBackingMeta()
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
   * @param {Object} [reactContext] custom React context (will be enriched with Morearty-specific data)
   * @return {*} Morearty bootstrap component */
  bootstrap: function (rootComp, reactContext) {
    var ctx = this;

    var effectiveReactContext = reactContext || {};
    effectiveReactContext.morearty = ctx;

    return React.createClass({
      displayName: 'Bootstrap',

      childContextTypes: {
        morearty: React.PropTypes.instanceOf(Context).isRequired
      },

      getChildContext: function () {
        return effectiveReactContext;
      },

      componentWillMount: function () {
        ctx.init(this);
      },

      render: function () {
        return React.createFactory(rootComp)({ binding: ctx.getBinding() });
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
     contextTypes: {
       morearty: React.PropTypes.instanceOf(Context).isRequired
     },

    /** Get Morearty context.
     * @returns {Context} */
    getMoreartyContext: function () {
      return this.context.morearty;
    },

    /** Get component state binding. Returns binding specified in component's binding attribute.
     * @param {String} [name] binding name (can only be used with multi-binding state)
     * @return {Binding|Object} component state binding */
    getBinding: function (name) {
      return getBinding(this.props, name);
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
      var binding = getBinding(this.props);
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
      return getBinding(this.props, name).withBackingValue(ctx._previousState).get();
    },

    /** Consider specified binding for changes when rendering. Registering same binding twice has no effect.
     * @param {Binding} binding
     * @param {Function} [cb] optional callback receiving binding value
     * @return {*} undefined if cb argument is ommitted, cb invocation result otherwise */
    observeBinding: function (binding, cb) {
      if (!this.observedBindings) {
        this.observedBindings = [];
      }

      var bindingPath = binding.getPath();
      if (!Util.find(this.observedBindings, function (b) { return b.getPath() === bindingPath; })) {
        this.observedBindings.push(binding);
      }

      return cb ? cb(binding.get()) : undefined;
    },

    componentWillMount: function () {
      if (typeof this.getDefaultState === 'function') {
        var ctx = this.getMoreartyContext();
        var defaultState = this.getDefaultState();
        if (defaultState) {
          var binding = getBinding(this.props);
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
          return stateChanged(self, getBinding(nextProps), getBinding(self.props));
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
          .commit({ notify: false });

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
            listenersBinding.atomically().remove().commit({notify: false});
          }
        }
      }
    }
  },

  /** Create Morearty context.
   * @param {Object} [spec] spec object
   * @param {Immutable.Map|Object} [spec.initialState={}] initial state
   * @param {Immutable.Map|Object} [spec.initialMetaState={}] initial meta-state
   * @param {Object} [spec.options={}] options object
   * @param {Boolean} [spec.options.requestAnimationFrameEnabled=true] enable rendering in requestAnimationFrame
   * @param {Boolean} [spec.options.renderOnce=false]
   *                  ensure render is executed only once (useful for server-side rendering to save resources),
   *                  any further state updates are ignored
   * @param {Boolean} [spec.options.stopOnRenderError=false] stop on errors during render
   * @return {Context}
   * @memberOf Morearty */
  createContext: function (spec) {
    var initialState, initialMetaState, options;
    if (arguments.length <= 1) {
      var effectiveSpec = spec || {};
      initialState = effectiveSpec.initialState;
      initialMetaState = effectiveSpec.initialMetaState;
      options = effectiveSpec.options;
    } else {
      console.warn(
        'Passing multiple arguments to createContext is deprecated. Use single object form instead.'
      );

      initialState = arguments[0];
      initialMetaState = arguments[1];
      options = arguments[2];
    }

    var ensureImmutable = function (state) {
      return state instanceof Imm.Iterable ? state : Imm.fromJS(state);
    };

    var state = ensureImmutable(initialState || {});
    var metaState = ensureImmutable(initialMetaState || {});

    var metaBinding = Binding.init(metaState);
    var binding = Binding.init(state, metaBinding);

    var effectiveOptions = options || {};
    return new Context(binding, metaBinding, {
      requestAnimationFrameEnabled: effectiveOptions.requestAnimationFrameEnabled !== false,
      renderOnce: effectiveOptions.renderOnce || false,
      stopOnRenderError: effectiveOptions.stopOnRenderError || false
    });
  }

};

