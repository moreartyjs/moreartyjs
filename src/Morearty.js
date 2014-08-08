/**
 * @name Morearty
 * @namespace
 * @classdesc Morearty main module. Exposes [createContext]{@link Morearty.createContext} function.
 */
define(['Dyn', 'Util', 'Binding', 'History', 'util/Callback', 'DOM'], function (Dyn, Util, Binding, History, Callback, DOM) {

  var MERGE_STRATEGY = Object.freeze({
    OVERWRITE: 'overwrite',
    OVERWRITE_EMPTY: 'overwrite-empty',
    MERGE_PRESERVE: 'merge-preserve',
    MERGE_REPLACE: 'merge-replace'
  });

  /** Morearty context constructor.
   * @param {Object} React React instance
   * @param {Object} Immutable Immutable instance
   * @param {Map} initialState initial state
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
     * @public */
    this.React = React;
    /** Immutable instance.
     * @public */
    this.Immutable = Immutable;
    /** Immutable instance with a shorter name.
     * @public */
    this.Imm = Immutable;

    /** @private */
    this._initialState = initialState;

    /** @private */
    this._previousState = null;
    /** @private */
    this._currentStateBinding = Binding.init(initialState);
    /** @private */
    this._configuration = configuration;

    /** @private */
    this._fullUpdateQueued = false;
    /** @private */
    this._fullUpdateInProgress = false;
  };

  Context.prototype = (function () {

    var getState, bindingChanged, stateChanged;

    getState = function (context, comp, key) {
      var state = comp.props[context._configuration.statePropertyName];
      return key ? state[key] : state;
    };

    bindingChanged = function (binding, previousState) {
      var currentValue = binding.val();
      var previousValue = previousState ? binding.withBackingValue(previousState).val() : null;
      return currentValue !== previousValue;
    };

    stateChanged = function (context, state) {
      var previousState = context._previousState;
      if (Binding.isInstance(state)) {
        return bindingChanged(state, previousState);
      } else {
        var bindings = Util.getPropertyValues(state);
        return !!Util.find(bindings, function (binding) {
          return bindingChanged(binding, previousState);
        });
      }
    };

    var enrichShouldComponentUpdate, enrichComponentWillMount;

    enrichShouldComponentUpdate = function (context, spec) {
      var shouldComponentUpdate = function () {
        if (context._fullUpdateInProgress) {
          return true;
        } else {
          var state = getState(context, this);
          return !state || stateChanged(context, state);
        }
      };

      if (!spec.shouldComponentUpdate) {
        spec.shouldComponentUpdate = shouldComponentUpdate;
      }
      spec.shouldComponentUpdateSuper = shouldComponentUpdate;
    };

    enrichComponentWillMount = function (context, spec) {
      var existingComponentWillMount = spec.componentWillMount;

      if (typeof spec.getDefaultState === 'function') {
        spec.componentWillMount = function () {
          var defaultState = spec.getDefaultState();
          if (defaultState) {
            var state = getState(context, this);
            var mergeStrategy = typeof spec.getMergeStrategy === 'function' ? spec.getMergeStrategy() : MERGE_STRATEGY.MERGE_PRESERVE;

            var tx = state.atomically();

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
          }

          if (existingComponentWillMount) {
            existingComponentWillMount.call(this);
          }
        };
      }
    };

    return Object.freeze( /** @lends Context.prototype */ {

      /** Util module.
       * @see Util */
      Util: Util,

      /** Binding module.
       * @see Binding */
      Binding: Binding,

      /** History module.
       * @see History */
      History: History,

      /** Callback module.
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

      /** DOM module.
       * @see DOM */
      DOM: DOM,

      /** Get state binding.
       * @return {Binding} state binding
       * @see Binding */
      state: function () {
        return this._currentStateBinding;
      },

      /** Get current state.
       * @return {Map} current state */
      currentState: function () {
        return this.state().val();
      },

      /** Get previous state.
       * @return {Map} previous state */
      previousState: function () {
        return this._previousState;
      },

      /** Revert to initial state.
       * @param {Boolean} [notifyListeners] should listeners be notified;
       *                                    true by default, set to false to disable notification */
      resetState: function (notifyListeners) {
        this._currentStateBinding.setBackingValue(this._initialState, notifyListeners !== false);
      },

      /** Replace whole state with new value.
       * @param {Map} newState
       * @param {Boolean} [notifyListeners] should listeners be notified;
       *                                    true by default, set to false to disable notification */
      replaceState: function (newState, notifyListeners) {
        this._currentStateBinding.setBackingValue(newState, notifyListeners);
      },

      /** Check if binding value was changed on last re-render.
       * @param {Binding} binding binding
       * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
       * @param {Function} [compare] compare function, '===' by default */
      changed: function (binding, subpath, compare) {
        var args = Util.resolveArgs(
          arguments,
          'binding', function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?compare'
        );
        var currentValue = args.binding.val(args.subpath);
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
          self._previousState = oldValue;
          if (self._fullUpdateQueued) {
            self._fullUpdateInProgress = true;
            rootComp.forceUpdate(function () {
              self._fullUpdateQueued = false;
              self._fullUpdateInProgress = false;
            });
          } else {
            rootComp.forceUpdate();
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

      /** Create React component updated only when its binding is modified.
       * Class in enriched with getState and getPreviousState methods.
       * @param {Object} spec React component spec
       * @return {Function} component constructor function */
      createClass: function (spec) {
        var context = this;

        enrichShouldComponentUpdate.call(this, context, spec);
        enrichComponentWillMount.call(this, context, spec);

        /** Get component state binding.
         * @param {String} [key] specific binding key (can only be used with multi-binding state)
         * @return {Binding} component state binding */
        spec.getState = function (key) {
          return getState(context, this, key);
        };

        /** Get component previous state value.
         * @param {String} [key] specific binding key (can only be used with multi-binding state)
         * @return {Binding} previous component state value */
        spec.getPreviousState = function (key) {
          return getState(context, this, key).withBackingValue(context._previousState).val();
        };

        return context.React.createClass(spec);
      },

      /** Queue full update on next render. */
      queueFullUpdate: function () {
        this._fullUpdateQueued = true;
      }

    });
  })();

  return {

    /** Create Morearty context.
     * @param {Object} React React instance
     * @param {Object} Immutable Immutable instance
     * @param {Map|Object} initialState initial state
     * @param {Object} [configuration] Morearty configuration. Supported parameters:
     * <ul>
     *   <li>statePropertyName - name of the property holding component's state, 'state' by default;</li>
     *   <li>requestAnimationFrameEnabled - enable rendering in requestAnimationFrame, false by default.</li>
     * </ul>
     * @return {Context}
     * @memberOf Morearty */
    createContext: function (React, Immutable, initialState, configuration) {
      Dyn.registerModule('React', React);
      Dyn.registerModule('Immutable', Immutable);

      var Map = Immutable.Map;
      var state = initialState instanceof Map ? initialState : Immutable.fromJS(initialState);
      var conf = configuration || {};
      return new Context(React, Immutable, state, {
        statePropertyName: conf.statePropertyName || 'state',
        requestAnimationFrameEnabled: conf.requestAnimationFrameEnabled || false
      });
    }

  };

});
