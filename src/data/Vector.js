define(['Util', 'data/Associative'], function (Util, Associative) {

  /* ---------------- */
  /* Private helpers. */
  /* ---------------- */

  var updateBackingArray, equals, isInstance;

  updateBackingArray = function (vector, f) {
    var newBackingArray = vector._backingArray.slice(0);
    return new Vector(f(newBackingArray));
  };

  equals = function (arr1, arr2, self) {
    if (arr1 === arr2) {
      return true;
    } else {
      if (arr1.length !== arr2.length) {
        return false;
      } else {
        return arr1.every(function (el, index) {
          var other = arr2[index];
          return self.isAssociative(el) && self.isAssociative(other) ? el.equals(other) : el === other;
        });
      }
    }
  };

  isInstance = function (obj) {
    return obj instanceof Vector;
  };

  /* -------------------- */
  /* Vector wrapper type. */
  /* -------------------- */

  /** Vector constructor.
   * @param {Array} backingArray backing array
   * @public
   * @class Vector
   * @augments Associative
   * @classdesc Simple immutable vector implementation based on array copying. */
  var Vector = function (backingArray) {
    /** @private */
    this._backingArray = backingArray;
  };

  Vector.prototype = Object.freeze( /** @lends Vector.prototype */ {

    // common methods

    /** Fill vector from variable-length arguments list.
     * Effectively concatenates this vector elements with arguments list.
     * @param {...Object} var_args arguments list in form of 'value1, value2, ...' values
     * @return {Vector} new vector instance, original is unaffected
     * @public */
    fill: function (var_args) {
      if (arguments.length === 0) {
        return this;
      } else {
        var args = Array.prototype.slice.call(arguments);
        return new Vector(this._backingArray.concat(args));
      }
    },

    /** Check whether vector is empty.
     * @return {Boolean} */
    isEmpty: function () {
      return this._backingArray.length === 0;
    },

    /** Get value by index.
     * @param {Number} index index
     * @return {Object} value or null */
    get: function (index) {
      var result = this._backingArray[index];
      return Util.undefinedOrNull(result) ? null : result;
    },

    /** Check if vector contains a mapping for the specified index.
     * @param {Number} index index
     * @return {Boolean} */
    contains: function (index) {
      return index < this._backingArray.length;
    },

    /** Update existing value or create new mapping.
     * If index is out of range, f will be called without arguments and the result will be put at index position,
     * filling possible gaps with undefined values.
     * @param {Number} index index
     * @param {Function} f update function
     * @return {Vector} new vector instance, original is unaffected */
    update: function (index, f) {
      if (this.contains(index)) {
        var originalValue = this.get(index);
        var updatedValue = f(originalValue);
        if (updatedValue === originalValue) {
          return this;
        } else {
          return updateBackingArray(this, function (arr) {
            arr[index] = updatedValue;
            return arr;
          });
        }
      } else {
        var value = f();
        return updateBackingArray(this, function (arr) {
          arr[index] = value;
          return arr;
        });
      }
    },

    /** Update existing value.
     * @param {Number} index index
     * @param {Function} f update function
     * @return {Vector} new Vector instance, original is unaffected */
    updateIfExists: function (index, f) {
      return this.contains(index) ? this.update(index, f) : this;
    },

    /** Associate an index with a value, filling possible gaps with undefined values.
     * @param {Number} index index
     * @param {*} value value
     * @return {Vector} new vector instance, original is unaffected */
    assoc: function (index, value) {
      return this.update(index, Util.constantly(value));
    },

    /** Remove a value by index.
     * Vector is shrinked starting from the index position,
     * so that all following indices are decremented by one.
     * @param {Number} index index
     * @return {Vector} new Vector instance, original is unaffected */
    dissoc: function (index) {
      return this.contains(index) ?
        updateBackingArray(this, function (arr) {
          arr.splice(index, 1);
          return arr;
        }) :
        this;
    },

    /** Join two vectors.
     * Effectively concatenates this vector with another vector.
     * @param {Vector} anotherVector vector to join with
     * @return {Vector} new vector instance, original vectors are unaffected */
    join: function (anotherVector) {
      if (this.isEmpty()) {
        return anotherVector;
      } else if (anotherVector.isEmpty()) {
        return this;
      } else {
        return new Vector(this._backingArray.concat(anotherVector._backingArray));
      }
    },

    /** Create vector iterator.
     * @see Iter
     * @see VectorIter
     * @returns {VectorIter} */
    iter: function () {
      return new VectorIter(this);
    },

    /** Reduce vector left to right with function f and initial value acc.
     * @param {Function} f reduce function accepting following parameters in order: acc, value, index, originalVector
     * @param {*} acc initial value
     * @return {*} reduce result */
    reduce: function (f, acc) {
      return this._backingArray.reduce(
        function (acc, value, index) { return f(acc, value, index, this); }.bind(this),
        acc
      );
    },

    /** Map values.
     * @param {Function} f map function
     * @return {Vector} new vector instance, original is unaffected */
    map: function (f) {
      var self = this;
      return self.isEmpty() ? self : updateBackingArray(self, function (arr) {
        return arr.map(function (value, index) {
          return f(value, index, self);
        });
      });
    },

    /** Execute side-effecting function for each element.
     * @param {Function} f function called for each element */
    foreach: function (f) {
      var self = this;
      if (!self.isEmpty()) {
        self._backingArray.forEach(function (value, index) {
          f(value, index, self);
        });
      }
    },

    /** Filter using a predicate.
     * @param {Function} pred predicate
     * @return {Vector} new vector instance, original is unaffected */
    filter: function (pred) {
      var self = this;
      var result = self.isEmpty() ? self : updateBackingArray(self, function (arr) {
        return arr.filter(function (value, index) {
          return pred(value, index, self);
        });
      });
      return result.size() === self.size() ? self : result;
    },

    /** Find element using a predicate.
     * @param {Function} pred predicate
     * @returns {*} found value or null */
    find: function (pred) {
      var self = this;
      return Util.find(self._backingArray, function (value, index) {
        return pred(value, index, self);
      });
    },

    /** Check whether both vectors contain exactly the same values in order.
     * Associative values are compared recursively, ordinal values are compared using '==='.
     * @param {Vector} otherVector vector to compare with
     * @return {Boolean} */
    equals: function (otherVector) {
      return this === otherVector ||
        (otherVector instanceof Vector && equals(this._backingArray, otherVector._backingArray, this));
    },

    /** Get the number of elements.
     * @return {Number} */
    size: function () {
      return this._backingArray.length;
    },

    /** Get human-readable vector representation.
     * @return {String} */
    toString: function () {
      return '[' + this._backingArray.map(function (x) { return Util.toString(x); }).join(', ') + ']';
    },

    /** Check whether obj is vector instance.
     * @param {*} obj object to check
     * @return {Boolean} */
    isInstance: function (obj) {
      return isInstance(obj);
    },

    // Vector-specific methods

    /** Insert element at the specified index. Following elements indices are incremented by one.
     * @param {Number} index index
     * @param {*} value value
     * @return {Vector} new vector instance, original is unaffected */
    insertAt: function (index, value) {
      return updateBackingArray(this, function (arr) {
        if (index < arr.length) {
          arr.splice(index, 0, value);
        } else {
          arr[index] = value;
        }
        return arr;
      });
    },

    /** Prepend value to the beginning of the vector.
     * @param {*} value value
     * @return {Vector} new vector instance, original is unaffected */
    prepend: function (value) {
      return updateBackingArray(this, function (arr) {
        arr.unshift(value);
        return arr;
      });
    },

    /** Append value to the end of the vector.
     * @param {*} value value
     * @return {Vector} new vector instance, original is unaffected */
    append: function (value) {
      return updateBackingArray(this, function (arr) {
        arr.push(value);
        return arr;
      });
    },

    /** Fill vector from JavaScript array. Effectively concatenates this vector with the array supplied.
     * @param {Array} arr JavaScript array
     * @param {Function} [f] function applied to each value
     * @return {Vector} new vector instance, original is unaffected */
    fillFromArray: function (arr, f) {
      var effectiveArr = f ? arr.map(f) : arr;
      return this.fill.apply(this, effectiveArr);
    },

    /** Convert to JavaScript array.
     * @param {Function} [f] function applied to each value
     * @return {Array} JavaScript array containing same values in same order as this vector */
    toArray: function (f) {
      return f ? this._backingArray.map(f) : this._backingArray.slice(0);
    }

  });

  Util.subclass(Vector, Associative);

  /** Vector iterator constructor.
   * @param {Vector} vector vector
   * @public
   * @class VectorIter
   * @augments Iter
   * @classdesc Vector iterator. */
  var VectorIter = function (vector) {
    /** @private */
    this._backingArray = vector._backingArray;
    /** @private */
    this._nextIndex = 0;
  };

  VectorIter.prototype = Object.freeze( /** @lends VectorIter.prototype */ {

    /** Check if iterator has more elements.
     * @return {Boolean} */
    hasNext: function () {
      return this._nextIndex < this._backingArray.length;
    },

    /** Get next element and advance iterator one step forward.
     * @return {*} */
    next: function () {
      return this._backingArray[this._nextIndex++];
    }

  });

  Util.subclass(VectorIter, Associative.prototype.Iter);

  return new Vector([]);

});
