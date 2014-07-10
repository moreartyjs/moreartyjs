/**
 * @name Morearty
 * @namespace
 * @classdesc Morearty main module. Exposes [createContext]{@link Morearty.createContext} function.
 * <p>Exposed modules:
 * <ul>
 *   <li>[Util]{@link Util};</li>
 *   <li>[Map]{@link Map}, available at Data.Map;</li>
 *   <li>[Vector]{@link Vector}, available at Data.Vector;</li>
 *   <li>[DataUtil]{@link DataUtil}, available at Data.Util;</li>
 *   <li>[Binding]{@link Binding};</li>
 *   <li>[History]{@link History};</li>
 *   <li>[Callback]{@link Callback}.</li>
 * </ul>
 */
define(['Util', 'data/Map', 'data/Vector', 'data/Util', 'Binding', 'History', 'util/Callback'], function (Util, Map, Vector, DataUtil, Binding, History, Callback) {

  /** Morearty context constructor.
   * @param {Object} React React instance
   * @param {Associative} initialState initial state
   * @param {Object} configuration configuration
   * @public
   * @class Context
   * @classdesc Represents Morearty context. TODO documentation
   * <p>Exposed modules:
   * <ul>
   *   <li>React - React instance;</li>
   *   <li>[Util]{@link Util};</li>
   *   <li>[Map]{@link Map}, available at Data.Map;</li>
   *   <li>[Vector]{@link Vector}, available at Data.Vector;</li>
   *   <li>[DataUtil]{@link DataUtil}, available at Data.Util;</li>
   *   <li>[Binding]{@link Binding};</li>
   *   <li>[History]{@link History};</li>
   *   <li>[Callback]{@link Callback}.</li>
   * </ul>
   */
  var Context = function (React, initialState, configuration) {
    /** React instance.
     * @public */
    this.React = React;

    /** @private */
    this._previousState = Map;
    /** @private */
    this._currentStateBinding = Binding.init(initialState);
    /** @private */
    this._configuration = configuration;

    /** @private */
    this._forceUpdateQueued = false;
    /** @private */
    this._forceUpdateInProgress = false;
  };

  Context.prototype = (function () {

    var getState, bindingChanged, stateChanged;

    getState = function (context, comp, key) {
      var state = comp.props[context._configuration.statePropertyName];
      return key ? state[key] : state;
    };

    bindingChanged = function (binding, previousState) {
      var currentValue = binding.val();
      var previousValue = binding.withBackingValue(previousState).val();
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

    return Object.freeze( /** @lends Context.prototype */ {

      /** Util module.
       * @see Util */
      Util: Util,

      /** Data structures. Exposes {@link Map}, {@link Vector}, and {@link DataUtil} submodules.
       * @see Map
       * @see Vector */
      Data: {
        Map: Map,
        Vector: Vector,
        Util: DataUtil
      },

      /** Binding module.
       * @see Binding */
      Binding: Binding,

      /** History module.
       * @see History */
      History: History,

      /** Callback module.
       * @see Callback */
      Callback: Callback,

      /** Get state binding.
       * @return {Binding} state binding
       * @see Binding */
      state: function () {
        return this._currentStateBinding;
      },

      /** Get current state.
       * @return {Associative} current state */
      currentState: function () {
        return this.state().val();
      },

      /** Get previous state.
       * @return {Associative} previous state */
      previousState: function () {
        return this._previousState;
      },

      /** Initialize rendering.
       * @param {Object} rootComp root application component */
      init: function (rootComp) {
        var self = this;
        self._currentStateBinding.addGlobalListener(function (newValue, oldValue) {
          self._previousState = oldValue;
          if (self._forceUpdateQueued) {
            self._forceUpdateInProgress = true;
            rootComp.forceUpdate(function () {
              self._forceUpdateQueued = false;
              self._forceUpdateInProgress = false;
            });
          } else {
            rootComp.forceUpdate();
          }
        });
      },

      /** Create React component updated only when its binding is modified.
       * Class in enriched with getState method.
       * @param {Object} spec React component spec
       * @return {Function} component constructor function */
      createClass: function (spec) {
        var context = this;

        var shouldComponentUpdate = function () {
          if (context._forceUpdateInProgress) {
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

        /** Get component state binding.
         * @param {String} [key] specific binding key (can only be used with multi-binding state)
         * @return {Binding} component state binding */
        spec.getState = function (key) {
          return getState(context, this, key);
        };

        return context.React.createClass(spec);
      },

      /** Force update on next render. */
      queueForceUpdate: function () {
        this._forceUpdateQueued = true;
      }

    });
  })();

  return {

    /** Create Morearty context.
     * @param {Object} React React instance
     * @param {Map|Object} initialState initial state
     * @param {Object} [configuration] Morearty configuration. Supported parameters: statePropertyName.
     * @return {Context}
     * @memberOf Morearty */
    createContext: function (React, initialState, configuration) {
      var state = Map.isAssociative(initialState) ? initialState : DataUtil.fromJs(initialState);
      var conf = configuration || {};
      return new Context(React, state, {
        statePropertyName: conf.statePropertyName || 'state'
      });
    }

  };

});
