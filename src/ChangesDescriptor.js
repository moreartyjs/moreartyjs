var Util = require('./Util');

/** Changes descriptor constructor.
 * @param {Array} path absolute changed path
 * @param {Array} listenerPath absolute listener path
 * @param {Object} changesInfo changes info
 * @param {Boolean} changesInfo.valueChanged value changed flag
 * @param {Boolean} changesInfo.metaChanged meta changed flag
 * @param {Object} stateTransition state info object
 * @param {Immutable.Map} [stateTransition.currentBackingValue] current backing value
 * @param {Immutable.Map} [stateTransition.previousBackingValue] previous backing value
 * @param {Immutable.Map} [stateTransition.currentBackingMeta] current meta binding backing value
 * @param {Immutable.Map} [stateTransition.previousBackingMeta] previous meta binding backing value
 * @public
 * @class ChangesDescriptor
 * @classdesc Encapsulates binding changes for binding listeners. */
var ChangesDescriptor = function (path, listenerPath, changesInfo, stateTransition) {
  /** @private */
  this._path = path;
  /** @private */
  this._listenerPath = listenerPath;
  /** @private */
  this._metaPath = Util.joinPaths(listenerPath, [Util.META_NODE]);

  /** @private */
  this._changesInfo = changesInfo;

  /** @private */
  this._currentBackingValue = stateTransition.currentBackingValue;
  /** @private */
  this._previousBackingValue = stateTransition.previousBackingValue;

  /** @private */
  this._currentBackingMeta = stateTransition.currentBackingMeta;
  /** @private */
  this._previousBackingMeta = stateTransition.previousBackingMeta;
};

ChangesDescriptor.prototype = Object.freeze( /** @lends ChangesDescriptor.prototype */ {

  /** Get changed path relative to binding's path listener was installed on.
   * @return {Array} changed path */
  getPath: function () {
    var listenerPathLen = this._listenerPath.length;
    return listenerPathLen === this._path.length ? [] : this._path.slice(listenerPathLen);
  },

  /** Check if binding's value was changed.
   * @returns {Boolean} */
  isValueChanged: function () {
    return this._changesInfo.valueChanged;
  },

  /** Check if meta binding's value was changed.
   * @returns {Boolean} */
  isMetaChanged: function () {
    return this._changesInfo.metaChanged;
  },

  /** Get current value at listening path.
   * @returns {*} current value at listening path or null if not changed */
  getCurrentValue: function () {
    return this._currentBackingValue ? this._currentBackingValue.getIn(this._listenerPath) : null;
  },

  /** Get previous value at listening path.
   * @returns {*} previous value at listening path or null if not changed */
  getPreviousValue: function () {
    return this._previousBackingValue ? this._previousBackingValue.getIn(this._listenerPath) : null;
  },

  /** Get previous backing value.
   * @protected
   * @returns {*} */
  getPreviousBackingValue: function () {
    return this._previousBackingValue || null;
  },

  /** Get current meta at listening path.
   * @returns {*} current meta value at listening path or null if not changed */
  getCurrentMeta: function () {
    return this._currentBackingMeta ? this._currentBackingMeta.getIn(this._metaPath) : null;
  },

  /** Get previous meta at listening path.
   * @returns {*} current meta value at listening path or null if not changed */
  getPreviousMeta: function () {
    return this._previousBackingMeta ? this._previousBackingMeta.getIn(this._metaPath) : null;
  },

  /** Get previous backing meta value.
   * @protected
   * @returns {*} */
  getPreviousBackingMeta: function () {
    return this._previousBackingMeta || null;
  }

});

module.exports = ChangesDescriptor;
