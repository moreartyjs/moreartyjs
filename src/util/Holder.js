define([], function () {

  /** Holder constructor.
   * @param {*} value value
   * @public
   * @class Holder
   * @classdesc Mutable cell holding some value. */
  var Holder = function (value) {
    /** @private */
    this._value = value;
  };

  Holder.prototype = Object.freeze( /** @lends Holder.prototype */ {

    /** Create new holder instance.
     * @param {*} value value
     * @return {Holder} fresh holder */
    init: function (value) {
      return new Holder(value);
    },

    /** Get value.
     * @return {*} */
    getValue: function () {
      return this._value;
    },

    /** Set value.
     * @param {*} newValue new value */
    setValue: function (newValue) {
      this._value = newValue;
    },

    /** Update value with a function.
     * @param {Function} update update function
     * @return {*} old value */
    updateValue: function (update) {
      var oldValue = this._value;
      this._value = update(oldValue);
      return oldValue;
    }

  });

  return new Holder(null);

});
