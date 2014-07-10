define([], function () {

  /* ---------------- */
  /* Private helpers. */
  /* ---------------- */

  var throwAbstractMethod, throwPathMustPointToKey, isAssociative;

  throwAbstractMethod = function () {
    throw new Error('Abstract method invocation');
  };

  throwPathMustPointToKey = function () {
    throw new Error('Path must point to a key');
  };

  isAssociative = function (obj) {
    return obj instanceof Associative;
  };

  var createBacktrace, modifyNestedWith;

  createBacktrace = function (path, acc, associative, f) {
    if (path.length === 0) {
      return acc;
    } else {
      if (isAssociative(associative)) {
        var head = path[0];
        var next = associative.get(head);
        acc.unshift({ associative: associative, key: head });
        return createBacktrace(path.slice(1), acc, next, f);
      } else {
        return acc;
      }
    }
  };

  modifyNestedWith = function (self, path, f) {
    var backtrace = createBacktrace(path, [], self);
    if (backtrace.length !== path.length) {
      return self;
    } else {
      var head = backtrace[0], associative = head.associative, key = head.key;
      var updated = f(associative, key);
      return updated === associative ?
        self :
        backtrace.slice(1).reduce(
          function (acc, elem) { return elem.associative.assoc(elem.key, acc); },
          updated
        );
    }
  };

  /** Associative data structure constructor.
   * @see Map
   * @see Vector
   * @public
   * @abstract
   * @class Associative
   * @classdesc Generic interface for associative data structures, namely Map and Vector. */
  var Associative = function () {
    if (this.constructor === Associative) {
      throw new Error('Abstract class instatiation');
    }
  };

  //noinspection JSUnusedLocalSymbols
  Associative.prototype = Object.freeze( /** @lends Associative.prototype */ {

    // abstract methods

    /** Get associated value.
     * @param {*} key key
     * @return {Object} value or null
     * @abstract */
    get: function (key) {
      throwAbstractMethod();
    },

    /** Update existing value.
     * @param {*} key key
     * @param {Function} f update function
     * @return {Associative} new associative instance, original is unaffected
     * @abstract */
    update: function (key, f) {
      throwAbstractMethod();
    },

    /** Associate a key with a value.
     * @param {*} key key
     * @param {*} value value
     * @return {Associative} new associative instance, original is unaffected
     * @abstract */
    assoc: function (key, value) {
      throwAbstractMethod();
    },

    /** Remove mapping.
     * @param {*} key key
     * @return {Associative} new associative instance, original is unaffected
     * @abstract */
    dissoc: function (key) {
      throwAbstractMethod();
    },

    // concrete methods defined in terms of abstract methods

    /** Check whether supplied object is instance of {@link Associative}.
     * @param {Object} obj object to check
     * @return {Boolean} */
    isAssociative: function (obj) {
      return isAssociative(obj);
    },

    /** Get value from a nested associative collection.
     * @param {Array} path path to nested key
     * @return {*} nested value or null */
    getIn: function (path) {
      if (path.length > 0) {
        var head = path[0], tail = path.slice(1);
        var next = this.get(head);
        if (next !== null) {
          return isAssociative(next) ? next.getIn(tail) : (tail.length === 0 ? next : null);
        } else {
          return null;
        }
      } else {
        return this;
      }
    },

    /** Update existing nested value or create new mapping.
     * If key is missing, f will be called without arguments and the result will be associated with the key.
     * @param {Array} path path to existing nested key
     * @param {Function} f update function
     * @return {Associative} new associative instance, original is unaffected */
    updateIn: function (path, f) {
      if (path.length === 0) {
        throwPathMustPointToKey();
      } else {
        return modifyNestedWith(this, path, function (associative, key) {
          return associative.update(key, f);
        });
      }
    },

    /** Remove existing nested value.
     * @param {Array} path path to nested value
     * @return {Associative} new associative instance, original is unaffected */
    dissocIn: function (path) {
      switch (path.length) {
        case 0:
          throwPathMustPointToKey();
          break;
        case 1:
          return this.dissoc(path[0]);
        default:
          return modifyNestedWith(this, path, function (associative, key) {
            return associative.dissoc(key);
          });
      }
    }

  });

  return Associative;

});
