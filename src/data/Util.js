/**
 * @name DataUtil
 * @namespace
 * @classdesc Miscellaneous data-related util functions.
 */
define(['data/Map', 'data/Vector'], function (Map, Vector) {

  var toJs, fromJs;

  toJs = function (associative) {
    if (Map.isInstance(associative)) {
      return associative.toObject(toJs);
    } else if (Vector.isInstance(associative)) {
      return associative.toArray(toJs);
    } else {
      return associative;
    }
  };

  fromJs = function (js) {
    if (Array.isArray(js)) {
      return Vector.fillFromArray(js, fromJs);
    } else if (typeof js === 'object') {
      return Map.fillFromObject(js, fromJs);
    } else {
      return js;
    }
  };

  return {

    /** Convert associative data structure to JavaScript native representation.
     * @param {Associative} associative associative data structure
     * @return {Object|Array} JavaScript representation
     * @see Associative
     * @memberOf DataUtil */
    toJs: function (associative) {
      return toJs(associative);
    },

    /** Convert JavaScript data structure to associative.
     * @param {Object|Array} js JavaScript object or array
     * @return {Associative} associative data structure
     * @see Associative
     * @memberOf DataUtil */
    fromJs: function (js) {
      return fromJs(js);
    },

    /** Group collection by key.
     * @param {Vector} vec vector
     * @param {String|Array} key key to group by
     * @param {Function} [f] value transformer
     * @returns {Map}
     * @memberOf DataUtil */
    groupBy: function (vec, key, f) {
      return vec.reduce(
        function (map, value) {
          var groupBy = Array.isArray(key) ? value.getIn(key) : value.get(key);
          if (groupBy) {
            return map.assoc(f ? f(groupBy) : groupBy, value);
          } else {
            return map;
          }
        },
        Map
      );
    }

  };

});
