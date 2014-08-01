!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Immutable=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var Sequence = _dereq_('./Sequence').Sequence;
var ImmutableMap = _dereq_('./Map');
var OrderedMap = _dereq_('./OrderedMap');
var ImmutableSet = _dereq_('./Set');
var Vector = _dereq_('./Vector');
var Range = _dereq_('./Range');
var Repeat = _dereq_('./Repeat');
var Record = _dereq_('./Record');


/**
 * The same semantics as Object.is(), but treats immutable sequences as
 * data, equal when the structure contains equivalent data.
 */
function is(first, second) {
  if (first === second) {
    return first !== 0 || second !== 0 || 1 / first === 1 / second;
  }
  if (first !== first) {
    return second !== second;
  }
  if (first instanceof Sequence) {
    return first.equals(second);
  }
  return false;
}

function fromJS(json, converter) {
  if (converter) {
    return fromJSWith(converter, json, '', {'': json});
  }
  return fromJSDefault(json);
}

function fromJSDefault(json) {
  if (json) {
    if (Array.isArray(json)) {
      return Sequence(json).map(fromJSDefault).toVector();
    }
    if (json.constructor === Object) {
      return Sequence(json).map(fromJSDefault).toMap();
    }
  }
  return json;
}

function fromJSWith(converter, json, key, parentJSON) {
  if (json && (Array.isArray(json) || json.constructor === Object)) {
    return converter.call(parentJSON, key, Sequence(json).map(function(v, k)  {return fromJSWith(converter, v, k, json);}));
  }
  return json;
}

exports.is = is;
exports.fromJS = fromJS;
exports.Sequence = Sequence;
exports.Range = Range;
exports.Repeat = Repeat;
exports.Vector = Vector;
exports.Map = ImmutableMap;
exports.OrderedMap = OrderedMap;
exports.Set = ImmutableSet;
exports.Record = Record;

},{"./Map":2,"./OrderedMap":3,"./Range":4,"./Record":5,"./Repeat":6,"./Sequence":7,"./Set":8,"./Vector":9}],2:[function(_dereq_,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var Sequence = _dereq_('./Sequence').Sequence;


for(var Sequence____Key in Sequence){if(Sequence.hasOwnProperty(Sequence____Key)){Map[Sequence____Key]=Sequence[Sequence____Key];}}var ____SuperProtoOfSequence=Sequence===null?null:Sequence.prototype;Map.prototype=Object.create(____SuperProtoOfSequence);Map.prototype.constructor=Map;Map.__superConstructor__=Sequence;

  // @pragma Construction

  function Map(sequence) {"use strict";
    if (sequence && sequence.constructor === Map) {
      return sequence;
    }
    if (!sequence || sequence.length === 0) {
      return Map.empty();
    }
    return Map.empty().merge(sequence);
  }

  Map.empty=function() {"use strict";
    return __EMPTY_MAP || (__EMPTY_MAP = Map.$Map_make(0));
  };

  Map.prototype.toString=function() {"use strict";
    return this.__toString('Map {', '}');
  };

  // @pragma Access

  Map.prototype.get=function(k, undefinedValue) {"use strict";
    if (k == null || this.$Map_root == null) {
      return undefinedValue;
    }
    return this.$Map_root.get(0, hashValue(k), k, undefinedValue);
  };

  // @pragma Modification

  Map.prototype.set=function(k, v) {"use strict";
    if (k == null) {
      return this;
    }
    var newLength = this.length;
    var newRoot;
    if (this.$Map_root) {
      var didAddLeaf = BoolRef();
      newRoot = this.$Map_root.set(this.__ownerID, 0, hashValue(k), k, v, didAddLeaf);
      didAddLeaf.value && newLength++;
    } else {
      newLength++;
      newRoot = makeNode(this.__ownerID, 0, hashValue(k), k, v);
    }
    if (this.__ownerID) {
      this.length = newLength;
      this.$Map_root = newRoot;
      return this;
    }
    return newRoot === this.$Map_root ? this : Map.$Map_make(newLength, newRoot);
  };

  Map.prototype.delete=function(k) {"use strict";
    if (k == null || this.$Map_root == null) {
      return this;
    }
    if (this.__ownerID) {
      var didRemoveLeaf = BoolRef();
      this.$Map_root = this.$Map_root.delete(this.__ownerID, 0, hashValue(k), k, didRemoveLeaf);
      didRemoveLeaf.value && this.length--;
      return this;
    }
    var newRoot = this.$Map_root.delete(this.__ownerID, 0, hashValue(k), k);
    return !newRoot ? Map.empty() : newRoot === this.$Map_root ? this : Map.$Map_make(this.length - 1, newRoot);
  };

  Map.prototype.clear=function() {"use strict";
    if (this.__ownerID) {
      this.length = 0;
      this.$Map_root = null;
      return this;
    }
    return Map.empty();
  };

  // @pragma Composition

  Map.prototype.merge=function() {"use strict";
    return mergeIntoMapWith(this, null, arguments);
  };

  Map.prototype.mergeWith=function(merger)  {"use strict";var seqs=Array.prototype.slice.call(arguments,1);
    return mergeIntoMapWith(this, merger, seqs);
  };

  Map.prototype.mergeDeep=function() {"use strict";
    return mergeIntoMapWith(this, deepMerger(null), arguments);
  };

  Map.prototype.mergeDeepWith=function(merger)  {"use strict";var seqs=Array.prototype.slice.call(arguments,1);
    return mergeIntoMapWith(this, deepMerger(merger), seqs);
  };

  Map.prototype.updateIn=function(keyPath, updater) {"use strict";
    return updateInDeepMap(this, keyPath, updater, 0);
  };

  // @pragma Mutability

  Map.prototype.withMutations=function(fn) {"use strict";
    var mutable = this.asMutable();
    fn(mutable);
    return mutable.__ensureOwner(this.__ownerID);
  };

  Map.prototype.asMutable=function() {"use strict";
    return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
  };

  Map.prototype.asImmutable=function() {"use strict";
    return this.__ensureOwner();
  };

  Map.prototype.__ensureOwner=function(ownerID) {"use strict";
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      this.__ownerID = ownerID;
      return this;
    }
    return Map.$Map_make(this.length, this.$Map_root, ownerID);
  };

  // @pragma Iteration

  Map.prototype.__deepEqual=function(other) {"use strict";
    var is = _dereq_('./Immutable').is;
    // Using Sentinel here ensures that a missing key is not interpretted as an
    // existing key set to be null.
    var self = this;
    return other.every(function(v, k)  {return is(self.get(k, __SENTINEL), v);});
  };

  Map.prototype.__iterate=function(fn, reverse) {"use strict";
    return this.$Map_root ? this.$Map_root.iterate(this, fn, reverse) : 0;
  };

  // @pragma Private

  Map.$Map_make=function(length, root, ownerID) {"use strict";
    var map = Object.create(Map.prototype);
    map.length = length;
    map.$Map_root = root;
    map.__ownerID = ownerID;
    return map;
  };


Map.from = Map;



  function OwnerID() {"use strict";}





  function BitmapIndexedNode(ownerID, bitmap, keys, values) {"use strict";
    this.ownerID = ownerID;
    this.bitmap = bitmap;
    this.keys = keys;
    this.values = values;
  }

  BitmapIndexedNode.prototype.get=function(shift, hash, key, notFound) {"use strict";
    var idx = (hash >>> shift) & MASK;
    if ((this.bitmap & (1 << idx)) === 0) {
      return notFound;
    }
    var keyOrNull = this.keys[idx];
    var valueOrNode = this.values[idx];
    if (keyOrNull == null) {
      return valueOrNode.get(shift + SHIFT, hash, key, notFound);
    }
    return key === keyOrNull ? valueOrNode : notFound;
  };

  BitmapIndexedNode.prototype.set=function(ownerID, shift, hash, key, value, didAddLeaf) {"use strict";
    var editable;
    var idx = (hash >>> shift) & MASK;
    var bit = 1 << idx;
    if ((this.bitmap & bit) === 0) {
      didAddLeaf && (didAddLeaf.value = true);
      editable = this.ensureOwner(ownerID);
      editable.keys[idx] = key;
      editable.values[idx] = value;
      editable.bitmap |= bit;
      return editable;
    }
    var keyOrNull = this.keys[idx];
    var valueOrNode = this.values[idx];
    var newNode;
    if (keyOrNull == null) {
      newNode = valueOrNode.set(ownerID, shift + SHIFT, hash, key, value, didAddLeaf);
      if (newNode === valueOrNode) {
        return this;
      }
      editable = this.ensureOwner(ownerID);
      editable.values[idx] = newNode;
      return editable;
    }
    if (key === keyOrNull) {
      if (value === valueOrNode) {
        return this;
      }
      editable = this.ensureOwner(ownerID);
      editable.values[idx] = value;
      return editable;
    }
    var originalHash = hashValue(keyOrNull);
    if (hash === originalHash) {
      newNode = new HashCollisionNode(ownerID, hash, [keyOrNull, key], [valueOrNode, value]);
    } else {
      newNode = makeNode(ownerID, shift + SHIFT, originalHash, keyOrNull, valueOrNode)
        .set(ownerID, shift + SHIFT, hash, key, value);
    }
    didAddLeaf && (didAddLeaf.value = true);
    editable = this.ensureOwner(ownerID);
    delete editable.keys[idx];
    editable.values[idx] = newNode;
    return editable;
  };

  BitmapIndexedNode.prototype.delete=function(ownerID, shift, hash, key, didRemoveLeaf) {"use strict";
    var editable;
    var idx = (hash >>> shift) & MASK;
    var bit = 1 << idx;
    var keyOrNull = this.keys[idx];
    if ((this.bitmap & bit) === 0 || (keyOrNull != null && key !== keyOrNull)) {
      return this;
    }
    if (keyOrNull == null) {
      var node = this.values[idx];
      var newNode = node.delete(ownerID, shift + SHIFT, hash, key, didRemoveLeaf);
      if (newNode === node) {
        return this;
      }
      if (newNode) {
        editable = this.ensureOwner(ownerID);
        editable.values[idx] = newNode;
        return editable;
      }
    } else {
      didRemoveLeaf && (didRemoveLeaf.value = true);
    }
    if (this.bitmap === bit) {
      return null;
    }
    editable = this.ensureOwner(ownerID);
    delete editable.keys[idx];
    delete editable.values[idx];
    editable.bitmap ^= bit;
    return editable;
  };

  BitmapIndexedNode.prototype.ensureOwner=function(ownerID) {"use strict";
    if (ownerID && ownerID === this.ownerID) {
      return this;
    }
    return new BitmapIndexedNode(ownerID, this.bitmap, this.keys.slice(), this.values.slice());
  };

  BitmapIndexedNode.prototype.iterate=function(map, fn, reverse) {"use strict";
    var values = this.values;
    var keys = this.keys;
    var maxIndex = values.length;
    for (var ii = 0; ii <= maxIndex; ii++) {
      var index = reverse ? maxIndex - ii : ii;
      var key = keys[index];
      var valueOrNode = values[index];
      if (key != null) {
        if (fn(valueOrNode, key, map) === false) {
          return false;
        }
      } else if (valueOrNode && !valueOrNode.iterate(map, fn, reverse)) {
        return false;
      }
    }
    return true;
  };





  function HashCollisionNode(ownerID, collisionHash, keys, values) {"use strict";
    this.ownerID = ownerID;
    this.collisionHash = collisionHash;
    this.keys = keys;
    this.values = values;
  }

  HashCollisionNode.prototype.get=function(shift, hash, key, notFound) {"use strict";
    var idx = Sequence(this.keys).indexOf(key);
    return idx === -1 ? notFound : this.values[idx];
  };

  HashCollisionNode.prototype.set=function(ownerID, shift, hash, key, value, didAddLeaf) {"use strict";
    if (hash !== this.collisionHash) {
      didAddLeaf && (didAddLeaf.value = true);
      return makeNode(ownerID, shift, hash, null, this)
        .set(ownerID, shift, hash, key, value);
    }
    var idx = Sequence(this.keys).indexOf(key);
    if (idx >= 0 && this.values[idx] === value) {
      return this;
    }
    var editable = this.ensureOwner(ownerID);
    if (idx === -1) {
      editable.keys.push(key);
      editable.values.push(value);
      didAddLeaf && (didAddLeaf.value = true);
    } else {
      editable.values[idx] = value;
    }
    return editable;
  };

  HashCollisionNode.prototype.delete=function(ownerID, shift, hash, key, didRemoveLeaf) {"use strict";
    var idx = this.keys.indexOf(key);
    if (idx === -1) {
      return this;
    }
    didRemoveLeaf && (didRemoveLeaf.value = true);
    if (this.values.length > 1) {
      var editable = this.ensureOwner(ownerID);
      editable.keys[idx] = editable.keys.pop();
      editable.values[idx] = editable.values.pop();
      return editable;
    }
  };

  HashCollisionNode.prototype.ensureOwner=function(ownerID) {"use strict";
    if (ownerID && ownerID === this.ownerID) {
      return this;
    }
    return new HashCollisionNode(ownerID, this.collisionHash, this.keys.slice(), this.values.slice());
  };

  HashCollisionNode.prototype.iterate=function(map, fn, reverse) {"use strict";
    var values = this.values;
    var keys = this.keys;
    var maxIndex = values.length - 1;
    for (var ii = 0; ii <= maxIndex; ii++) {
      var index = reverse ? maxIndex - ii : ii;
      if (fn(values[index], keys[index], map) === false) {
        return false;
      }
    }
    return true;
  };



function makeNode(ownerID, shift, hash, key, valOrNode) {
  var idx = (hash >>> shift) & MASK;
  var keys = [];
  var values = [];
  values[idx] = valOrNode;
  key != null && (keys[idx] = key);
  return new BitmapIndexedNode(ownerID, 1 << idx, keys, values);
}

function deepMerger(merger) {
  return function(existing, value) 
    {return existing && existing.mergeDeepWith ?
      existing.mergeDeepWith(merger, value) :
      merger ? merger(existing, value) : value;};
}

function mergeIntoMapWith(map, merger, seqs) {
  if (seqs.length === 0) {
    return map;
  }
  return map.withMutations(function(map)  {
    for (var ii = 0; ii < seqs.length; ii++) {
      var seq = seqs[ii];
      if (seq) {
        seq = seq.forEach ? seq : Sequence(seq);
        seq.forEach(
          merger ?
          function(value, key)  {
            var existing = map.get(key, __SENTINEL);
            map.set(key, existing === __SENTINEL ? value : merger(existing, value));
          } :
          function(value, key)  {
            map.set(key, value);
          }
        );
      }
    }
  });
}

function updateInDeepMap(collection, keyPath, updater, pathOffset) {
  var key = keyPath[pathOffset];
  var nested = collection.get ? collection.get(key, __SENTINEL) : __SENTINEL;
  if (nested === __SENTINEL) {
    return collection;
  }
  return collection.set ? collection.set(
    key,
    pathOffset === keyPath.length - 1 ?
      updater(nested) :
      updateInDeepMap(nested, keyPath, updater, pathOffset + 1)
  ) : collection;
}

var __BOOL_REF = {value: false};
function BoolRef(value) {
  __BOOL_REF.value = value;
  return __BOOL_REF;
}

function hashValue(o) {
  if (!o) { // false, 0, and null
    return 0;
  }
  if (o === true) {
    return 1;
  }
  if (typeof o.hashCode === 'function') {
    return o.hashCode();
  }
  var type = typeof o;
  if (type === 'number') {
    return Math.floor(o) % 2147483647; // 2^31-1
  }
  if (type === 'string') {
    return hashString(o);
  }
  throw new Error('Unable to hash');
}

// http://jsperf.com/string-hash-to-int
function hashString(string) {
  var hash = STRING_HASH_CACHE[string];
  if (hash == null) {
    // This is the hash from JVM
    // The hash code for a string is computed as
    // s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
    // where s[i] is the ith character of the string and n is the length of
    // the string. We mod the result to make it between 0 (inclusive) and 2^32
    // (exclusive).
    hash = 0;
    for (var ii = 0; ii < string.length; ii++) {
      hash = (31 * hash + string.charCodeAt(ii)) % STRING_HASH_MAX_VAL;
    }
    if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
      STRING_HASH_CACHE_SIZE = 0;
      STRING_HASH_CACHE = {};
    }
    STRING_HASH_CACHE_SIZE++;
    STRING_HASH_CACHE[string] = hash;
  }
  return hash;
}


var STRING_HASH_MAX_VAL = 0x100000000; // 2^32
var STRING_HASH_CACHE_MAX_SIZE = 255;
var STRING_HASH_CACHE_SIZE = 0;
var STRING_HASH_CACHE = {};


var SHIFT = 5; // Resulted in best performance after ______?
var SIZE = 1 << SHIFT;
var MASK = SIZE - 1;
var __SENTINEL = {};
var __EMPTY_MAP;

module.exports = Map;

},{"./Immutable":1,"./Sequence":7}],3:[function(_dereq_,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var ImmutableMap = _dereq_('./Map');


for(var ImmutableMap____Key in ImmutableMap){if(ImmutableMap.hasOwnProperty(ImmutableMap____Key)){OrderedMap[ImmutableMap____Key]=ImmutableMap[ImmutableMap____Key];}}var ____SuperProtoOfImmutableMap=ImmutableMap===null?null:ImmutableMap.prototype;OrderedMap.prototype=Object.create(____SuperProtoOfImmutableMap);OrderedMap.prototype.constructor=OrderedMap;OrderedMap.__superConstructor__=ImmutableMap;

  // @pragma Construction

  function OrderedMap(sequence) {"use strict";
    if (sequence && sequence.constructor === OrderedMap) {
      return sequence;
    }
    if (!sequence || sequence.length === 0) {
      return OrderedMap.empty();
    }
    return OrderedMap.empty().merge(sequence);
  }

  OrderedMap.empty=function() {"use strict";
    return __EMPTY_ORDERED_MAP || (__EMPTY_ORDERED_MAP = OrderedMap.$OrderedMap_make());
  };

  OrderedMap.prototype.toString=function() {"use strict";
    return this.__toString('OrderedMap {', '}');
  };

  // @pragma Access

  OrderedMap.prototype.get=function(k, undefinedValue) {"use strict";
    if (k != null && this.$OrderedMap_map) {
      var index = this.$OrderedMap_map.get(k);
      if (index != null) {
        return this.$OrderedMap_vector.get(index)[1];
      }
    }
    return undefinedValue;
  };

  // @pragma Modification

  OrderedMap.prototype.clear=function() {"use strict";
    if (this.__ownerID) {
      this.length = 0;
      this.$OrderedMap_map = this.$OrderedMap_vector = null;
      return this;
    }
    return OrderedMap.empty();
  };

  OrderedMap.prototype.set=function(k, v) {"use strict";
    if (k == null) {
      return this;
    }
    var newMap = this.$OrderedMap_map;
    var newVector = this.$OrderedMap_vector;
    if (newMap) {
      var index = newMap.get(k);
      if (index == null) {
        newMap = newMap.set(k, newVector.length);
        newVector = newVector.push([k, v]);
      } else if (newVector.get(index)[1] !== v) {
        newVector = newVector.set(index, [k, v]);
      }
    } else {
      newVector = _dereq_('./Vector').empty().__ensureOwner(this.__ownerID).set(0, [k, v]);
      newMap = ImmutableMap.empty().__ensureOwner(this.__ownerID).set(k, 0);
    }
    if (this.__ownerID) {
      this.length = newMap.length;
      this.$OrderedMap_map = newMap;
      this.$OrderedMap_vector = newVector;
      return this;
    }
    return newVector === this.$OrderedMap_vector ? this : OrderedMap.$OrderedMap_make(newMap, newVector);
  };

  OrderedMap.prototype.delete=function(k) {"use strict";
    if (k == null || this.$OrderedMap_map == null) {
      return this;
    }
    var index = this.$OrderedMap_map.get(k);
    if (index == null) {
      return this;
    }
    var newMap = this.$OrderedMap_map.delete(k);
    var newVector = this.$OrderedMap_vector.delete(index);

    if (newMap.length === 0) {
      return this.clear();
    }
    if (this.__ownerID) {
      this.length = newMap.length;
      this.$OrderedMap_map = newMap;
      this.$OrderedMap_vector = newVector;
      return this;
    }
    return newMap === this.$OrderedMap_map ? this : OrderedMap.$OrderedMap_make(newMap, newVector);
  };

  // @pragma Mutability

  OrderedMap.prototype.__ensureOwner=function(ownerID) {"use strict";
    if (ownerID === this.__ownerID) {
      return this;
    }
    var newMap = this.$OrderedMap_map && this.$OrderedMap_map.__ensureOwner(ownerID);
    var newVector = this.$OrderedMap_vector && this.$OrderedMap_vector.__ensureOwner(ownerID);
    if (!ownerID) {
      this.__ownerID = ownerID;
      this.$OrderedMap_map = newMap;
      this.$OrderedMap_vector = newVector;
      return this;
    }
    return OrderedMap.$OrderedMap_make(newMap, newVector, ownerID);
  };


  // @pragma Iteration

  OrderedMap.prototype.__deepEqual=function(other) {"use strict";
    var is = _dereq_('./Immutable').is;
    var iterator = this.$OrderedMap_vector.__iterator__();
    return other.every(function(v, k)  {
      var entry = iterator.next();
      entry && (entry = entry[1]);
      return entry && is(k, entry[0]) && is(v, entry[1]);
    });
  };

  OrderedMap.prototype.__iterate=function(fn, reverse) {"use strict";
    return this.$OrderedMap_vector ? this.$OrderedMap_vector.fromEntries().__iterate(fn, reverse) : 0;
  };

  // @pragma Private

  OrderedMap.$OrderedMap_make=function(map, vector, ownerID) {"use strict";
    var omap = Object.create(OrderedMap.prototype);
    omap.length = map ? map.length : 0;
    omap.$OrderedMap_map = map;
    omap.$OrderedMap_vector = vector;
    omap.__ownerID = ownerID;
    return omap;
  };


OrderedMap.from = OrderedMap;


var __EMPTY_ORDERED_MAP;

module.exports = OrderedMap;

},{"./Immutable":1,"./Map":2,"./Vector":9}],4:[function(_dereq_,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var IndexedSequence = _dereq_('./Sequence').IndexedSequence;
var Vector = _dereq_('./Vector');


/**
 * Returns a lazy seq of nums from start (inclusive) to end
 * (exclusive), by step, where start defaults to 0, step to 1, and end to
 * infinity. When start is equal to end, returns empty list.
 */
for(var IndexedSequence____Key in IndexedSequence){if(IndexedSequence.hasOwnProperty(IndexedSequence____Key)){Range[IndexedSequence____Key]=IndexedSequence[IndexedSequence____Key];}}var ____SuperProtoOfIndexedSequence=IndexedSequence===null?null:IndexedSequence.prototype;Range.prototype=Object.create(____SuperProtoOfIndexedSequence);Range.prototype.constructor=Range;Range.__superConstructor__=IndexedSequence;

  function Range(start, end, step) {"use strict";
    if (!(this instanceof Range)) {
      return new Range(start, end, step);
    }
    invariant(step !== 0, 'Cannot step a Range by 0');
    start = start || 0;
    if (end == null) {
      end = Infinity;
    }
    step = step == null ? 1 : Math.abs(step);
    if (end < start) {
      step = -step;
    }
    this.$Range_start = start;
    this.$Range_end = end;
    this.$Range_step = step;
    this.length = Math.max(0, Math.ceil((end - start) / step - 1) + 1);
  }

  Range.prototype.toString=function() {"use strict";
    if (this.length === 0) {
      return 'Range []';
    }
    return 'Range [ ' +
      this.$Range_start + '...' + this.$Range_end +
      (this.$Range_step > 1 ? ' by ' + this.$Range_step : '') +
    ' ]';
  };

  Range.prototype.has=function(index) {"use strict";
    invariant(index >= 0, 'Index out of bounds');
    return index < this.length;
  };

  Range.prototype.get=function(index, undefinedValue) {"use strict";
    invariant(index >= 0, 'Index out of bounds');
    return this.length === Infinity || index < this.length ?
      this.$Range_start + index * this.$Range_step : undefinedValue;
  };

  Range.prototype.contains=function(searchValue) {"use strict";
    var possibleIndex = (searchValue - this.$Range_start) / this.$Range_step;
    return possibleIndex >= 0 &&
      possibleIndex < this.length &&
      possibleIndex === Math.floor(possibleIndex);
  };

  Range.prototype.slice=function(begin, end, maintainIndices) {"use strict";
    if (maintainIndices) {
      return ____SuperProtoOfIndexedSequence.slice.call(this,begin, end, maintainIndices);
    }
    begin = begin < 0 ? Math.max(0, this.length + begin) : Math.min(this.length, begin);
    end = end == null ? this.length : end > 0 ? Math.min(this.length, end) : Math.max(0, this.length + end);
    return new Range(this.get(begin), end === this.length ? this.$Range_end : this.get(end), this.$Range_step);
  };

  Range.prototype.__deepEquals=function(other) {"use strict";
    return this.$Range_start === other.$Range_start && this.$Range_end === other.$Range_end && this.$Range_step === other.$Range_step;
  };

  Range.prototype.indexOf=function(searchValue) {"use strict";
    var offsetValue = searchValue - this.$Range_start;
    if (offsetValue % this.$Range_step === 0) {
      var index = offsetValue / this.$Range_step;
      if (index >= 0 && index < this.length) {
        return index
      }
    }
    return -1;
  };

  Range.prototype.lastIndexOf=function(searchValue) {"use strict";
    return this.indexOf(searchValue);
  };

  Range.prototype.take=function(amount) {"use strict";
    return this.slice(0, amount);
  };

  Range.prototype.skip=function(amount, maintainIndices) {"use strict";
    return maintainIndices ? ____SuperProtoOfIndexedSequence.skip.call(this,amount) : this.slice(amount);
  };

  Range.prototype.__iterate=function(fn, reverse, flipIndices) {"use strict";
    var reversedIndices = reverse ^ flipIndices;
    var maxIndex = this.length - 1;
    var step = this.$Range_step;
    var value = reverse ? this.$Range_start + maxIndex * step : this.$Range_start;
    for (var ii = 0; ii <= maxIndex; ii++) {
      if (fn(value, reversedIndices ? maxIndex - ii : ii, this) === false) {
        break;
      }
      value += reverse ? -step : step;
    }
    return reversedIndices ? this.length : ii;
  };


Range.prototype.__toJS = Range.prototype.toArray;
Range.prototype.first = Vector.prototype.first;
Range.prototype.last = Vector.prototype.last;


function invariant(condition, error) {
  if (!condition) throw new Error(error);
}


module.exports = Range;

},{"./Sequence":7,"./Vector":9}],5:[function(_dereq_,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var Sequence = _dereq_('./Sequence').Sequence;
var ImmutableMap = _dereq_('./Map');


for(var Sequence____Key in Sequence){if(Sequence.hasOwnProperty(Sequence____Key)){Record[Sequence____Key]=Sequence[Sequence____Key];}}var ____SuperProtoOfSequence=Sequence===null?null:Sequence.prototype;Record.prototype=Object.create(____SuperProtoOfSequence);Record.prototype.constructor=Record;Record.__superConstructor__=Sequence;

  function Record(defaultValues, name) {"use strict";
    var RecordType = function(values) {
      this.$Record_map = ImmutableMap(values);
    };
    defaultValues = Sequence(defaultValues);
    RecordType.prototype = Object.create(Record.prototype);
    RecordType.prototype.constructor = RecordType;
    RecordType.prototype.$Record_name = name;
    RecordType.prototype.$Record_defaultValues = defaultValues;

    var keys = Object.keys(defaultValues);
    RecordType.prototype.length = keys.length;
    if (Object.defineProperty) {
      defaultValues.forEach(function($Record_, key)  {
        Object.defineProperty(RecordType.prototype, key, {
          get: function() {
            return this.get(key);
          },
          set: function(value) {
            if (!this.__ownerID) {
              throw new Error('Cannot set on an immutable record.');
            }
            this.set(key, value);
          }
        });
      }.bind(this));
    }

    return RecordType;
  }

  Record.prototype.toString=function() {"use strict";
    return this.__toString((this.$Record_name || 'Record') + ' {', '}');
  };

  // @pragma Access

  Record.prototype.has=function(k) {"use strict";
    return this.$Record_defaultValues.has(k);
  };

  Record.prototype.get=function(k, undefinedValue) {"use strict";
    if (undefinedValue !== undefined && !this.has(k)) {
      return undefinedValue;
    }
    return this.$Record_map.get(k, this.$Record_defaultValues.get(k));
  };

  // @pragma Modification

  Record.prototype.clear=function() {"use strict";
    if (this.__ownerID) {
      this.$Record_map.clear();
      return this;
    }
    return this.$Record_empty();
  };

  Record.prototype.set=function(k, v) {"use strict";
    if (k == null || !this.has(k)) {
      return this;
    }
    var newMap = this.$Record_map.set(k, v);
    if (this.__ownerID || newMap === this.$Record_map) {
      return this;
    }
    return this.$Record_make(newMap);
  };

  Record.prototype.delete=function(k) {"use strict";
    if (k == null || !this.has(k)) {
      return this;
    }
    var newMap = this.$Record_map.delete(k);
    if (this.__ownerID || newMap === this.$Record_map) {
      return this;
    }
    return this.$Record_make(newMap);
  };

  // @pragma Mutability

  Record.prototype.__ensureOwner=function(ownerID) {"use strict";
    if (ownerID === this.__ownerID) {
      return this;
    }
    var newMap = this.$Record_map && this.$Record_map.__ensureOwner(ownerID);
    if (!ownerID) {
      this.__ownerID = ownerID;
      this.$Record_map = newMap;
      return this;
    }
    return this.$Record_make(newMap, ownerID);
  };

  // @pragma Iteration

  Record.prototype.__iterate=function(fn, reverse) {"use strict";
    var record = this;
    return this.$Record_defaultValues.map(function($Record_, k)  {return record.get(k);}).__iterate(fn, reverse);
  };

  Record.prototype.$Record_empty=function() {"use strict";
    var Record = Object.getPrototypeOf(this).constructor;
    return Record.$Record_empty || (Record.$Record_empty = this.$Record_make(ImmutableMap.empty()));
  };

  Record.prototype.$Record_make=function(map, ownerID) {"use strict";
    var record = Object.create(Object.getPrototypeOf(this));
    record.$Record_map = map;
    record.__ownerID = ownerID;
    return record;
  };


Record.prototype.__deepEqual = ImmutableMap.prototype.__deepEqual;
Record.prototype.merge = ImmutableMap.prototype.merge;
Record.prototype.mergeWith = ImmutableMap.prototype.mergeWith;
Record.prototype.mergeDeep = ImmutableMap.prototype.mergeDeep;
Record.prototype.mergeDeepWith = ImmutableMap.prototype.mergeDeepWith;
Record.prototype.updateIn = ImmutableMap.prototype.updateIn;
Record.prototype.withMutations = ImmutableMap.prototype.withMutations;
Record.prototype.asMutable = ImmutableMap.prototype.asMutable;
Record.prototype.asImmutable = ImmutableMap.prototype.asImmutable;


module.exports = Record;

},{"./Map":2,"./Sequence":7}],6:[function(_dereq_,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var IndexedSequence = _dereq_('./Sequence').IndexedSequence;
var Range = _dereq_('./Range');


/**
 * Returns a lazy seq of `value` repeated `times` times. When `times` is
 * undefined, returns an infinite sequence of `value`.
 */
for(var IndexedSequence____Key in IndexedSequence){if(IndexedSequence.hasOwnProperty(IndexedSequence____Key)){Repeat[IndexedSequence____Key]=IndexedSequence[IndexedSequence____Key];}}var ____SuperProtoOfIndexedSequence=IndexedSequence===null?null:IndexedSequence.prototype;Repeat.prototype=Object.create(____SuperProtoOfIndexedSequence);Repeat.prototype.constructor=Repeat;Repeat.__superConstructor__=IndexedSequence;

  function Repeat(value, times) {"use strict";
    if (times === 0 && __EMPTY_REPEAT) {
      return __EMPTY_REPEAT;
    }
    if (!(this instanceof Repeat)) {
      return new Repeat(value, times);
    }
    this.$Repeat_value = value;
    this.length = times == null ? Infinity : Math.max(0, times);
  }

  Repeat.prototype.toString=function() {"use strict";
    if (this.length === 0) {
      return 'Repeat []';
    }
    return 'Repeat [ ' + this.$Repeat_value + ' ' + this.length + ' times ]';
  };

  Repeat.prototype.get=function(index, undefinedValue) {"use strict";
    invariant(index >= 0, 'Index out of bounds');
    return this.length === Infinity || index < this.length ?
      this.$Repeat_value :
      undefinedValue;
  };

  Repeat.prototype.first=function() {"use strict";
    return this.$Repeat_value;
  };

  Repeat.prototype.contains=function(searchValue) {"use strict";
    var is = _dereq_('./Immutable').is;
    return is(this.$Repeat_value, searchValue);
  };

  Repeat.prototype.__deepEquals=function(other) {"use strict";
    var is = _dereq_('./Immutable').is;
    return is(this.$Repeat_value, other.$Repeat_value);
  };

  Repeat.prototype.slice=function(begin, end, maintainIndices) {"use strict";
    if (maintainIndices) {
      return ____SuperProtoOfIndexedSequence.slice.call(this,begin, end, maintainIndices);
    }
    var length = this.length;
    begin = begin < 0 ? Math.max(0, length + begin) : Math.min(length, begin);
    end = end == null ? length : end > 0 ? Math.min(length, end) : Math.max(0, length + end);
    return end > begin ? new Repeat(this.$Repeat_value, end - begin) : __EMPTY_REPEAT;
  };

  Repeat.prototype.reverse=function(maintainIndices) {"use strict";
    return maintainIndices ? ____SuperProtoOfIndexedSequence.reverse.call(this,maintainIndices) : this;
  };

  Repeat.prototype.indexOf=function(searchValue) {"use strict";
    var is = _dereq_('./Immutable').is;
    if (is(this.$Repeat_value, searchValue)) {
      return 0;
    }
    return -1;
  };

  Repeat.prototype.lastIndexOf=function(searchValue) {"use strict";
    var is = _dereq_('./Immutable').is;
    if (is(this.$Repeat_value, searchValue)) {
      return this.length;
    }
    return -1;
  };

  Repeat.prototype.__iterate=function(fn, reverse, flipIndices) {"use strict";
    var reversedIndices = reverse ^ flipIndices;
    invariant(!reversedIndices || this.length < Infinity, 'Cannot access end of infinite range.');
    var maxIndex = this.length - 1;
    for (var ii = 0; ii <= maxIndex; ii++) {
      if (fn(this.$Repeat_value, reversedIndices ? maxIndex - ii : ii, this) === false) {
        break;
      }
    }
    return reversedIndices ? this.length : ii;
  };


Repeat.prototype.has = Range.prototype.has;
Repeat.prototype.toArray = Range.prototype.toArray;
Repeat.prototype.toObject = Range.prototype.toObject;
Repeat.prototype.toVector = Range.prototype.toVector;
Repeat.prototype.toMap = Range.prototype.toMap;
Repeat.prototype.toOrderedMap = Range.prototype.toOrderedMap;
Repeat.prototype.toSet = Range.prototype.toSet;
Repeat.prototype.take = Range.prototype.take;
Repeat.prototype.skip = Range.prototype.skip;
Repeat.prototype.last = Repeat.prototype.first;
Repeat.prototype.__toJS = Range.prototype.__toJS;


function invariant(condition, error) {
  if (!condition) throw new Error(error);
}


var __EMPTY_REPEAT = new Repeat(undefined, 0);

module.exports = Repeat;

},{"./Immutable":1,"./Range":4,"./Sequence":7}],7:[function(_dereq_,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var Immutable = _dereq_('./Immutable');



  function Sequence(value) {"use strict";
    return Sequence.from(
      arguments.length === 1 ? value : Array.prototype.slice.call(arguments)
    );
  }

  Sequence.from=function(value) {"use strict";
    if (value instanceof Sequence) {
      return value;
    }
    if (!Array.isArray(value)) {
      if (value && value.constructor === Object) {
        return new ObjectSequence(value);
      }
      value = [value];
    }
    return new ArraySequence(value);
  };

  Sequence.prototype.toString=function() {"use strict";
    return this.__toString('Seq {', '}');
  };

  Sequence.prototype.__toString=function(head, tail) {"use strict";
    if (this.length === 0) {
      return head + tail;
    }
    return head + ' ' + this.map(this.__toStringMapper).join(', ') + ' ' + tail;
  };

  Sequence.prototype.__toStringMapper=function(v, k) {"use strict";
    return k + ': ' + quoteString(v);
  };

  Sequence.prototype.toJS=function() {"use strict";
    return this.map(function(value)  {return value instanceof Sequence ? value.toJS() : value;}).__toJS();
  };

  Sequence.prototype.toArray=function() {"use strict";
    assertNotInfinite(this.length);
    var array = new Array(this.length || 0);
    this.values().forEach(function(v, i)  { array[i] = v; });
    return array;
  };

  Sequence.prototype.toObject=function() {"use strict";
    assertNotInfinite(this.length);
    var object = {};
    this.forEach(function(v, k)  { object[k] = v; });
    return object;
  };

  Sequence.prototype.toVector=function() {"use strict";
    // Use Late Binding here to solve the circular dependency.
    assertNotInfinite(this.length);
    return _dereq_('./Vector').from(this);
  };

  Sequence.prototype.toMap=function() {"use strict";
    // Use Late Binding here to solve the circular dependency.
    assertNotInfinite(this.length);
    return _dereq_('./Map').from(this);
  };

  Sequence.prototype.toOrderedMap=function() {"use strict";
    // Use Late Binding here to solve the circular dependency.
    assertNotInfinite(this.length);
    return _dereq_('./OrderedMap').from(this);
  };

  Sequence.prototype.toSet=function() {"use strict";
    // Use Late Binding here to solve the circular dependency.
    assertNotInfinite(this.length);
    return _dereq_('./Set').from(this);
  };

  Sequence.prototype.equals=function(other) {"use strict";
    if (this === other) {
      return true;
    }
    if (!(other instanceof Sequence)) {
      return false;
    }
    if (this.length != null && other.length != null) {
      if (this.length !== other.length) {
        return false;
      }
      if (this.length === 0 && other.length === 0) {
        return true;
      }
    }
    return this.__deepEquals(other);
  };

  Sequence.prototype.__deepEquals=function(other) {"use strict";
    var entries = this.cacheResult().entries().toArray();
    var iterations = 0;
    return other.every(function(v, k)  {
      var entry = entries[iterations++];
      return Immutable.is(k, entry[0]) && Immutable.is(v, entry[1]);
    });
  };

  Sequence.prototype.join=function(separator) {"use strict";
    separator = separator || ',';
    var string = '';
    var isFirst = true;
    this.forEach(function(v, k)  {
      if (isFirst) {
        isFirst = false;
        string += v;
      } else {
        string += separator + v;
      }
    });
    return string;
  };

  Sequence.prototype.concat=function() {"use strict";var values=Array.prototype.slice.call(arguments,0);
    var sequences = [this].concat(values.map(function(value)  {return Sequence(value);}));
    var concatSequence = this.__makeSequence();
    concatSequence.length = sequences.reduce(
      function(sum, seq)  {return sum != null && seq.length != null ? sum + seq.length : undefined;}, 0
    );
    concatSequence.__iterateUncached = function(fn, reverse)  {
      var iterations = 0;
      var stoppedIteration;
      var lastIndex = sequences.length - 1;
      for (var ii = 0; ii <= lastIndex && !stoppedIteration; ii++) {
        var seq = sequences[reverse ? lastIndex - ii : ii];
        iterations += seq.__iterate(function(v, k, c)  {
          if (fn(v, k, c) === false) {
            stoppedIteration = true;
            return false;
          }
        }, reverse);
      }
      return iterations;
    };
    return concatSequence;
  };

  Sequence.prototype.reverse=function(maintainIndices) {"use strict";
    var sequence = this;
    var reversedSequence = sequence.__makeSequence();
    reversedSequence.length = sequence.length;
    reversedSequence.__iterateUncached = function(fn, reverse)  {return sequence.__iterate(fn, !reverse);};
    reversedSequence.reverse = function()  {return sequence;};
    return reversedSequence;
  };

  Sequence.prototype.keys=function() {"use strict";
    return this.flip().values();
  };

  Sequence.prototype.values=function() {"use strict";
    // values() always returns an IndexedSequence.
    var sequence = this;
    var valuesSequence = makeIndexedSequence(sequence);
    valuesSequence.length = sequence.length;
    valuesSequence.values = returnThis;
    valuesSequence.__iterateUncached = function (fn, reverse, flipIndices) {
      if (flipIndices && this.length == null) {
        return this.cacheResult().__iterate(fn, reverse, flipIndices);
      }
      var iterations = 0;
      var predicate;
      if (flipIndices) {
        iterations = this.length - 1;
        predicate = function(v, k, c)  {return fn(v, iterations--, c) !== false;};
      } else {
        predicate = function(v, k, c)  {return fn(v, iterations++, c) !== false;};
      }
      sequence.__iterate(predicate, reverse); // intentionally do not pass flipIndices
      return flipIndices ? this.length : iterations;
    }
    return valuesSequence;
  };

  Sequence.prototype.entries=function() {"use strict";
    var sequence = this;
    if (sequence.$Sequence_cache) {
      // We cache as an entries array, so we can just return the cache!
      return Sequence(sequence.$Sequence_cache);
    }
    var entriesSequence = sequence.map(entryMapper).values();
    entriesSequence.fromEntries = function()  {return sequence;};
    return entriesSequence;
  };

  Sequence.prototype.forEach=function(sideEffect, thisArg) {"use strict";
    return this.__iterate(thisArg ? sideEffect.bind(thisArg) : sideEffect);
  };

  Sequence.prototype.reduce=function(reducer, initialReduction, thisArg) {"use strict";
    var reduction = initialReduction;
    this.forEach(function(v, k, c)  {
      reduction = reducer.call(thisArg, reduction, v, k, c);
    });
    return reduction;
  };

  Sequence.prototype.reduceRight=function(reducer, initialReduction, thisArg) {"use strict";
    return this.reverse(true).reduce(reducer, initialReduction, thisArg);
  };

  Sequence.prototype.every=function(predicate, thisArg) {"use strict";
    var returnValue = true;
    this.forEach(function(v, k, c)  {
      if (!predicate.call(thisArg, v, k, c)) {
        returnValue = false;
        return false;
      }
    });
    return returnValue;
  };

  Sequence.prototype.some=function(predicate, thisArg) {"use strict";
    return !this.every(not(predicate), thisArg);
  };

  Sequence.prototype.first=function() {"use strict";
    return this.find(returnTrue);
  };

  Sequence.prototype.last=function() {"use strict";
    return this.findLast(returnTrue);
  };

  Sequence.prototype.has=function(searchKey) {"use strict";
    return this.get(searchKey, __SENTINEL) !== __SENTINEL;
  };

  Sequence.prototype.get=function(searchKey, notFoundValue) {"use strict";
    return this.find(function($Sequence_, key)  {return Immutable.is(key, searchKey);}, null, notFoundValue);
  };

  Sequence.prototype.getIn=function(searchKeyPath, notFoundValue) {"use strict";
    return getInDeepSequence(this, searchKeyPath, notFoundValue, 0);
  };

  Sequence.prototype.contains=function(searchValue) {"use strict";
    return this.find(function(value)  {return Immutable.is(value, searchValue);}, null, __SENTINEL) !== __SENTINEL;
  };

  Sequence.prototype.find=function(predicate, thisArg, notFoundValue) {"use strict";
    var foundValue = notFoundValue;
    this.forEach(function(v, k, c)  {
      if (predicate.call(thisArg, v, k, c)) {
        foundValue = v;
        return false;
      }
    });
    return foundValue;
  };

  Sequence.prototype.findKey=function(predicate, thisArg) {"use strict";
    var foundKey;
    this.forEach(function(v, k, c)  {
      if (predicate.call(thisArg, v, k, c)) {
        foundKey = k;
        return false;
      }
    });
    return foundKey;
  };

  Sequence.prototype.findLast=function(predicate, thisArg, notFoundValue) {"use strict";
    return this.reverse(true).find(predicate, thisArg, notFoundValue);
  };

  Sequence.prototype.findLastKey=function(predicate, thisArg) {"use strict";
    return this.reverse(true).findKey(predicate, thisArg);
  };

  Sequence.prototype.flip=function() {"use strict";
    // flip() always returns a non-indexed Sequence.
    var sequence = this;
    var flipSequence = makeSequence();
    flipSequence.length = sequence.length;
    flipSequence.flip = function()  {return sequence;};
    flipSequence.__iterateUncached = function(fn, reverse) 
      {return sequence.__iterate(function(v, k, c)  {return fn(k, v, c) !== false;}, reverse);};
    return flipSequence;
  };

  Sequence.prototype.map=function(mapper, thisArg) {"use strict";
    var sequence = this;
    var mappedSequence = sequence.__makeSequence();
    mappedSequence.length = sequence.length;
    mappedSequence.__iterateUncached = function(fn, reverse) 
      {return sequence.__iterate(function(v, k, c)  {return fn(mapper.call(thisArg, v, k, c), k, c) !== false;}, reverse);};
    return mappedSequence;
  };

  Sequence.prototype.filter=function(predicate, thisArg) {"use strict";
    return filterFactory(this, predicate, thisArg, true, false);
  };

  Sequence.prototype.slice=function(begin, end) {"use strict";
    if (wholeSlice(begin, end, this.length)) {
      return this;
    }
    var resolvedBegin = resolveBegin(begin, this.length);
    var resolvedEnd = resolveEnd(end, this.length);
    // begin or end will be NaN if they were provided as negative numbers and
    // this sequence's length is unknown. In that case, convert it to an
    // IndexedSequence by getting entries() and convert back to a sequence with
    // fromEntries(). IndexedSequence.prototype.slice will appropriately handle
    // this case.
    if (resolvedBegin !== resolvedBegin || resolvedEnd !== resolvedEnd) {
      return this.entries().slice(begin, end).fromEntries();
    }
    var skipped = resolvedBegin === 0 ? this : this.skip(resolvedBegin);
    return resolvedEnd == null || resolvedEnd === this.length ?
      skipped : skipped.take(resolvedEnd - resolvedBegin);
  };

  Sequence.prototype.take=function(amount) {"use strict";
    var iterations = 0;
    var sequence = this.takeWhile(function()  {return iterations++ < amount;});
    sequence.length = this.length && Math.min(this.length, amount);
    return sequence;
  };

  Sequence.prototype.takeLast=function(amount, maintainIndices) {"use strict";
    return this.reverse(maintainIndices).take(amount).reverse(maintainIndices);
  };

  Sequence.prototype.takeWhile=function(predicate, thisArg, maintainIndices) {"use strict";
    var sequence = this;
    var takeSequence = sequence.__makeSequence();
    takeSequence.__iterateUncached = function(fn, reverse, flipIndices) {
      if (reverse) {
        // TODO: can we do a better job of this?
        return this.cacheResult().__iterate(fn, reverse, flipIndices);
      }
      var iterations = 0;
      sequence.__iterate(function(v, k, c)  {
        if (predicate.call(thisArg, v, k, c) && fn(v, k, c) !== false) {
          iterations++;
        } else {
          return false;
        }
      }, reverse, flipIndices);
      return iterations;
    };
    return takeSequence;
  };

  Sequence.prototype.takeUntil=function(predicate, thisArg, maintainIndices) {"use strict";
    return this.takeWhile(not(predicate), thisArg, maintainIndices);
  };

  Sequence.prototype.skip=function(amount, maintainIndices) {"use strict";
    if (amount === 0) {
      return this;
    }
    var iterations = 0;
    var sequence = this.skipWhile(function()  {return iterations++ < amount;}, null, maintainIndices);
    sequence.length = this.length && Math.max(0, this.length - amount);
    return sequence;
  };

  Sequence.prototype.skipLast=function(amount, maintainIndices) {"use strict";
    return this.reverse(maintainIndices).skip(amount).reverse(maintainIndices);
  };

  Sequence.prototype.skipWhile=function(predicate, thisArg, maintainIndices) {"use strict";
    var sequence = this;
    var skipSequence = sequence.__makeSequence();
    skipSequence.__iterateUncached = function (fn, reverse, flipIndices) {
      if (reverse) {
        // TODO: can we do a better job of this?
        return this.cacheResult().__iterate(fn, reverse, flipIndices);
      }
      var isSkipping = true;
      var iterations = 0;
      sequence.__iterate(function(v, k, c)  {
        if (!(isSkipping && (isSkipping = predicate.call(thisArg, v, k, c)))) {
          if (fn(v, k, c) !== false) {
            iterations++;
          } else {
            return false;
          }
        }
      }, reverse, flipIndices);
      return iterations;
    };
    return skipSequence;
  };

  Sequence.prototype.skipUntil=function(predicate, thisArg, maintainIndices) {"use strict";
    return this.skipWhile(not(predicate), thisArg, maintainIndices);
  };

  Sequence.prototype.groupBy=function(mapper, context) {"use strict";
    var seq = this;
    var groups = _dereq_('./OrderedMap').empty().withMutations(function(map)  {
      seq.forEach(function(value, key, collection)  {
        var groupKey = mapper(value, key, collection);
        var group = map.get(groupKey, __SENTINEL);
        if (group === __SENTINEL) {
          group = [];
          map.set(groupKey, group);
        }
        group.push([key, value]);
      });
    })
    return groups.map(function(group)  {return Sequence(group).fromEntries();});
  };

  Sequence.prototype.cacheResult=function() {"use strict";
    if (!this.$Sequence_cache && this.__iterateUncached) {
      assertNotInfinite(this.length);
      this.$Sequence_cache = this.entries().toArray();
      if (this.length == null) {
        this.length = this.$Sequence_cache.length;
      }
    }
    return this;
  };

  // abstract __iterateUncached(fn, reverse)

  Sequence.prototype.__iterate=function(fn, reverse, flipIndices) {"use strict";
    if (!this.$Sequence_cache) {
      return this.__iterateUncached(fn, reverse, flipIndices);
    }
    var maxIndex = this.length - 1;
    var cache = this.$Sequence_cache;
    var c = this;
    if (reverse) {
      for (var ii = cache.length - 1; ii >= 0; ii--) {
        var revEntry = cache[ii];
        if (fn(revEntry[1], flipIndices ? revEntry[0] : maxIndex - revEntry[0], c) === false) {
          break;
        }
      }
    } else {
      cache.every(flipIndices ?
        function(entry)  {return fn(entry[1], maxIndex - entry[0], c) !== false;} :
        function(entry)  {return fn(entry[1], entry[0], c) !== false;}
      );
    }
    return this.length;
  };

  Sequence.prototype.__makeSequence=function() {"use strict";
    return makeSequence();
  };


Sequence.prototype.toJSON = Sequence.prototype.toJS;
Sequence.prototype.inspect = Sequence.prototype.toSource = function() { return this.toString(); };
Sequence.prototype.__toJS = Sequence.prototype.toObject;


for(var Sequence____Key in Sequence){if(Sequence.hasOwnProperty(Sequence____Key)){IndexedSequence[Sequence____Key]=Sequence[Sequence____Key];}}var ____SuperProtoOfSequence=Sequence===null?null:Sequence.prototype;IndexedSequence.prototype=Object.create(____SuperProtoOfSequence);IndexedSequence.prototype.constructor=IndexedSequence;IndexedSequence.__superConstructor__=Sequence;function IndexedSequence(){"use strict";if(Sequence!==null){Sequence.apply(this,arguments);}}

  IndexedSequence.prototype.toString=function() {"use strict";
    return this.__toString('Seq [', ']');
  };

  IndexedSequence.prototype.toArray=function() {"use strict";
    assertNotInfinite(this.length);
    var array = new Array(this.length || 0);
    array.length = this.forEach(function(v, i)  { array[i] = v; });
    return array;
  };

  IndexedSequence.prototype.fromEntries=function() {"use strict";
    var sequence = this;
    var fromEntriesSequence = sequence.__makeSequence();
    fromEntriesSequence.length = sequence.length;
    fromEntriesSequence.entries = function()  {return sequence;};
    fromEntriesSequence.__iterateUncached = function(fn, reverse, flipIndices) 
      {return sequence.__iterate(function(entry, $IndexedSequence_, c)  {return fn(entry[1], entry[0], c);}, reverse, flipIndices);};
    return fromEntriesSequence;
  };

  IndexedSequence.prototype.join=function(separator) {"use strict";
    separator = separator || ',';
    var string = '';
    var prevIndex = 0;
    this.forEach(function(v, i)  {
      var numSeparators = i - prevIndex;
      prevIndex = i;
      string += (numSeparators === 1 ? separator : repeatString(separator, numSeparators)) + v;
    });
    if (this.length && prevIndex < this.length - 1) {
      string += repeatString(separator, this.length - 1 - prevIndex);
    }
    return string;
  };

  IndexedSequence.prototype.concat=function() {"use strict";var values=Array.prototype.slice.call(arguments,0);
    var sequences = [this].concat(values).map(function(value)  {return Sequence(value);});
    var concatSequence = this.__makeSequence();
    concatSequence.length = sequences.reduce(
      function(sum, seq)  {return sum != null && seq.length != null ? sum + seq.length : undefined;}, 0
    );
    concatSequence.__iterateUncached = function(fn, reverse, flipIndices) {
      if (flipIndices && !this.length) {
        // In order to reverse indices, first we must create a cached
        // representation. This ensures we will have the correct total length
        // so index reversal works as expected.
        return this.cacheResult().__iterate(fn, reverse, flipIndices);
      }
      var iterations = 0;
      var stoppedIteration;
      var maxIndex = flipIndices && this.length - 1;
      var maxSequencesIndex = sequences.length - 1;
      for (var ii = 0; ii <= maxSequencesIndex && !stoppedIteration; ii++) {
        var sequence = sequences[reverse ? maxSequencesIndex - ii : ii];
        if (!(sequence instanceof IndexedSequence)) {
          sequence = sequence.values();
        }
        iterations += sequence.__iterate(function(v, index, c)  {
          index += iterations;
          if (fn(v, flipIndices ? maxIndex - index : index, c) === false) {
            stoppedIteration = true;
            return false;
          }
        }, reverse); // intentionally do not pass flipIndices
      }
      return iterations;
    }
    return concatSequence;
  };

  IndexedSequence.prototype.reverse=function(maintainIndices) {"use strict";
    var sequence = this;
    var reversedSequence = sequence.__makeSequence();
    reversedSequence.length = sequence.length;
    reversedSequence.__reversedIndices = !!(maintainIndices ^ sequence.__reversedIndices);
    reversedSequence.__iterateUncached = function(fn, reverse, flipIndices) 
      {return sequence.__iterate(fn, !reverse, flipIndices ^ maintainIndices);};
    reversedSequence.reverse = function ($IndexedSequence_maintainIndices) {
      return maintainIndices === $IndexedSequence_maintainIndices ? sequence :
        IndexedSequence.prototype.reverse.call(this, $IndexedSequence_maintainIndices);
    }
    return reversedSequence;
  };

  // Overridden to supply undefined length because it's entirely
  // possible this is sparse.
  IndexedSequence.prototype.values=function() {"use strict";
    var valuesSequence = ____SuperProtoOfSequence.values.call(this);
    valuesSequence.length = undefined;
    return valuesSequence;
  };

  IndexedSequence.prototype.filter=function(predicate, thisArg, maintainIndices) {"use strict";
    var filterSequence = filterFactory(this, predicate, thisArg, maintainIndices, maintainIndices);
    if (maintainIndices) {
      filterSequence.length = this.length;
    }
    return filterSequence;
  };

  IndexedSequence.prototype.indexOf=function(searchValue) {"use strict";
    return this.findIndex(function(value)  {return Immutable.is(value, searchValue);});
  };

  IndexedSequence.prototype.lastIndexOf=function(searchValue) {"use strict";
    return this.reverse(true).indexOf(searchValue);
  };

  IndexedSequence.prototype.findIndex=function(predicate, thisArg) {"use strict";
    var key = this.findKey(predicate, thisArg);
    return key == null ? -1 : key;
  };

  IndexedSequence.prototype.findLastIndex=function(predicate, thisArg) {"use strict";
    return this.reverse(true).findIndex(predicate, thisArg);
  };

  IndexedSequence.prototype.slice=function(begin, end, maintainIndices) {"use strict";
    var sequence = this;
    if (wholeSlice(begin, end, sequence.length)) {
      return sequence;
    }
    var sliceSequence = sequence.__makeSequence();
    var resolvedBegin = resolveBegin(begin, sequence.length);
    var resolvedEnd = resolveEnd(end, sequence.length);
    sliceSequence.length = sequence.length && (maintainIndices ? sequence.length : resolvedEnd - resolvedBegin);
    sliceSequence.__reversedIndices = sequence.__reversedIndices;
    sliceSequence.__iterateUncached = function(fn, reverse, flipIndices) {
      if (reverse) {
        // TODO: reverse should be possible here.
        return this.cacheResult().__iterate(fn, reverse, flipIndices);
      }
      var reversedIndices = this.__reversedIndices ^ flipIndices;
      if (resolvedBegin !== resolvedBegin ||
          resolvedEnd !== resolvedEnd ||
          (reversedIndices && sequence.length == null)) {
        sequence.cacheResult();
        resolvedBegin = resolveBegin(begin, sequence.length);
        resolvedEnd = resolveEnd(end, sequence.length);
      }
      var iiBegin = reversedIndices ? sequence.length - resolvedEnd : resolvedBegin;
      var iiEnd = reversedIndices ? sequence.length - resolvedBegin : resolvedEnd;
      var lengthIterated = sequence.__iterate(function(v, ii, c) 
        {return reversedIndices ?
          (iiEnd != null && ii >= iiEnd) || (ii >= iiBegin) && fn(v, maintainIndices ? ii : ii - iiBegin, c) !== false :
          (ii < iiBegin) || (iiEnd == null || ii < iiEnd) && fn(v, maintainIndices ? ii : ii - iiBegin, c) !== false;},
        reverse, flipIndices
      );
      return this.length != null ? this.length :
        maintainIndices ? lengthIterated : Math.max(0, lengthIterated - iiBegin);
    };
    return sliceSequence;
  };

  IndexedSequence.prototype.splice=function(index, removeNum)  {"use strict";var values=Array.prototype.slice.call(arguments,2);
    if (removeNum === 0 && values.length === 0) {
      return this;
    }
    return this.slice(0, index).concat(values, this.slice(index + removeNum));
  };

  // Overrides to get length correct.
  IndexedSequence.prototype.takeWhile=function(predicate, thisArg, maintainIndices) {"use strict";
    var sequence = this;
    var takeSequence = sequence.__makeSequence();
    takeSequence.__iterateUncached = function (fn, reverse, flipIndices) {
      if (reverse) {
        // TODO: can we do a better job of this?
        return this.cacheResult().__iterate(fn, reverse, flipIndices);
      }
      var iterations = 0;
      // TODO: ensure didFinish is necessary here
      var didFinish = true;
      var length = sequence.__iterate(function(v, ii, c)  {
        if (predicate.call(thisArg, v, ii, c) && fn(v, ii, c) !== false) {
          iterations = ii;
        } else {
          didFinish = false;
          return false;
        }
      }, reverse, flipIndices);
      return maintainIndices ? takeSequence.length : didFinish ? length : iterations + 1;
    };
    if (maintainIndices) {
      takeSequence.length = this.length;
    }
    return takeSequence;
  };

  IndexedSequence.prototype.skipWhile=function(predicate, thisArg, maintainIndices) {"use strict";
    var sequence = this;
    var skipWhileSequence = sequence.__makeSequence();
    if (maintainIndices) {
      skipWhileSequence.length = this.length;
    }
    skipWhileSequence.__iterateUncached = function (fn, reverse, flipIndices) {
      if (reverse) {
        // TODO: can we do a better job of this?
        return this.cacheResult().__iterate(fn, reverse, flipIndices)
      }
      var reversedIndices = sequence.__reversedIndices ^ flipIndices;
      var isSkipping = true;
      var indexOffset = 0;
      var length = sequence.__iterate(function(v, ii, c)  {
        if (isSkipping) {
          isSkipping = predicate.call(thisArg, v, ii, c);
          if (!isSkipping) {
            indexOffset = ii;
          }
        }
        return isSkipping || fn(v, flipIndices || maintainIndices ? ii : ii - indexOffset, c) !== false;
      }, reverse, flipIndices);
      return maintainIndices ? length : reversedIndices ? indexOffset + 1 : length - indexOffset;
    };
    return skipWhileSequence;
  };

  IndexedSequence.prototype.groupBy=function(mapper, context, maintainIndices) {"use strict";
    var seq = this;
    var groups = _dereq_('./OrderedMap').empty().withMutations(function(map)  {
      seq.forEach(function(value, index, collection)  {
        var groupKey = mapper(value, index, collection);
        var group = map.get(groupKey, __SENTINEL);
        if (group === __SENTINEL) {
          group = new Array(maintainIndices ? seq.length : 0);
          map.set(groupKey, group);
        }
        maintainIndices ? (group[index] = value) : group.push(value);
      });
    });
    return groups.map(function(group)  {return Sequence(group);});
  };

  // abstract __iterateUncached(fn, reverse, flipIndices)

  IndexedSequence.prototype.__makeSequence=function() {"use strict";
    return makeIndexedSequence(this);
  };


IndexedSequence.prototype.__toJS = IndexedSequence.prototype.toArray;
IndexedSequence.prototype.__toStringMapper = quoteString;


for(Sequence____Key in Sequence){if(Sequence.hasOwnProperty(Sequence____Key)){ObjectSequence[Sequence____Key]=Sequence[Sequence____Key];}}ObjectSequence.prototype=Object.create(____SuperProtoOfSequence);ObjectSequence.prototype.constructor=ObjectSequence;ObjectSequence.__superConstructor__=Sequence;
  function ObjectSequence(object) {"use strict";
    var keys = Object.keys(object);
    this.$ObjectSequence_object = object;
    this.$ObjectSequence_keys = keys;
    this.length = keys.length;
  }

  ObjectSequence.prototype.toObject=function() {"use strict";
    return this.$ObjectSequence_object;
  };

  ObjectSequence.prototype.get=function(key, undefinedValue) {"use strict";
    if (undefinedValue !== undefined && !this.has(key)) {
      return undefinedValue;
    }
    return this.$ObjectSequence_object[key];
  };

  ObjectSequence.prototype.has=function(key) {"use strict";
    return this.$ObjectSequence_object.hasOwnProperty(key);
  };

  ObjectSequence.prototype.__iterate=function(fn, reverse) {"use strict";
    var object = this.$ObjectSequence_object;
    var keys = this.$ObjectSequence_keys;
    var maxIndex = keys.length - 1;
    for (var ii = 0; ii <= maxIndex; ii++) {
      var iteration = reverse ? maxIndex - ii : ii;
      if (fn(object[keys[iteration]], keys[iteration], object) === false) {
        break;
      }
    }
    return ii;
  };



for(var IndexedSequence____Key in IndexedSequence){if(IndexedSequence.hasOwnProperty(IndexedSequence____Key)){ArraySequence[IndexedSequence____Key]=IndexedSequence[IndexedSequence____Key];}}var ____SuperProtoOfIndexedSequence=IndexedSequence===null?null:IndexedSequence.prototype;ArraySequence.prototype=Object.create(____SuperProtoOfIndexedSequence);ArraySequence.prototype.constructor=ArraySequence;ArraySequence.__superConstructor__=IndexedSequence;
  function ArraySequence(array) {"use strict";
    this.$ArraySequence_array = array;
    this.length = array.length;
  }

  ArraySequence.prototype.toArray=function() {"use strict";
    return this.$ArraySequence_array;
  };

  ArraySequence.prototype.__iterate=function(fn, reverse, flipIndices) {"use strict";
    var array = this.$ArraySequence_array;
    var maxIndex = array.length - 1;
    var lastIndex = -1;
    if (reverse) {
      for (var ii = maxIndex; ii >= 0; ii--) {
        if (array.hasOwnProperty(ii) &&
            fn(array[ii], flipIndices ? ii : maxIndex - ii, array) === false) {
          return lastIndex + 1;
        }
        lastIndex = ii;
      }
      return array.length;
    } else {
      var didFinish = array.every(function(value, index)  {
        if (fn(value, flipIndices ? maxIndex - index : index, array) === false) {
          return false;
        } else {
          lastIndex = index;
          return true;
        }
      });
      return didFinish ? array.length : lastIndex + 1;
    }
  };


ArraySequence.prototype.get = ObjectSequence.prototype.get;
ArraySequence.prototype.has = ObjectSequence.prototype.has;


function makeSequence() {
  return Object.create(Sequence.prototype);
}

function makeIndexedSequence(parent) {
  var newSequence = Object.create(IndexedSequence.prototype);
  newSequence.__reversedIndices = parent ? parent.__reversedIndices : false;
  return newSequence;
}

function getInDeepSequence(seq, keyPath, notFoundValue, pathOffset) {
  var nested = seq.get ? seq.get(keyPath[pathOffset], __SENTINEL) : __SENTINEL;
  if (nested === __SENTINEL) {
    return notFoundValue;
  }
  if (pathOffset === keyPath.length - 1) {
    return nested;
  }
  return getInDeepSequence(nested, keyPath, notFoundValue, pathOffset + 1);
}

function wholeSlice(begin, end, length) {
  return (begin === 0 || (length != null && begin <= -length)) &&
    (end == null || (length != null && end >= length));
}

function resolveBegin(begin, length) {
  return begin < 0 ? Math.max(0, length + begin) : length ? Math.min(length, begin) : begin;
}

function resolveEnd(end, length) {
  return end == null ? length : end < 0 ? Math.max(0, length + end) : length ? Math.min(length, end) : end;
}

function entryMapper(v, k) {
  return [k, v];
}

function returnTrue() {
  return true;
}

function returnThis() {
  return this;
}

/**
 * Sequence.prototype.filter and IndexedSequence.prototype.filter are so close
 * in behavior that it makes sense to build a factory with the few differences
 * encoded as booleans.
 */
function filterFactory(sequence, predicate, thisArg, useKeys, maintainIndices) {
  var filterSequence = sequence.__makeSequence();
  filterSequence.__iterateUncached = function(fn, reverse, flipIndices)  {
    var iterations = 0;
    var length = sequence.__iterate(function(v, k, c)  {
      if (predicate.call(thisArg, v, k, c)) {
        if (fn(v, useKeys ? k : iterations, c) !== false) {
          iterations++;
        } else {
          return false;
        }
      }
    }, reverse, flipIndices);
    return maintainIndices ? length : iterations;
  };
  return filterSequence;
}

function not(predicate) {
  return function() {
    return !predicate.apply(this, arguments);
  }
}

function quoteString(value) {
  return typeof value === 'string' ? JSON.stringify(value) : value;
}

function repeatString(string, times) {
  var repeated = '';
  while (times) {
    if (times & 1) {
      repeated += string;
    }
    if ((times >>= 1)) {
      string += string;
    }
  }
  return repeated;
}

function assertNotInfinite(length) {
  if (length === Infinity) {
    throw new Error('Cannot perform this action with an infinite sequence.');
  }
}

var __SENTINEL = {};

exports.Sequence = Sequence;
exports.IndexedSequence = IndexedSequence;

},{"./Immutable":1,"./Map":2,"./OrderedMap":3,"./Set":8,"./Vector":9}],8:[function(_dereq_,module,exports){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var SequenceModule = _dereq_('./Sequence');
var ImmutableMap = _dereq_('./Map');
var Sequence = SequenceModule.Sequence;
var IndexedSequence = SequenceModule.IndexedSequence;


for(var Sequence____Key in Sequence){if(Sequence.hasOwnProperty(Sequence____Key)){Set[Sequence____Key]=Sequence[Sequence____Key];}}var ____SuperProtoOfSequence=Sequence===null?null:Sequence.prototype;Set.prototype=Object.create(____SuperProtoOfSequence);Set.prototype.constructor=Set;Set.__superConstructor__=Sequence;

  // @pragma Construction

  function Set() {"use strict";var values=Array.prototype.slice.call(arguments,0);
    return Set.from(values);
  }

  Set.empty=function() {"use strict";
    return __EMPTY_SET || (__EMPTY_SET = Set.$Set_make());
  };

  Set.from=function(sequence) {"use strict";
    if (sequence && sequence.constructor === Set) {
      return sequence;
    }
    if (!sequence || sequence.length === 0) {
      return Set.empty();
    }
    return Set.empty().union(sequence);
  };

  Set.fromKeys=function(sequence) {"use strict";
    return Set.from(Sequence(sequence).flip());
  };

  Set.prototype.toString=function() {"use strict";
    return this.__toString('Set {', '}');
  };

  // @pragma Access

  Set.prototype.has=function(value) {"use strict";
    return this.$Set_map ? this.$Set_map.has(value) : false;
  };

  Set.prototype.get=function(value, notFoundValue) {"use strict";
    return this.has(value) ? value : notFoundValue;
  };

  // @pragma Modification

  Set.prototype.add=function(value) {"use strict";
    if (value == null) {
      return this;
    }
    var newMap = this.$Set_map;
    if (!newMap) {
      newMap = ImmutableMap.empty().__ensureOwner(this.__ownerID);
    }
    newMap = newMap.set(value, null);
    if (this.__ownerID) {
      this.length = newMap.length;
      this.$Set_map = newMap;
      return this;
    }
    return newMap === this.$Set_map ? this : Set.$Set_make(newMap);
  };

  Set.prototype.delete=function(value) {"use strict";
    if (value == null || this.$Set_map == null) {
      return this;
    }
    var newMap = this.$Set_map.delete(value);
    if (newMap.length === 0) {
      return this.clear();
    }
    if (this.__ownerID) {
      this.length = newMap.length;
      this.$Set_map = newMap;
      return this;
    }
    return newMap === this.$Set_map ? this : Set.$Set_make(newMap);
  };

  Set.prototype.clear=function() {"use strict";
    if (this.__ownerID) {
      this.length = 0;
      this.$Set_map = null;
      return this;
    }
    return Set.empty();
  };

  // @pragma Composition

  Set.prototype.union=function() {"use strict";
    var seqs = arguments;
    if (seqs.length === 0) {
      return this;
    }
    return this.withMutations(function(set)  {
      for (var ii = 0; ii < seqs.length; ii++) {
        var seq = seqs[ii];
        seq = seq.forEach ? seq : Sequence(seq);
        seq.forEach(function(value)  {return set.add(value);});
      }
    });
  };

  Set.prototype.intersect=function() {"use strict";var seqs=Array.prototype.slice.call(arguments,0);
    if (seqs.length === 0) {
      return this;
    }
    seqs = seqs.map(function(seq)  {return Sequence(seq);});
    var originalSet = this;
    return this.withMutations(function(set)  {
      originalSet.forEach(function(value)  {
        if (!seqs.every(function(seq)  {return seq.contains(value);})) {
          set.delete(value);
        }
      });
    });
  };

  Set.prototype.subtract=function() {"use strict";var seqs=Array.prototype.slice.call(arguments,0);
    if (seqs.length === 0) {
      return this;
    }
    seqs = seqs.map(function(seq)  {return Sequence(seq);});
    var originalSet = this;
    return this.withMutations(function(set)  {
      originalSet.forEach(function(value)  {
        if (seqs.some(function(seq)  {return seq.contains(value);})) {
          set.delete(value);
        }
      });
    });
  };

  Set.prototype.isSubset=function(seq) {"use strict";
    seq = Sequence(seq);
    return this.every(function(value)  {return seq.contains(value);});
  };

  Set.prototype.isSuperset=function(seq) {"use strict";
    var set = this;
    seq = Sequence(seq);
    return seq.every(function(value)  {return set.contains(value);});
  };

  // @pragma Mutability

  Set.prototype.__ensureOwner=function(ownerID) {"use strict";
    if (ownerID === this.__ownerID) {
      return this;
    }
    var newMap = this.$Set_map && this.$Set_map.__ensureOwner(ownerID);
    if (!ownerID) {
      this.__ownerID = ownerID;
      this.$Set_map = newMap;
      return this;
    }
    return Set.$Set_make(newMap, ownerID);
  };

  // @pragma Iteration

  Set.prototype.__deepEquals=function(other) {"use strict";
    return !(this.$Set_map || other.$Set_map) || this.$Set_map.equals(other.$Set_map);
  };

  Set.prototype.__iterate=function(fn, reverse) {"use strict";
    var collection = this;
    return this.$Set_map ? this.$Set_map.__iterate(function($Set_, k)  {return fn(k, k, collection);}, reverse) : 0;
  };

  // @pragma Private

  Set.$Set_make=function(map, ownerID) {"use strict";
    var set = Object.create(Set.prototype);
    set.length = map ? map.length : 0;
    set.$Set_map = map;
    set.__ownerID = ownerID;
    return set;
  };


Set.prototype.contains = Set.prototype.has;
Set.prototype.withMutations = ImmutableMap.prototype.withMutations;
Set.prototype.asMutable = ImmutableMap.prototype.asMutable;
Set.prototype.asImmutable = ImmutableMap.prototype.asImmutable;
Set.prototype.__toJS = IndexedSequence.prototype.__toJS;
Set.prototype.__toStringMapper = IndexedSequence.prototype.__toStringMapper;


var __EMPTY_SET;

module.exports = Set;

},{"./Map":2,"./Sequence":7}],9:[function(_dereq_,module,exports){
(function (global){
/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

var SequenceModule = _dereq_('./Sequence');
var Sequence = SequenceModule.Sequence;
var IndexedSequence = SequenceModule.IndexedSequence;
var ImmutableMap = _dereq_('./Map');


for(var IndexedSequence____Key in IndexedSequence){if(IndexedSequence.hasOwnProperty(IndexedSequence____Key)){Vector[IndexedSequence____Key]=IndexedSequence[IndexedSequence____Key];}}var ____SuperProtoOfIndexedSequence=IndexedSequence===null?null:IndexedSequence.prototype;Vector.prototype=Object.create(____SuperProtoOfIndexedSequence);Vector.prototype.constructor=Vector;Vector.__superConstructor__=IndexedSequence;

  // @pragma Construction

  function Vector() {"use strict";var values=Array.prototype.slice.call(arguments,0);
    return Vector.from(values);
  }

  Vector.empty=function() {"use strict";
    return __EMPTY_VECT || (__EMPTY_VECT =
      Vector.$Vector_make(0, 0, SHIFT, __EMPTY_VNODE, __EMPTY_VNODE)
    );
  };

  Vector.from=function(sequence) {"use strict";
    if (sequence && sequence.constructor === Vector) {
      return sequence;
    }
    if (!sequence || sequence.length === 0) {
      return Vector.empty();
    }
    var isArray = Array.isArray(sequence);
    if (sequence.length > 0 && sequence.length < SIZE) {
      return Vector.$Vector_make(0, sequence.length, SHIFT, __EMPTY_VNODE, new VNode(
        isArray ? sequence.slice() : Sequence(sequence).toArray()
      ));
    }
    if (!isArray) {
      sequence = Sequence(sequence);
      if (!(sequence instanceof IndexedSequence)) {
        sequence = sequence.values();
      }
    }
    return Vector.empty().merge(sequence);
  };

  Vector.prototype.toString=function() {"use strict";
    return this.__toString('Vector [', ']');
  };

  // @pragma Access

  Vector.prototype.get=function(index, undefinedValue) {"use strict";
    index = rawIndex(index, this.$Vector_origin);
    if (index >= this.$Vector_size) {
      return undefinedValue;
    }
    var node = this.$Vector_nodeFor(index);
    var maskedIndex = index & MASK;
    return node && (undefinedValue === undefined || node.array.hasOwnProperty(maskedIndex)) ?
      node.array[maskedIndex] : undefinedValue;
  };

  Vector.prototype.first=function() {"use strict";
    return this.get(0);
  };

  Vector.prototype.last=function() {"use strict";
    return this.get(this.length ? this.length - 1 : 0);
  };

  // @pragma Modification

  // TODO: set and delete seem very similar.

  Vector.prototype.set=function(index, value) {"use strict";
    var tailOffset = getTailOffset(this.$Vector_size);

    if (index >= this.length) {
      return this.withMutations(function(vect) 
        {return vect.$Vector_setBounds(0, index + 1).set(index, value);}
      );
    }

    if (this.get(index, __SENTINEL) === value) {
      return this;
    }

    index = rawIndex(index, this.$Vector_origin);

    // Fits within tail.
    if (index >= tailOffset) {
      var newTail = this.$Vector_tail.ensureOwner(this.__ownerID);
      newTail.array[index & MASK] = value;
      var newSize = index >= this.$Vector_size ? index + 1 : this.$Vector_size;
      if (this.__ownerID) {
        this.length = newSize - this.$Vector_origin;
        this.$Vector_size = newSize;
        this.$Vector_tail = newTail;
        return this;
      }
      return Vector.$Vector_make(this.$Vector_origin, newSize, this.$Vector_level, this.$Vector_root, newTail);
    }

    // Fits within existing tree.
    var newRoot = this.$Vector_root.ensureOwner(this.__ownerID);
    var node = newRoot;
    for (var level = this.$Vector_level; level > 0; level -= SHIFT) {
      var idx = (index >>> level) & MASK;
      node = node.array[idx] = node.array[idx] ? node.array[idx].ensureOwner(this.__ownerID) : new VNode([], this.__ownerID);
    }
    node.array[index & MASK] = value;
    if (this.__ownerID) {
      this.$Vector_root = newRoot;
      return this;
    }
    return Vector.$Vector_make(this.$Vector_origin, this.$Vector_size, this.$Vector_level, newRoot, this.$Vector_tail);
  };

  Vector.prototype.delete=function(index) {"use strict";
    // Out of bounds, no-op. Probably a more efficient way to do this...
    if (!this.has(index)) {
      return this;
    }

    var tailOffset = getTailOffset(this.$Vector_size);
    index = rawIndex(index, this.$Vector_origin);

    // Delete within tail.
    if (index >= tailOffset) {
      var newTail = this.$Vector_tail.ensureOwner(this.__ownerID);
      delete newTail.array[index & MASK];
      if (this.__ownerID) {
        this.$Vector_tail = newTail;
        return this;
      }
      return Vector.$Vector_make(this.$Vector_origin, this.$Vector_size, this.$Vector_level, this.$Vector_root, newTail);
    }

    // Fits within existing tree.
    var newRoot = this.$Vector_root.ensureOwner(this.__ownerID);
    var node = newRoot;
    for (var level = this.$Vector_level; level > 0; level -= SHIFT) {
      var idx = (index >>> level) & MASK;
      // TODO: if we don't check "has" above, this could be null.
      node = node.array[idx] = node.array[idx].ensureOwner(this.__ownerID);
    }
    delete node.array[index & MASK];
    if (this.__ownerID) {
      this.$Vector_root = newRoot;
      return this;
    }
    return Vector.$Vector_make(this.$Vector_origin, this.$Vector_size, this.$Vector_level, newRoot, this.$Vector_tail);
  };

  Vector.prototype.clear=function() {"use strict";
    if (this.__ownerID) {
      this.length = this.$Vector_origin = this.$Vector_size = 0;
      this.$Vector_level = SHIFT;
      this.$Vector_root = this.$Vector_tail = __EMPTY_VNODE;
      return this;
    }
    return Vector.empty();
  };

  Vector.prototype.push=function() {"use strict";
    var values = arguments;
    var oldLength = this.length;
    return this.withMutations(function(vect)  {
      vect.$Vector_setBounds(0, oldLength + values.length);
      for (var ii = 0; ii < values.length; ii++) {
        vect.set(oldLength + ii, values[ii]);
      }
    });
  };

  Vector.prototype.pop=function() {"use strict";
    return this.$Vector_setBounds(0, -1);
  };

  Vector.prototype.unshift=function() {"use strict";
    var values = arguments;
    return this.withMutations(function(vect)  {
      vect.$Vector_setBounds(-values.length);
      for (var ii = 0; ii < values.length; ii++) {
        vect.set(ii, values[ii]);
      }
    });
  };

  Vector.prototype.shift=function() {"use strict";
    return this.$Vector_setBounds(1);
  };

  // @pragma Composition

  Vector.prototype.merge=function() {"use strict";var seqs=Array.prototype.slice.call(arguments,0);
    return ImmutableMap.prototype.merge.apply(
      vectorWithLengthOfLongestSeq(this, seqs), arguments);
  };

  Vector.prototype.mergeWith=function(fn)  {"use strict";var seqs=Array.prototype.slice.call(arguments,1);
    return ImmutableMap.prototype.mergeWith.apply(
      vectorWithLengthOfLongestSeq(this, seqs), arguments);
  };

  Vector.prototype.mergeDeep=function() {"use strict";var seqs=Array.prototype.slice.call(arguments,0);
    return ImmutableMap.prototype.mergeDeep.apply(
      vectorWithLengthOfLongestSeq(this, seqs), arguments);
  };

  Vector.prototype.mergeDeepWith=function(fn)  {"use strict";var seqs=Array.prototype.slice.call(arguments,1);
    return ImmutableMap.prototype.mergeDeepWith.apply(
      vectorWithLengthOfLongestSeq(this, seqs), arguments);
  };

  Vector.prototype.setLength=function(length) {"use strict";
    return this.$Vector_setBounds(0, length);
  };

  Vector.prototype.$Vector_setBounds=function(begin, end) {"use strict";
    var owner = this.__ownerID || new OwnerID();
    var oldOrigin = this.$Vector_origin;
    var oldSize = this.$Vector_size;
    var newOrigin = oldOrigin + begin;
    var newSize = end == null ? oldSize : end < 0 ? oldSize + end : oldOrigin + end;
    if (newOrigin === oldOrigin && newSize === oldSize) {
      return this;
    }

    // If it's going to end after it starts, it's empty.
    if (newOrigin >= newSize) {
      return this.clear();
    }

    var newLevel = this.$Vector_level;
    var newRoot = this.$Vector_root;

    // New origin might require creating a higher root.
    var offsetShift = 0;
    while (newOrigin + offsetShift < 0) {
      // TODO: why only ever shifting over by 1?
      newRoot = new VNode(newRoot.array.length ? [,newRoot] : [], owner);
      offsetShift += 1 << newLevel;
      newLevel += SHIFT;
    }
    if (offsetShift) {
      newOrigin += offsetShift;
      oldOrigin += offsetShift;
      newSize += offsetShift;
      oldSize += offsetShift;
    }

    var oldTailOffset = getTailOffset(oldSize);
    var newTailOffset = getTailOffset(newSize);

    // New size might require creating a higher root.
    while (newTailOffset >= 1 << (newLevel + SHIFT)) {
      newRoot = new VNode(newRoot.array.length ? [newRoot] : [], owner);
      newLevel += SHIFT;
    }

    // Locate or create the new tail.
    var oldTail = this.$Vector_tail;
    var newTail = newTailOffset < oldTailOffset ?
      this.$Vector_nodeFor(newSize) :
      newTailOffset > oldTailOffset ? new VNode([], owner) : oldTail;

    // Merge Tail into tree.
    if (newTailOffset > oldTailOffset && newOrigin < oldSize && oldTail.array.length) {
      newRoot = newRoot.ensureOwner(owner);
      var node = newRoot;
      for (var level = newLevel; level > SHIFT; level -= SHIFT) {
        var idx = (oldTailOffset >>> level) & MASK;
        node = node.array[idx] = node.array[idx] ? node.array[idx].ensureOwner(owner) : new VNode([], owner);
      }
      node.array[(oldTailOffset >>> SHIFT) & MASK] = oldTail;
    }

    // If the size has been reduced, there's a chance the tail needs to be trimmed.
    if (newSize < oldSize) {
      newTail = newTail.removeAfter(owner, 0, newSize);
    }

    // If the new origin is within the tail, then we do not need a root.
    if (newOrigin >= newTailOffset) {
      newOrigin -= newTailOffset;
      newSize -= newTailOffset;
      newLevel = SHIFT;
      newRoot = __EMPTY_VNODE;
      newTail = newTail.removeBefore(owner, 0, newOrigin);

    // Otherwise, if the root has been trimmed, garbage collect.
    } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
      var beginIndex, endIndex;
      offsetShift = 0;

      // Identify the new top root node of the subtree of the old root.
      do {
        beginIndex = ((newOrigin) >>> newLevel) & MASK;
        endIndex = ((newTailOffset - 1) >>> newLevel) & MASK;
        if (beginIndex === endIndex) {
          if (beginIndex) {
            offsetShift += (1 << newLevel) * beginIndex;
          }
          newLevel -= SHIFT;
          newRoot = newRoot && newRoot.array[beginIndex];
        }
      } while (newRoot && beginIndex === endIndex);

      // Trim the new sides of the new root.
      if (newRoot && newOrigin > oldOrigin) {
        newRoot = newRoot.removeBefore(owner, newLevel, newOrigin - offsetShift);
      }
      if (newRoot && newTailOffset < oldTailOffset) {
        newRoot = newRoot.removeAfter(owner, newLevel, newTailOffset - offsetShift);
      }
      if (offsetShift) {
        newOrigin -= offsetShift;
        newSize -= offsetShift;
      }
      // Ensure root is not null.
      newRoot = newRoot || __EMPTY_VNODE;
    }

    if (this.__ownerID) {
      this.length = newSize - newOrigin;
      this.$Vector_origin = newOrigin;
      this.$Vector_size = newSize;
      this.$Vector_level = newLevel;
      this.$Vector_root = newRoot;
      this.$Vector_tail = newTail;
      return this;
    }
    return Vector.$Vector_make(newOrigin, newSize, newLevel, newRoot, newTail);
  };

  // @pragma Mutability

  Vector.prototype.__ensureOwner=function(ownerID) {"use strict";
    if (ownerID === this.__ownerID) {
      return this;
    }
    if (!ownerID) {
      this.__ownerID = ownerID;
      return this;
    }
    return Vector.$Vector_make(this.$Vector_origin, this.$Vector_size, this.$Vector_level, this.$Vector_root, this.$Vector_tail, ownerID);
  };

  // @pragma Iteration

  Vector.prototype.slice=function(begin, end, maintainIndices) {"use strict";
    var sliceSequence = ____SuperProtoOfIndexedSequence.slice.call(this,begin, end, maintainIndices);
    // Optimize the case of vector.slice(b, e).toVector()
    if (!maintainIndices && sliceSequence !== this) {
      var vector = this;
      var length = vector.length;
      sliceSequence.toVector = function()  {return vector.$Vector_setBounds(
        begin < 0 ? Math.max(0, length + begin) : length ? Math.min(length, begin) : begin,
        end == null ? length : end < 0 ? Math.max(0, length + end) : length ? Math.min(length, end) : end
      );};
    }
    return sliceSequence;
  };

  Vector.prototype.__deepEquals=function(other) {"use strict";
    var is = _dereq_('./Immutable').is;
    var iterator = this.__iterator__();
    return other.every(function(v, k)  {
      var entry = iterator.next();
      return k === entry[0] && is(v, entry[1]);
    });
  };

  Vector.prototype.__iterator__=function() {"use strict";
    return new VectorIterator(
      this, this.$Vector_origin, this.$Vector_size, this.$Vector_level, this.$Vector_root, this.$Vector_tail
    );
  };

  Vector.prototype.__iterate=function(fn, reverse, flipIndices) {"use strict";
    var vector = this;
    var lastIndex = 0;
    var maxIndex = vector.length - 1;
    flipIndices ^= reverse;
    var eachFn = function(value, ii)  {
      if (fn(value, flipIndices ? maxIndex - ii : ii, vector) === false) {
        return false;
      } else {
        lastIndex = ii;
        return true;
      }
    };
    var didComplete;
    var tailOffset = getTailOffset(this.$Vector_size);
    if (reverse) {
      didComplete =
        this.$Vector_tail.iterate(0, tailOffset - this.$Vector_origin, this.$Vector_size - this.$Vector_origin, eachFn, reverse) &&
        this.$Vector_root.iterate(this.$Vector_level, -this.$Vector_origin, tailOffset - this.$Vector_origin, eachFn, reverse);
    } else {
      didComplete =
        this.$Vector_root.iterate(this.$Vector_level, -this.$Vector_origin, tailOffset - this.$Vector_origin, eachFn, reverse) &&
        this.$Vector_tail.iterate(0, tailOffset - this.$Vector_origin, this.$Vector_size - this.$Vector_origin, eachFn, reverse);
    }
    return (didComplete ? maxIndex : reverse ? maxIndex - lastIndex : lastIndex) + 1;
  };

  // @pragma Private

  Vector.$Vector_make=function(origin, size, level, root, tail, ownerID) {"use strict";
    var vect = Object.create(Vector.prototype);
    vect.length = size - origin;
    vect.$Vector_origin = origin;
    vect.$Vector_size = size;
    vect.$Vector_level = level;
    vect.$Vector_root = root;
    vect.$Vector_tail = tail;
    vect.__ownerID = ownerID;
    return vect;
  };

  Vector.prototype.$Vector_nodeFor=function(rawIndex) {"use strict";
    if (rawIndex >= getTailOffset(this.$Vector_size)) {
      return this.$Vector_tail;
    }
    if (rawIndex < 1 << (this.$Vector_level + SHIFT)) {
      var node = this.$Vector_root;
      var level = this.$Vector_level;
      while (node && level > 0) {
        node = node.array[(rawIndex >>> level) & MASK];
        level -= SHIFT;
      }
      return node;
    }
  };


Vector.prototype.updateIn = ImmutableMap.prototype.updateIn;
Vector.prototype.withMutations = ImmutableMap.prototype.withMutations;
Vector.prototype.asMutable = ImmutableMap.prototype.asMutable;
Vector.prototype.asImmutable = ImmutableMap.prototype.asImmutable;



  function OwnerID() {"use strict";}




  function VNode(array, ownerID) {"use strict";
    this.array = array;
    this.ownerID = ownerID;
  }

  VNode.prototype.ensureOwner=function(ownerID) {"use strict";
    if (ownerID && ownerID === this.ownerID) {
      return this;
    }
    return new VNode(this.array.slice(), ownerID);
  };

  // TODO: seems like these methods are very similar

  VNode.prototype.removeBefore=function(ownerID, level, index) {"use strict";
    if (index === 1 << level || this.array.length === 0) {
      return this;
    }
    var originIndex = (index >>> level) & MASK;
    if (originIndex >= this.array.length) {
      return new VNode([], ownerID);
    }
    var removingFirst = originIndex === 0;
    var newChild;
    if (level > 0) {
      var oldChild = this.array[originIndex];
      newChild = oldChild && oldChild.removeBefore(ownerID, level - SHIFT, index);
      if (newChild === oldChild && removingFirst) {
        return this;
      }
    }
    if (removingFirst && !newChild) {
      return this;
    }
    var editable = this.ensureOwner();
    if (!removingFirst) {
      for (var ii = 0; ii < originIndex; ii++) {
        delete editable.array[ii];
      }
    }
    if (newChild) {
      editable.array[originIndex] = newChild;
    }
    return editable;
  };

  VNode.prototype.removeAfter=function(ownerID, level, index) {"use strict";
    if (index === 1 << level || this.array.length === 0) {
      return this;
    }
    var sizeIndex = ((index - 1) >>> level) & MASK;
    if (sizeIndex >= this.array.length) {
      return this;
    }
    var removingLast = sizeIndex === this.array.length - 1;
    var newChild;
    if (level > 0) {
      var oldChild = this.array[sizeIndex];
      newChild = oldChild && oldChild.removeAfter(ownerID, level - SHIFT, index);
      if (newChild === oldChild && removingLast) {
        return this;
      }
    }
    if (removingLast && !newChild) {
      return this;
    }
    var editable = this.ensureOwner();
    if (!removingLast) {
      editable.array.length = sizeIndex + 1;
    }
    if (newChild) {
      editable.array[sizeIndex] = newChild;
    }
    return editable;
  };

  VNode.prototype.iterate=function(level, offset, max, fn, reverse) {"use strict";
    // Note using every() gets us a speed-up of 2x on modern JS VMs, but means
    // we cannot support IE8 without polyfill.
    if (level === 0) {
      if (reverse) {
        for (var revRawIndex = this.array.length - 1; revRawIndex >= 0; revRawIndex--) {
          if (this.array.hasOwnProperty(revRawIndex)) {
            var index = revRawIndex + offset;
            if (index >= 0 && index < max && fn(this.array[revRawIndex], index) === false) {
              return false;
            }
          }
        }
        return true;
      } else {
        return this.array.every(function(value, rawIndex)  {
          var index = rawIndex + offset;
          return index < 0 || index >= max || fn(value, index) !== false;
        });
      }
    }
    var step = 1 << level;
    var newLevel = level - SHIFT;
    if (reverse) {
      for (var revLevelIndex = this.array.length - 1; revLevelIndex >= 0; revLevelIndex--) {
        var newOffset = offset + revLevelIndex * step;
        if (newOffset < max && newOffset + step > 0 &&
            this.array.hasOwnProperty(revLevelIndex) &&
            !this.array[revLevelIndex].iterate(newLevel, newOffset, max, fn, reverse)) {
          return false;
        }
      }
      return true;
    } else {
      return this.array.every(function(newNode, levelIndex)  {
        var newOffset = offset + levelIndex * step;
        return newOffset >= max || newOffset + step <= 0 || newNode.iterate(newLevel, newOffset, max, fn, reverse);
      });
    }
  };





  function VectorIterator(vector, origin, size, level, root, tail) {"use strict";
    var tailOffset = getTailOffset(size);
    this.$VectorIterator_stack = {
      node: root.array,
      level: level,
      offset: -origin,
      max: tailOffset - origin,
      __prev: {
        node: tail.array,
        level: 0,
        offset: tailOffset - origin,
        max: size - origin
      }
    };
  }

  VectorIterator.prototype.next=function()  {"use strict";
    var stack = this.$VectorIterator_stack;
    iteration: while (stack) {
      if (stack.level === 0) {
        stack.rawIndex || (stack.rawIndex = 0);
        while (stack.rawIndex < stack.node.length) {
          var index = stack.rawIndex + stack.offset;
          if (index >= 0 && index < stack.max && stack.node.hasOwnProperty(stack.rawIndex)) {
            var value = stack.node[stack.rawIndex];
            stack.rawIndex++;
            return [index, value];
          } else {
            stack.rawIndex++;
          }
        }
      } else {
        var step = 1 << stack.level;
        stack.levelIndex || (stack.levelIndex = 0);
        while (stack.levelIndex < stack.node.length) {
          var newOffset = stack.offset + stack.levelIndex * step;
          if (newOffset + step > 0 && newOffset < stack.max && stack.node.hasOwnProperty(stack.levelIndex)) {
            var newNode = stack.node[stack.levelIndex].array;
            stack.levelIndex++;
            stack = this.$VectorIterator_stack = {
              node: newNode,
              level: stack.level - SHIFT,
              offset: newOffset,
              max: stack.max,
              __prev: stack
            };
            continue iteration;
          } else {
            stack.levelIndex++;
          }
        }
      }
      stack = this.$VectorIterator_stack = this.$VectorIterator_stack.__prev;
    }
    if (global.StopIteration) {
      throw global.StopIteration;
    }
  };



function vectorWithLengthOfLongestSeq(vector, seqs) {
  var maxLength = Math.max.apply(null, seqs.map(function(seq)  {return seq.length || 0;}));
  return maxLength > vector.length ? vector.setLength(maxLength) : vector;
}

function rawIndex(index, origin) {
  if (index < 0) throw new Error('Index out of bounds');
  return index + origin;
}

function getTailOffset(size) {
  return size < SIZE ? 0 : (((size - 1) >>> SHIFT) << SHIFT);
}


var SHIFT = 5; // Resulted in best performance after ______?
var SIZE = 1 << SHIFT;
var MASK = SIZE - 1;
var __SENTINEL = {};
var __EMPTY_VECT;
var __EMPTY_VNODE = new VNode([]);

module.exports = Vector;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Immutable":1,"./Map":2,"./Sequence":7}]},{},[1])
(1)
});