/**
 * @name Callback
 * @namespace
 * @classdesc Miscellaneous callback util functions.
 */
define(['Util'], function (Util) {

  return {

    /** Create callback used to set binding value on an event.
     * @param {Binding} binding binding
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Function} [f] value transformer
     * @returns {Function} callback
     * @memberOf Callback */
    set: function (binding, subpath, f) {
      var args = Util.resolveArgs(
        arguments,
        'binding', function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?f'
      );

      return function (event) {
        var value = event.target.value;
        binding.set(args.subpath, args.f ? args.f(value) : value);
        return false;
      };
    },

    /** Create callback used to delete binding value on an event.
     * @param {Binding} binding binding
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Function} [pred] predicate
     * @returns {Function} callback
     * @memberOf Callback */
    delete: function (binding, subpath, pred) {
      var args = Util.resolveArgs(
        arguments,
        'binding', function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?pred'
      );

      return function (event) {
        var value = event.target.value;
        if (!args.pred || args.pred(value)) {
          binding.delete(args.subpath);
        }
        return false;
      };
    },

    /** Create callback invoked when specified key combination is pressed.
     * @param {Function} cb callback
     * @param {Number} charCode key code
     * @param {Boolean} shiftKey shift key flag
     * @param {Boolean} ctrlKey ctrl key flag
     * @returns {Function} callback
     * @memberOf Callback */
    onKey: function (cb, charCode, shiftKey, ctrlKey) {
      return function (event) {
        if (event.charCode === charCode && event.shiftKey === shiftKey && event.ctrlKey === ctrlKey) {
          cb(event);
          return false;
        } else {
          return true;
        }
      };
    },

    /** Create callback invoked when enter key is pressed.
     * @param {Function} cb callback
     * @returns {Function} callback
     * @memberOf Callback */
    onEnter: function (cb) {
      return this.onKey(cb, 13, false, false);
    },

    /** Create callback invoked when escape key is pressed.
     * @param {Function} cb callback
     * @returns {Function} callback
     * @memberOf Callback */
    onEscape: function (cb) {
      return this.onKey(cb, 27, false, false);
    }

  };

});
