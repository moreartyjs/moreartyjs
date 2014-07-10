module.exports = {

  /** Generate random alpha-numeric string of specified length.
   * @param {Number} [length] length (default to 8 if omitted)
   * @return {String} generated string
   * @memberOf Util */
  genRandomString: function (length) {
    var effectiveLength = length !== undefined ? length : 8;
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var s = '';
    for (var i = 0; i < effectiveLength; i++) {
      var rnum = Math.floor(Math.random() * chars.length);
      s += chars.substring(rnum, rnum + 1);
    }
    return s;
  },

  /** Generate random number within specified bounds (inclusive).
   * @param {Number} min lower bound (inclusive)
   * @param {Number} max upper bound (inclusive)
   * @returns {Number} random number within specified range
   * @memberOf Util */
  genRandomNumber: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

};
