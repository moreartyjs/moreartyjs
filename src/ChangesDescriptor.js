/** Changes descriptor constructor.
 * @param {Array} path absolute changed path
 * @param {Array} listenerPath absolute listener path
 * @param {Boolean} valueChanged value changed flag
 * @param {Immutable.Map} previousValue previous backing value
 * @param {Immutable.Map} previousMeta previous meta binding backing value
 * @public
 * @class ChangesDescriptor
 * @classdesc Encapsulates binding changes for binding listeners. */
var ChangesDescriptor =
  function (path, listenerPath, valueChanged, previousValue, previousMeta) {
    /** @private */
    this._path = path;
    /** @private */
    this._listenerPath = listenerPath;
    /** @private */
    this._valueChanged = valueChanged;
    /** @private */
    this._previousValue = previousValue;
    /** @private */
    this._previousMeta = previousMeta;
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
    return this._valueChanged;
  },

  /** Check if meta binding's value was changed.
   * @returns {Boolean} */
  isMetaChanged: function () {
    return !!this._previousMeta;
  },

  /** Get previous value at listening path.
   * @returns {*} previous value at listening path or null if not changed */
  getPreviousValue: function () {
    return this._previousValue && this._previousValue.getIn(this._listenerPath);
  },

  /** Get previous backing value.
   * @protected
   * @returns {*} */
  getPreviousBackingValue: function () {
    return this._previousValue;
  },

  /** Get previous meta at listening path.
   * @returns {*} */
  getPreviousMeta: function () {
    return this._previousMeta && this._previousMeta.getIn(this._listenerPath);
  },

  /** Get previous backing meta value.
   * @protected
   * @returns {*} */
  getPreviousBackingMeta: function () {
    return this._previousMeta;
  }

});

module.exports = ChangesDescriptor;
