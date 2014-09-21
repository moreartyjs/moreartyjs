/**
 * @name Morearty
 * @namespace
 * @classdesc Morearty main module. Exposes [createContext]{@link Morearty.createContext} function.
 */
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

getBinding = function (context, comp, key) {
  if (context) {
    var binding = comp.props[context._configuration.bindingPropertyName];
    return key ? binding[key] : binding;
  } else {
    throw new Error('Context is missing.');
  }
};

bindingChanged = function (binding, previousState) {
  var currentValue = binding.val();
  var previousValue = previousState ? binding.withBackingValue(previousState).val() : null;
  return currentValue !== previousValue;
};

stateChanged = function (context, state) {
  var previousState = context._previousState;
  if (context.Binding.isInstance(state)) {
    return bindingChanged(state, previousState);
  } else {
    var bindings = Util.getPropertyValues(state);
    return !!Util.find(bindings, function (binding) {
      return binding && bindingChanged(binding, previousState);
    });
  }
};

var merge = function (mergeStrategy, defaultState, stateBinding) {
  var context = this;

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
            (currentState instanceof context.Imm.Sequence && currentState.count() === 0);
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

  tx.commit(false);
};

/** Morearty context constructor.
 * @param {Object} React React instance
 * @param {Object} Immutable Immutable instance
 * @param {IMap} initialState initial state
 * @param {Object} configuration configuration
 * @public
 * @class Context
 * @classdesc Represents Morearty context.
 * <p>Exposed modules:
 * <ul>
 *   <li>React - React instance;</li>
 *   <li>Immutable - Immutable instance;</li>
 *   <li>[Util]{@link Util};</li>
 *   <li>[Binding]{@link Binding};</li>
 *   <li>[History]{@link History};</li>
 *   <li>[Callback]{@link Callback};</li>
 *   <li>[DOM]{@link DOM}.</li>
 * </ul>
 */
var Context = function (React, Immutable, initialState, configuration) {
  /** React instance.
   * @public
   * @ignore */
  this.React = React;
  /** Immutable instance.
   * @public
   * @ignore */
  this.Immutable = Immutable;
  /** Immutable instance with a shorter name.
   * @public
   * @ignore */
  this.Imm = Immutable;

  /** DOM module.
   * @public
   * @ignore
   * @see DOM */
  this.DOM = DOM(React);

  /** Binding module.
   * @public
   * @ignore
   * @see Binding */
  this.Binding = Binding(Immutable);

  /** History module.
   * @public
   * @ignore
   * @see History */
  this.History = History(Immutable);

  /** @private */
  this._initialState = initialState;

  /** State before current render.
   * @protected
   * @ignore */
  this._previousState = null;
  /** State during current render.
   * @private */
  this._currentState = initialState;
  /** @private */
  this._currentStateBinding = this.Binding.init(initialState);

  /** @private */
  this._configuration = configuration;

  /** @private */
  this._fullUpdateQueued = false;
  /** @protected
   * @ignore */
  this._fullUpdateInProgress = false;
};

Context.prototype = Object.freeze( /** @lends Context.prototype */ {

  /** Util module.
   * @see Util */
  Util: Util,

  /** Callback module.
   * @see Callback */
  Callback: Callback,

  /** Get state binding.
   * @return {Binding} state binding
   * @see Binding */
  getBinding: function () {
    return this._currentStateBinding;
  },

  /** Get current state.
   * @return {IMap} current state */
  getCurrentState: function () {
    return this.getBinding().val();
  },

  /** Get previous state.
   * @return {IMap} previous state */
  getPreviousState: function () {
    return this._previousState;
  },

  /** Revert to initial state.
   * @param {Boolean} [notifyListeners] should listeners be notified;
   *                                    true by default, set to false to disable notification
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers */
  resetState: function (notifyListeners, subpath) {
    var args = Util.resolveArgs(
      arguments,
      function (x) { return typeof x === 'boolean' ? 'notifyListeners' : null; }, '?subpath'
    );
    var notify = args.notifyListeners !== false;
    if (args.subpath) {
      var pathAsArray = this.Binding.asArrayPath(args.subpath);
      this.getBinding().atomically().set(pathAsArray, this._initialState.getIn(pathAsArray)).commit(notify);
    } else {
      this._currentStateBinding.setBackingValue(this._initialState, notify);
    }
  },

  /** Replace whole state with new value.
   * @param {IMap} newState
   * @param {Boolean} [notifyListeners] should listeners be notified;
   *                                    true by default, set to false to disable notification */
  replaceState: function (newState, notifyListeners) {
    this._currentStateBinding.setBackingValue(newState, notifyListeners);
  },

  /** Check if binding value was changed on last re-render.
   * @param {Binding} binding binding
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} [compare] compare function, '===' by default */
  isChanged: function (binding, subpath, compare) {
    var args = Util.resolveArgs(
      arguments,
      'binding', function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?compare'
    );
    var currentValue = args.binding.withBackingValue(this._currentState).val(args.subpath);
    var previousValue = args.binding.withBackingValue(this._previousState).val(args.subpath);
    return args.compare ? !args.compare(currentValue, previousValue) : currentValue !== previousValue;
  },

  /** Initialize rendering.
   * @param {Object} rootComp root application component */
  init: function (rootComp) {
    var self = this;
    var requestAnimationFrameEnabled = self._configuration.requestAnimationFrameEnabled;
    var requestAnimationFrame = window && window.requestAnimationFrame;

    var render = function (newValue, oldValue) {
      if (rootComp.isMounted()) {
        self._currentState = newValue;
        self._previousState = oldValue;
        try {
          if (self._fullUpdateQueued) {
            self._fullUpdateInProgress = true;
            rootComp.forceUpdate(function () {
              self._fullUpdateQueued = false;
              self._fullUpdateInProgress = false;
            });
          } else {
            rootComp.forceUpdate();
          }
        } catch (e) {
          if (self._configuration.stopOnRenderError) {
            throw e;
          } else {
            console.error('Morearty: skipping render error', e);
          }
        }
      }
    };

    self._currentStateBinding.addGlobalListener(function (newValue, oldValue) {
      if (requestAnimationFrameEnabled && requestAnimationFrame) {
        requestAnimationFrame(render.bind(self, newValue, oldValue), null);
      } else {
        render(newValue, oldValue);
      }
    });
  },

  /** Queue full update on next render. */
  queueFullUpdate: function () {
    this._fullUpdateQueued = true;
  }

});

module.exports = {

  /** Util module.
   * @memberOf Morearty
   * @see Util */
  Util: Util,

  /** Callback module.
   * @memberOf Morearty
   * @see Callback */
  Callback: Callback,

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
      return getBinding(this.getMoreartyContext(), this, name);
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
      var context = this.getMoreartyContext();
      var binding = getBinding(context, this);
      if (context.Binding.isInstance(binding)) {
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
      var context = this.getMoreartyContext();
      return getBinding(context, this, name).withBackingValue(context._previousState).val();
    },

    componentWillMount: function () {
      if (typeof this.getDefaultState === 'function') {
        var context = this.getMoreartyContext();
        var defaultState = this.getDefaultState();
        if (defaultState) {
          var binding = getBinding(context, this);
          var mergeStrategy =
              typeof this.getMergeStrategy === 'function' ? this.getMergeStrategy() : MERGE_STRATEGY.MERGE_PRESERVE;

          var immutableInstance = defaultState instanceof context.Imm.Sequence;

          if (context.Binding.isInstance(binding)) {
            var effectiveDefaultState = immutableInstance ? defaultState : defaultState['default'];
            merge.call(context, mergeStrategy, effectiveDefaultState, binding);
          } else {
            var keys = Object.keys(binding);
            var defaultKey = keys.length === 1 ? keys[0] : 'default';
            var effectiveMergeStrategy = typeof mergeStrategy === 'string' ? mergeStrategy : mergeStrategy[defaultKey];

            if (immutableInstance) {
              merge.call(context, effectiveMergeStrategy, defaultState, binding[defaultKey]);
            } else {
              keys.forEach(function (key) {
                if (defaultState[key]) {
                  merge.call(context, effectiveMergeStrategy, defaultState[key], binding[key]);
                }
              });
            }
          }
        }
      }
    },

    shouldComponentUpdate: function (nextProps, nextState) {
      var shouldComponentUpdate = function () {
        var context = this.getMoreartyContext();
        if (context._fullUpdateInProgress) {
          return true;
        } else {
          var binding = getBinding(context, this);
          return !binding || stateChanged(context, binding);
        }
      }.bind(this);

      var shouldComponentUpdateOverride = this.shouldComponentUpdateOverride;
      return shouldComponentUpdateOverride ?
        shouldComponentUpdateOverride(shouldComponentUpdate, nextProps, nextState) :
        shouldComponentUpdate();
    }
  },

  /** Create Morearty context.
   * @param {Object} React React instance
   * @param {Object} Immutable Immutable instance
   * @param {IMap|Object} initialState initial state
   * @param {Object} [configuration] Morearty configuration. Supported parameters:
   * <ul>
   *   <li>bindingPropertyName - name of the property holding component's binding, 'binding' by default;</li>
   *   <li>requestAnimationFrameEnabled - enable rendering in requestAnimationFrame, false by default;</li>
   *   <li>stopOnRenderError - stop on errors during render, false by default.</li>
   * </ul>
   * @return {Context}
   * @memberOf Morearty */
  createContext: function (React, Immutable, initialState, configuration) {
    var Sequence = Immutable.Sequence;
    var state = initialState instanceof Sequence ? initialState : Immutable.fromJS(initialState);
    var conf = configuration || {};
    return new Context(React, Immutable, state, {
      bindingPropertyName: conf.bindingPropertyName || 'binding',
      requestAnimationFrameEnabled: conf.requestAnimationFrameEnabled || false,
      stopOnRenderError: conf.stopOnRenderError || false
    });
  }

};
