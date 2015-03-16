(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Morearty = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var Imm = (typeof window !== "undefined" ? window.Immutable : typeof global !== "undefined" ? global.Immutable : null);
var Util = require('./Util');
var ChangesDescriptor = require('./ChangesDescriptor');

/* ---------------- */
/* Private helpers. */
/* ---------------- */

var UNSET_VALUE = {};

var getBackingValue, setBackingValue;

getBackingValue = function (binding) {
  return binding._sharedInternals.backingValue;
};

setBackingValue = function (binding, newBackingValue) {
  binding._sharedInternals.backingValue = newBackingValue;
};

var EMPTY_PATH, PATH_SEPARATOR, META_NODE, getPathElements, joinPaths, getMetaPath, getValueAtPath;

EMPTY_PATH = [];
PATH_SEPARATOR = '.';
META_NODE = '__meta__';

getPathElements = function (path) {
  return path ? path.split(PATH_SEPARATOR) : [];
};

joinPaths = function (path1, path2) {
  return path1.length === 0 ? path2 :
    (path2.length === 0 ? path1 : path1.concat(path2));
};

getMetaPath = function (subpath, key) {
  return joinPaths(subpath, [META_NODE, key]);
};

getValueAtPath = function (backingValue, path) {
  return backingValue && path.length > 0 ? backingValue.getIn(path) : backingValue;
};

var asArrayPath, asStringPath;

asArrayPath = function (path) {
  return typeof path === 'string' ?
    getPathElements(path) :
    (Util.undefinedOrNull(path) ? [] : path);
};

asStringPath = function (path) {
  switch (typeof path) {
    case 'string':
      return path;
    case 'number':
      return path.toString();
    default:
      return Util.undefinedOrNull(path) ? '' : path.join(PATH_SEPARATOR);
  }
};

var setOrUpdate, updateValue, removeValue, merge, clear;

setOrUpdate = function (rootValue, effectivePath, f) {
  return rootValue.updateIn(effectivePath, UNSET_VALUE, function (value) {
    return value === UNSET_VALUE ? f() : f(value);
  });
};

updateValue = function (self, subpath, f) {
  var effectivePath = joinPaths(self._path, subpath);
  var newBackingValue = setOrUpdate(getBackingValue(self), effectivePath, f);
  setBackingValue(self, newBackingValue);
  return effectivePath;
};

removeValue = function (self, subpath) {
  var effectivePath = joinPaths(self._path, subpath);
  var backingValue = getBackingValue(self);

  var len = effectivePath.length;
  switch (len) {
    case 0:
      throw new Error('Cannot delete root value');
    default:
      var pathTo = effectivePath.slice(0, len - 1);
      if (backingValue.has(pathTo[0]) || len === 1) {
        var newBackingValue = backingValue.updateIn(pathTo, function (coll) {
          var key = effectivePath[len - 1];
          if (coll instanceof Imm.List) {
            return coll.splice(key, 1);
          } else {
            return coll && coll.remove(key);
          }
        });

        setBackingValue(self, newBackingValue);
      }

      return pathTo;
  }
};

merge = function (preserve, newValue, value) {
  if (Util.undefinedOrNull(value)) {
    return newValue;
  } else {
    if (value instanceof Imm.Iterable && newValue instanceof Imm.Iterable) {
      return preserve ? newValue.mergeDeep(value) : value.mergeDeep(newValue);
    } else {
      return preserve ? value : newValue;
    }
  }
};

clear = function (value) {
  return value instanceof Imm.Iterable ? value.clear() : null;
};

var notifySamePathListeners, notifyGlobalListeners, startsWith, isPathAffected, notifyNonGlobalListeners, notifyAllListeners;

notifySamePathListeners =
  function (self, samePathListeners, listenerPath, path, previousBackingValue, previousMeta) {
    if (previousBackingValue || previousMeta) {
      Util.getPropertyValues(samePathListeners).forEach(function (listenerDescriptor) {
        if (!listenerDescriptor.disabled) {
          var listenerPathAsArray = asArrayPath(listenerPath);
          var currentBackingValue = getBackingValue(self);

          var valueChanged = !!previousBackingValue &&
            currentBackingValue.getIn(listenerPathAsArray) !== previousBackingValue.getIn(listenerPathAsArray);
          var metaChanged = !!previousMeta;

          if (valueChanged || metaChanged) {
            listenerDescriptor.cb(
              new ChangesDescriptor(
                path, listenerPathAsArray, valueChanged, previousBackingValue, previousMeta
              )
            );
          }
        }
      });
    }
  };

notifyGlobalListeners = function (self, path, previousBackingValue, previousMeta) {
  var listeners = self._sharedInternals.listeners;
  var globalListeners = listeners[''];
  if (globalListeners) {
    notifySamePathListeners(
      self, globalListeners, EMPTY_PATH, path, previousBackingValue, previousMeta);
  }
};

startsWith = function (s1, s2) {
  return s1.indexOf(s2) === 0;
};

isPathAffected = function (listenerPath, changedPath) {
  return startsWith(changedPath, listenerPath) || startsWith(listenerPath, changedPath);
};

notifyNonGlobalListeners = function (self, path, previousBackingValue, previousMeta) {
  var listeners = self._sharedInternals.listeners;
  Object.keys(listeners).filter(Util.identity).forEach(function (listenerPath) {
    if (isPathAffected(listenerPath, asStringPath(path))) {
      notifySamePathListeners(
        self, listeners[listenerPath], listenerPath, path, previousBackingValue, previousMeta);
    }
  });
};

notifyAllListeners = function (self, path, previousBackingValue, previousMeta) {
  notifyGlobalListeners(self, path, previousBackingValue, previousMeta);
  notifyNonGlobalListeners(self, path, previousBackingValue, previousMeta);
};

var linkMeta, unlinkMeta;

linkMeta = function (self, metaBinding) {
  self._sharedInternals.metaBindingListenerId = metaBinding.addListener(function (changes) {
    var metaNodePath = changes.getPath();
    var changedPath = metaNodePath.slice(0, metaNodePath.length - 1);
    var previousMeta = changes.isValueChanged() ? changes.getPreviousValue() : getBackingValue(metaBinding);

    notifyAllListeners(self, changedPath, null, previousMeta);
  });
};

unlinkMeta = function (self, metaBinding) {
  var removed = metaBinding.removeListener(self._sharedInternals.metaBindingListenerId);
  self._sharedInternals.metaBinding = null;
  self._sharedInternals.metaBindingListenerId = null;
  return removed;
};

var findSamePathListeners, setListenerDisabled;

findSamePathListeners = function (self, listenerId) {
  return Util.find(
    Util.getPropertyValues(self._sharedInternals.listeners),
    function (samePathListeners) { return !!samePathListeners[listenerId]; }
  );
};

setListenerDisabled = function (self, listenerId, disabled) {
  var samePathListeners = findSamePathListeners(self, listenerId);
  if (samePathListeners) {
    samePathListeners[listenerId].disabled = disabled;
  }
};

var update, delete_;

update = function (self, subpath, f) {
  var previousBackingValue = getBackingValue(self);
  var affectedPath = updateValue(self, asArrayPath(subpath), f);
  notifyAllListeners(self, affectedPath, previousBackingValue, null);
};

delete_ = function (self, subpath) {
  var previousBackingValue = getBackingValue(self);
  var affectedPath = removeValue(self, asArrayPath(subpath));
  notifyAllListeners(self, affectedPath, previousBackingValue, null);
};

/** Binding constructor.
 * @param {String[]} [path] binding path, empty array if omitted
 * @param {Object} [sharedInternals] shared relative bindings internals:
 * <ul>
 *   <li>backingValue - backing value;</li>
 *   <li>metaBinding - meta binding;</li>
 *   <li>metaBindingListenerId - meta binding listener id;</li>
 *   <li>regCount - registration count (used for listener id generation);</li>
 *   <li>listeners - change listeners;</li>
 *   <li>cache - bindings cache.</li>
 * </ul>
 * @public
 * @class Binding
 * @classdesc Wraps immutable collection. Provides convenient read-write access to nested values.
 * Allows to create sub-bindings (or views) narrowed to a subpath and sharing the same backing value.
 * Changes to these bindings are mutually visible.
 * <p>Terminology:
 * <ul>
 *   <li>
 *     (sub)path - path to a value within nested associative data structure, example: 'path.t.0.some.value';
 *   </li>
 *   <li>
 *     backing value - value shared by all bindings created using [sub]{@link Binding#sub} method.
 *   </li>
 * </ul>
 * <p>Features:
 * <ul>
 *   <li>can create sub-bindings sharing same backing value. Sub-binding can only modify values down its subpath;</li>
 *   <li>allows to conveniently modify nested values: assign, update with a function, remove, and so on;</li>
 *   <li>can attach change listeners to a specific subpath;</li>
 *   <li>can perform multiple changes atomically in respect of listener notification.</li>
 * </ul>
 * @see Binding.init */
var Binding = function (path, sharedInternals) {
  /** @private */
  this._path = path || EMPTY_PATH;

  /** @protected
   * @ignore */
  this._sharedInternals = sharedInternals || {};

  if (Util.undefinedOrNull(this._sharedInternals.regCount)) {
    this._sharedInternals.regCount = 0;
  }

  if (!this._sharedInternals.listeners) {
    this._sharedInternals.listeners = {};
  }

  if (!this._sharedInternals.cache) {
    this._sharedInternals.cache = {};
  }
};

/* --------------- */
/* Static helpers. */
/* --------------- */

/** Create new binding with empty listeners set.
 * @param {Immutable.Map} backingValue backing value
 * @param {Binding} [metaBinding] meta binding
 * @return {Binding} fresh binding instance */
Binding.init = function (backingValue, metaBinding) {
  var binding = new Binding(EMPTY_PATH, {
    backingValue: backingValue,
    metaBinding: metaBinding
  });

  if (metaBinding) {
    linkMeta(binding, metaBinding);
  }

  return binding;
};

/** Convert string path to array path.
 * @param {String} pathAsString path as string
 * @return {Array} path as an array */
Binding.asArrayPath = function (pathAsString) {
  return asArrayPath(pathAsString);
};

/** Convert array path to string path.
 * @param {String[]} pathAsAnArray path as an array
 * @return {String} path as a string */
Binding.asStringPath = function (pathAsAnArray) {
  return asStringPath(pathAsAnArray);
};

/** Meta node name.
 * @type {String} */
Binding.META_NODE = META_NODE;

/** @lends Binding.prototype */
var bindingPrototype = {

  /** Get binding path.
   * @returns {Array} binding path */
  getPath: function () {
    return this._path;
  },

  /** Update backing value.
   * @param {Immutable.Map} newBackingValue new backing value
   * @return {Binding} new binding instance, original is unaffected */
  withBackingValue: function (newBackingValue) {
    var newSharedInternals = {};
    Util.assign(newSharedInternals, this._sharedInternals);
    newSharedInternals.backingValue = newBackingValue;
    return new Binding(this._path, newSharedInternals);
  },

  /** Check if binding value is changed in alternative backing value.
   * @param {Immutable.Map} alternativeBackingValue alternative backing value
   * @param {Function} [compare] alternative compare function, does reference equality check if omitted */
  isChanged: function (alternativeBackingValue, compare) {
    var value = this.get();
    var alternativeValue = alternativeBackingValue ? alternativeBackingValue.getIn(this._path) : undefined;
    return compare ?
        !compare(value, alternativeValue) :
        !(value === alternativeValue || (Util.undefinedOrNull(value) && Util.undefinedOrNull(alternativeValue)));
  },

  /** Check if this and supplied binding are relatives (i.e. share same backing value).
   * @param {Binding} otherBinding potential relative
   * @return {Boolean} */
  isRelative: function (otherBinding) {
    return this._sharedInternals === otherBinding._sharedInternals &&
      this._sharedInternals.backingValue === otherBinding._sharedInternals.backingValue;
  },

  /** Get binding's meta binding.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers;
   *                                 b.meta('path') is equivalent to b.meta().sub('path')
   * @returns {Binding} meta binding or undefined */
  meta: function (subpath) {
    if (!this._sharedInternals.metaBinding) {
      var metaBinding = Binding.init(Imm.Map());
      linkMeta(this, metaBinding);
      this._sharedInternals.metaBinding = metaBinding;
    }

    var effectiveSubpath = subpath ? joinPaths([META_NODE], asArrayPath(subpath)) : [META_NODE];
    var thisPath = this.getPath();
    var absolutePath = thisPath.length > 0 ? joinPaths(thisPath, effectiveSubpath) : effectiveSubpath;
    return this._sharedInternals.metaBinding.sub(absolutePath);
  },

  /** Unlink this binding's meta binding, removing change listener and making them totally independent.
   * May be used to prevent memory leaks when appropriate.
   * @return {Boolean} true if binding's meta binding was unlinked */
  unlinkMeta: function () {
    var metaBinding = this._sharedInternals.metaBinding;
    return metaBinding ? unlinkMeta(this, metaBinding) : false;
  },

  /** Get binding value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {*} value at path or null */
  get: function (subpath) {
    return getValueAtPath(getBackingValue(this), joinPaths(this._path, asArrayPath(subpath)));
  },

  /** Convert to JS representation.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {*} JS representation of data at subpath */
  toJS: function (subpath) {
    var value = this.sub(subpath).get();
    return value instanceof Imm.Iterable ? value.toJS() : value;
  },

  /** Bind to subpath. Both bindings share the same backing value. Changes are mutually visible.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {Binding} new binding instance, original is unaffected */
  sub: function (subpath) {
    var pathAsArray = asArrayPath(subpath);
    var absolutePath = joinPaths(this._path, pathAsArray);
    if (absolutePath.length > 0) {
      var absolutePathAsString = asStringPath(absolutePath);
      var cached = this._sharedInternals.cache[absolutePathAsString];

      if (cached) {
        return cached;
      } else {
        var subBinding = new Binding(absolutePath, this._sharedInternals);
        this._sharedInternals.cache[absolutePathAsString] = subBinding;
        return subBinding;
      }
    } else {
      return this;
    }
  },

  /** Update binding value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} f update function
   * @return {Binding} this binding */
  update: function (subpath, f) {
    var args = Util.resolveArgs(arguments, '?subpath', 'f');
    update(this, args.subpath, args.f);
    return this;
  },

  /** Set binding value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {*} newValue new value
   * @return {Binding} this binding */
  set: function (subpath, newValue) {
    var args = Util.resolveArgs(arguments, '?subpath', 'newValue');
    update(this, args.subpath, Util.constantly(args.newValue));
    return this;
  },

  /** Delete value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {Binding} this binding */
  remove: function (subpath) {
    delete_(this, subpath);
    return this;
  },

  /** Deep merge values.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Boolean} [preserve=false] preserve existing values when merging
   * @param {*} newValue new value
   * @return {Binding} this binding */
  merge: function (subpath, preserve, newValue) {
    var args = Util.resolveArgs(
      arguments,
      function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; },
      '?preserve',
      'newValue'
    );
    update(this, args.subpath, merge.bind(null, args.preserve, args.newValue));
    return this;
  },

  /** Clear nested collection. Does '.clear()' on Immutable values, nullifies otherwise.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {Binding} this binding */
  clear: function (subpath) {
    var subpathAsArray = asArrayPath(subpath);
    if (!Util.undefinedOrNull(this.get(subpathAsArray))) {
      update(this, subpathAsArray, clear);
    }
    return this;
  },

  /** Add change listener.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} cb function receiving changes descriptor
   * @return {String} unique id which should be used to un-register the listener
   * @see ChangesDescriptor */
  addListener: function (subpath, cb) {
    var args = Util.resolveArgs(
      arguments, function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, 'cb'
    );

    var listenerId = 'reg' + this._sharedInternals.regCount++;
    var pathAsString = asStringPath(joinPaths(this._path, asArrayPath(args.subpath || '')));
    var samePathListeners = this._sharedInternals.listeners[pathAsString];
    var listenerDescriptor = { cb: args.cb, disabled: false };
    if (samePathListeners) {
      samePathListeners[listenerId] = listenerDescriptor;
    } else {
      var listeners = {};
      listeners[listenerId] = listenerDescriptor;
      this._sharedInternals.listeners[pathAsString] = listeners;
    }
    return listenerId;
  },

  /** Enable listener.
   * @param {String} listenerId listener id
   * @return {Binding} this binding */
  enableListener: function (listenerId) {
    setListenerDisabled(this, listenerId, false);
    return this;
  },

  /** Disable listener.
   * @param {String} listenerId listener id
   * @return {Binding} this binding */
  disableListener: function (listenerId) {
    setListenerDisabled(this, listenerId, true);
    return this;
  },

  /** Execute function with listener temporarily disabled. Correctly handles functions returning promises.
   * @param {String} listenerId listener id
   * @param {Function} f function to execute
   * @return {Binding} this binding */
  withDisabledListener: function (listenerId, f) {
    var samePathListeners = findSamePathListeners(this, listenerId);
    if (samePathListeners) {
      var descriptor = samePathListeners[listenerId];
      descriptor.disabled = true;
      Util.afterComplete(f, function () { descriptor.disabled = false; });
    } else {
      f();
    }
    return this;
  },

  /** Un-register the listener.
   * @param {String} listenerId listener id
   * @return {Boolean} true if listener removed successfully, false otherwise */
  removeListener: function (listenerId) {
    var samePathListeners = findSamePathListeners(this, listenerId);
    return samePathListeners ? delete samePathListeners[listenerId] : false;
  },

  /** Create transaction context.
   * @return {TransactionContext} transaction context */
  atomically: function () {
    return new TransactionContext(this);
  }

};

bindingPrototype['delete'] = bindingPrototype.remove;

Binding.prototype = Object.freeze(bindingPrototype);

/** Transaction context constructor.
 * @param {Binding} binding binding
 * @param {Function[]} [updates] queued updates
 * @param {Function[]} [removals] queued removals
 * @public
 * @class TransactionContext
 * @classdesc Transaction context. */
var TransactionContext = function (binding, updates, removals) {
  /** @private */
  this._binding = binding;
  /** @private */
  this._updates = updates || [];
  /** @private */
  this._deletions = removals || [];
  /** @private */
  this._committed = false;

  /** @private */
  this._hasChanges = false;
  /** @private */
  this._hasMetaChanges = false;
};

TransactionContext.prototype = (function () {

  var registerUpdate, hasChanges;

  registerUpdate = function (self, binding) {
    if (!self._hasChanges) {
      self._hasChanges = binding.isRelative(self._binding);
    }

    if (!self._hasMetaChanges) {
      self._hasMetaChanges = !binding.isRelative(self._binding);
    }
  };

  hasChanges = function (self) {
    return self._hasChanges || self._hasMetaChanges;
  };

  var addUpdate, addDeletion, areSiblings, filterRedundantPaths, commitSilently;

  addUpdate = function (self, binding, update, subpath) {
    registerUpdate(self, binding);
    self._updates.push({ binding: binding, update: update, subpath: subpath });
  };

  addDeletion = function (self, binding, subpath) {
    registerUpdate(self, binding);
    self._deletions.push({ binding: binding, subpath: subpath });
  };

  areSiblings = function (path1, path2) {
    var path1Length = path1.length, path2Length = path2.length;
    return path1Length === path2Length &&
      (path1Length === 1 || path1[path1Length - 2] === path2[path1Length - 2]);
  };

  filterRedundantPaths = function (affectedPaths) {
    if (affectedPaths.length < 2) {
      return affectedPaths;
    } else {
      var sortedPaths = affectedPaths.sort();
      var previousPath = sortedPaths[0], previousPathAsString = asStringPath(previousPath);
      var result = [previousPath];
      for (var i = 1; i < sortedPaths.length; i++) {
        var currentPath = sortedPaths[i], currentPathAsString = asStringPath(currentPath);
        if (!startsWith(currentPathAsString, previousPathAsString)) {
          if (areSiblings(currentPath, previousPath)) {
            var commonParentPath = currentPath.slice(0, currentPath.length - 1);
            result.pop();
            result.push(commonParentPath);
            previousPath = commonParentPath;
            previousPathAsString = asStringPath(commonParentPath);
          } else {
            result.push(currentPath);
            previousPath = currentPath;
            previousPathAsString = currentPathAsString;
          }
        }
      }
      return result;
    }
  };

  commitSilently = function (self) {
    if (!self._committed) {
      var updatedPaths = self._updates.map(function (o) { return updateValue(o.binding, o.subpath, o.update); });
      var removedPaths = self._deletions.map(function (o) { return removeValue(o.binding, o.subpath); });
      self._committed = true;
      return joinPaths(updatedPaths, removedPaths);
    } else {
      throw new Error('Transaction already committed');
    }
  };

  /** @lends TransactionContext.prototype */
  var transactionContextPrototype = {

    /** Update binding value.
     * @param {Binding} [binding] binding to apply update to
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Function} f update function
     * @return {TransactionContext} updated transaction */
    update: function (binding, subpath, f) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return x instanceof Binding ? 'binding' : null; }, '?subpath', 'f'
      );
      addUpdate(this, args.binding || this._binding, args.f, asArrayPath(args.subpath));
      return this;
    },

    /** Set binding value.
     * @param {Binding} [binding] binding to apply update to
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {*} newValue new value
     * @return {TransactionContext} updated transaction context */
    set: function (binding, subpath, newValue) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return x instanceof Binding ? 'binding' : null; }, '?subpath', 'newValue'
      );
      return this.update(args.binding, args.subpath, Util.constantly(args.newValue));
    },

    /** Remove value.
     * @param {Binding} [binding] binding to apply update to
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @return {TransactionContext} updated transaction context */
    remove: function (binding, subpath) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return x instanceof Binding ? 'binding' : null; }, '?subpath'
      );
      addDeletion(this, args.binding || this._binding, asArrayPath(args.subpath));
      return this;
    },

    /** Deep merge values.
     * @param {Binding} [binding] binding to apply update to
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Boolean} [preserve=false] preserve existing values when merging
     * @param {*} newValue new value
     * @return {TransactionContext} updated transaction context */
    merge: function (binding, subpath, preserve, newValue) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return x instanceof Binding ? 'binding' : null; },
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; },
        function (x) { return typeof x === 'boolean' ? 'preserve' : null; },
        'newValue'
      );
      return this.update(args.binding, args.subpath, merge.bind(null, args.preserve, args.newValue));
    },

    /** Clear collection or nullify nested value.
     * @param {Binding} [binding] binding to apply update to
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @return {TransactionContext} updated transaction context */
    clear: function (binding, subpath) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return x instanceof Binding ? 'binding' : null; }, '?subpath'
      );
      addUpdate(this, args.binding || this._binding, clear, asArrayPath(args.subpath));
      return this;
    },

    /** Commit transaction (write changes and notify listeners).
     * @param {Object} [options] options object
     * @param {Boolean} [options.notify=true] should listeners be notified
     * @return {String[]} array of affected paths */
    commit: function (options) {
      if (hasChanges(this)) {
        var effectiveOptions = options || {};
        var binding = this._binding;

        var previousBackingValue = null, previousMetaValue = null;
        if (effectiveOptions.notify !== false) {
          if (this._hasChanges) previousBackingValue = getBackingValue(binding);
          if (this._hasMetaChanges) previousMetaValue = getBackingValue(binding.meta());
        }

        var affectedPaths = commitSilently(this);

        if (effectiveOptions.notify !== false) {
          var filteredPaths = filterRedundantPaths(affectedPaths);
          notifyGlobalListeners(binding, filteredPaths[0], previousBackingValue, previousMetaValue);
          filteredPaths.forEach(function (path) {
            notifyNonGlobalListeners(binding, path, previousBackingValue, previousMetaValue);
          });
        }

        return affectedPaths;

      } else {
        return [];
      }
    }

  };

  transactionContextPrototype['delete'] = transactionContextPrototype.remove;

  return Object.freeze(transactionContextPrototype);
})();


module.exports = Binding;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./ChangesDescriptor":2,"./Util":6}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
(function (global){
var Util  = require('./Util');
var React = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);

var _ = (function() {
  if (React) return React.DOM;
  else {
    throw new Error('Morearty: global variable React not found');
  }
})();

var wrapComponent = function (comp, displayName) {
  return React.createClass({

    displayName: displayName,

    getInitialState: function () {
      return { value: this.props.value };
    },

    onChange: function (event) {
      var handler = this.props.onChange;
      if (handler) {
        handler(event);
        this.setState({ value: event.target.value });
      }
    },

    componentWillReceiveProps: function (newProps) {
      this.setState({ value: newProps.value });
    },

    render: function () {
      var props = Util.assign({}, this.props, {
        value: this.state.value,
        onChange: this.onChange,
        children: this.props.children
      });
      return comp(props);
    }

  });
};

/**
 * @name DOM
 * @namespace
 * @classdesc DOM module. Exposes requestAnimationFrame-friendly wrappers around input, textarea, and option.
 */
var DOM = {

  input: wrapComponent(_.input, 'input'),

  textarea: wrapComponent(_.textarea, 'textarea'),

  option: wrapComponent(_.option, 'option')

};

module.exports = DOM;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Util":6}],4:[function(require,module,exports){
(function (global){
var Imm = (typeof window !== "undefined" ? window.Immutable : typeof global !== "undefined" ? global.Immutable : null);
var Binding = require('./Binding');

var getHistoryBinding, initHistory, clearHistory, destroyHistory, listenForChanges, revertToStep, revert;

getHistoryBinding = function (binding) {
  return binding.meta('history');
};

initHistory = function (historyBinding) {
  historyBinding.set(Imm.fromJS({ listenerId: null, undo: [], redo: [] }));
};

clearHistory = function (historyBinding) {
  var listenerId = historyBinding.get('listenerId');
  historyBinding.withDisabledListener(listenerId, function () {
    historyBinding.atomically()
      .set('undo', Imm.List.of())
      .set('redo', Imm.List.of())
      .commit();
  });
};

destroyHistory = function (binding, notify) {
  var historyBinding = getHistoryBinding(binding);
  var listenerId = historyBinding.get('listenerId');
  binding.removeListener(listenerId);
  historyBinding.atomically().set(null).commit({ notify: notify });
};

listenForChanges = function (binding, historyBinding) {
  var listenerId = binding.addListener([], function (changes) {
    if (changes.isValueChanged()) {
      historyBinding.atomically().update(function (history) {
        var path = changes.getPath();
        var previousValue = changes.getPreviousValue(), newValue = binding.get();
        return history
          .update('undo', function (undo) {
            var pathAsArray = Binding.asArrayPath(path);
            return undo && undo.unshift(Imm.Map({
              newValue: pathAsArray.length ? newValue.getIn(pathAsArray) : newValue,
              oldValue: pathAsArray.length ? previousValue && previousValue.getIn(pathAsArray) : previousValue,
              path: path
            }));
          })
          .set('redo', Imm.List.of());
      }).commit({ notify: false });
    }
  });

  historyBinding.atomically().set('listenerId', listenerId).commit({ notify: false });
};

revertToStep = function (path, value, listenerId, binding) {
  binding.withDisabledListener(listenerId, function () {
    binding.set(path, value);
  });
};

revert = function (binding, fromBinding, toBinding, listenerId, valueProperty) {
  var from = fromBinding.get();
  if (!from.isEmpty()) {
    var step = from.get(0);

    fromBinding.atomically()
      .remove(0)
      .update(toBinding, function (to) {
        return to.unshift(step);
      })
      .commit({ notify: false });

    revertToStep(step.get('path'), step.get(valueProperty), listenerId, binding);
    return true;
  } else {
    return false;
  }
};


/**
 * @name History
 * @namespace
 * @classdesc Undo/redo history handling.
 */
var History = {

  /** Init history.
   * @param {Binding} binding binding
   * @memberOf History */
  init: function (binding) {
    var historyBinding = getHistoryBinding(binding);
    initHistory(historyBinding);
    listenForChanges(binding, historyBinding);
  },

  /** Clear history.
   * @param {Binding} binding binding
   * @memberOf History */
  clear: function (binding) {
    var historyBinding = getHistoryBinding(binding);
    clearHistory(historyBinding);
  },

  /** Clear history and shutdown listener.
   * @param {Binding} binding history binding
   * @param {Object} [options] options object
   * @param {Boolean} [options.notify=true] should listeners be notified
   * @memberOf History */
  destroy: function (binding, options) {
    var effectiveOptions = options || {};
    destroyHistory(binding, effectiveOptions.notify);
  },

  /** Check if history has undo information.
   * @param {Binding} binding binding
   * @returns {Boolean}
   * @memberOf History */
  hasUndo: function (binding) {
    var historyBinding = getHistoryBinding(binding);
    var undo = historyBinding.get('undo');
    return !!undo && !undo.isEmpty();
  },

  /** Check if history has redo information.
   * @param {Binding} binding binding
   * @returns {Boolean}
   * @memberOf History */
  hasRedo: function (binding) {
    var historyBinding = getHistoryBinding(binding);
    var redo = historyBinding.get('redo');
    return !!redo && !redo.isEmpty();
  },

  /** Revert to previous state.
   * @param {Binding} binding binding
   * @returns {Boolean} true, if binding has undo information
   * @memberOf History */
  undo: function (binding) {
    var historyBinding = getHistoryBinding(binding);
    var listenerId = historyBinding.get('listenerId');
    var undoBinding = historyBinding.sub('undo');
    var redoBinding = historyBinding.sub('redo');
    return revert(binding, undoBinding, redoBinding, listenerId, 'oldValue');
  },

  /** Revert to next state.
   * @param {Binding} binding binding
   * @returns {Boolean} true, if binding has redo information
   * @memberOf History */
  redo: function (binding) {
    var historyBinding = getHistoryBinding(binding);
    var listenerId = historyBinding.get('listenerId');
    var undoBinding = historyBinding.sub('undo');
    var redoBinding = historyBinding.sub('redo');
    return revert(binding, redoBinding, undoBinding, listenerId, 'newValue');
  }

};

module.exports = History;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Binding":1}],5:[function(require,module,exports){
(function (global){
/**
 * @name Morearty
 * @namespace
 * @classdesc Morearty main module. Exposes [createContext]{@link Morearty.createContext} function.
 */
var Imm      = (typeof window !== "undefined" ? window.Immutable : typeof global !== "undefined" ? global.Immutable : null);
var React    = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);
var Util     = require('./Util');
var Binding  = require('./Binding');
var History  = require('./History');
var Callback = require('./util/Callback');
var DOM      = require('./DOM');

var MERGE_STRATEGY = Object.freeze({
  OVERWRITE: 'overwrite',
  OVERWRITE_EMPTY: 'overwrite-empty',
  MERGE_PRESERVE: 'merge-preserve',
  MERGE_REPLACE: 'merge-replace'
});

var getBinding, bindingChanged, observedBindingsChanged, stateChanged;

getBinding = function (props, key) {
  var binding = props.binding;
  return key ? binding[key] : binding;
};

bindingChanged = function (context, currentBinding) {
  return (context._stateChanged && currentBinding.isChanged(context._previousState)) ||
         (context._metaChanged && context._metaBinding.sub(currentBinding.getPath()).isChanged(context._previousMetaState));
};

observedBindingsChanged = function (self) {
  return self.observedBindings &&
      !!Util.find(self.observedBindings, function (binding) {
        return bindingChanged(self.getMoreartyContext(), binding);
      });
};

stateChanged = function (self, currentBinding, previousBinding) {
  var observedChanged = observedBindingsChanged(self);
  if (!currentBinding && !observedChanged) {
    return false;
  } else {
    if (observedChanged) {
      return true;
    } else {
      var context = self.getMoreartyContext();
      if (currentBinding instanceof Binding) {
        return currentBinding !== previousBinding || bindingChanged(context, currentBinding);
      } else {
        if (context._stateChanged || context._metaChanged) {
          var keys = Object.keys(currentBinding);
          return !!Util.find(keys, function (key) {
            var binding = currentBinding[key];
            return binding && (binding !== previousBinding[key] || bindingChanged(context, binding));
          });
        } else {
          return false;
        }
      }
    }
  }
};

var merge = function (mergeStrategy, defaultState, stateBinding) {
  var tx = stateBinding.atomically();

  if (typeof mergeStrategy === 'function') {
    tx = tx.update(function (currentState) {
      return mergeStrategy(currentState, defaultState);
    });
  } else {
    switch (mergeStrategy) {
      case MERGE_STRATEGY.OVERWRITE:
        tx = tx.set(defaultState);
        break;
      case MERGE_STRATEGY.OVERWRITE_EMPTY:
        tx = tx.update(function (currentState) {
          var empty = Util.undefinedOrNull(currentState) ||
            (currentState instanceof Imm.Iterable && currentState.isEmpty());
          return empty ? defaultState : currentState;
        });
        break;
      case MERGE_STRATEGY.MERGE_PRESERVE:
        tx = tx.merge(true, defaultState);
        break;
      case MERGE_STRATEGY.MERGE_REPLACE:
        tx = tx.merge(false, defaultState);
        break;
      default:
        throw new Error('Invalid merge strategy: ' + mergeStrategy);
    }
  }

  tx.commit({ notify: false });
};

var getRenderRoutine = function (self) {
  var requestAnimationFrame = (typeof window !== 'undefined') && window.requestAnimationFrame;
  var fallback = function (f) { setTimeout(f, 1000 / 60); };

  if (self._options.requestAnimationFrameEnabled) {
    if (requestAnimationFrame) return requestAnimationFrame;
    else {
      console.warn('Morearty: requestAnimationFrame is not available, will render in setTimeout');
      return fallback;
    }
  } else {
    return fallback;
  }
};

/** Morearty context constructor.
 * @param {Binding} binding state binding
 * @param {Binding} metaBinding meta state binding
 * @param {Object} options options
 * @public
 * @class Context
 * @classdesc Represents Morearty context.
 * <p>Exposed modules:
 * <ul>
 *   <li>[Util]{@link Util};</li>
 *   <li>[Binding]{@link Binding};</li>
 *   <li>[History]{@link History};</li>
 *   <li>[Callback]{@link Callback};</li>
 *   <li>[DOM]{@link DOM}.</li>
 * </ul> */
var Context = function (binding, metaBinding, options) {
  /** @private */
  this._initialMetaState = metaBinding.get();
  /** @private */
  this._previousMetaState = null;
  /** @private */
  this._metaBinding = metaBinding;
  /** @protected
   * @ignore */
  this._metaChanged = false;

  /** @private */
  this._initialState = binding.get();
  /** @protected
   * @ignore */
  this._previousState = null;
  /** @private */
  this._stateBinding = binding;
  /** @protected
   * @ignore */
  this._stateChanged = false;

  /** @private */
  this._options = options;

  /** @private */
  this._renderQueued = false;
  /** @private */
  this._fullUpdateQueued = false;
  /** @protected
   * @ignore */
  this._fullUpdateInProgress = false;
};

Context.prototype = Object.freeze( /** @lends Context.prototype */ {
  /** Get state binding.
   * @return {Binding} state binding
   * @see Binding */
  getBinding: function () {
    return this._stateBinding;
  },

  /** Get meta binding.
   * @return {Binding} meta binding
   * @see Binding */
  getMetaBinding: function () {
    return this._metaBinding;
  },

  /** Get current state.
   * @return {Immutable.Map} current state */
  getCurrentState: function () {
    return this.getBinding().get();
  },

  /** Get previous state (before last render).
   * @return {Immutable.Map} previous state */
  getPreviousState: function () {
    return this._previousState;
  },

  /** Get current meta state.
   * @returns {Immutable.Map} current meta state */
  getCurrentMeta: function () {
    var metaBinding = this.getMetaBinding();
    return metaBinding ? metaBinding.get() : undefined;
  },

  /** Get previous meta state (before last render).
   * @return {Immutable.Map} previous meta state */
  getPreviousMeta: function () {
    return this._previousMetaState;
  },

  /** Create a copy of this context sharing same bindings and options.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @returns {Context} */
  copy: function (subpath) {
    return new Context(this._stateBinding.sub(subpath), this._metaBinding.sub(subpath), this._options);
  },

  /** Revert to initial state.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Object} [options] options object
   * @param {Boolean} [options.notify=true] should listeners be notified
   * @param {Boolean} [options.resetMeta=true] should meta state be reverted */
  resetState: function (subpath, options) {
    var args = Util.resolveArgs(
      arguments,
      function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?options'
    );

    var pathAsArray = args.subpath ? Binding.asArrayPath(args.subpath) : [];

    var tx = this.getBinding().atomically();
    tx.set(pathAsArray, this._initialState.getIn(pathAsArray));

    var effectiveOptions = args.options || {};
    if (effectiveOptions.resetMeta !== false) {
      tx.set(this.getMetaBinding(), pathAsArray, this._initialMetaState.getIn(pathAsArray));
    }

    tx.commit({ notify: effectiveOptions.notify });
  },

  /** Replace whole state with new value.
   * @param {Immutable.Map} newState new state
   * @param {Immutable.Map} [newMetaState] new meta state
   * @param {Object} [options] options object
   * @param {Boolean} [options.notify=true] should listeners be notified */
  replaceState: function (newState, newMetaState, options) {
    var args = Util.resolveArgs(
      arguments,
      'newState', function (x) { return x instanceof Imm.Map ? 'newMetaState' : null; }, '?options'
    );

    var effectiveOptions = args.options || {};

    var tx = this.getBinding().atomically();
    tx.set(newState);

    if (args.newMetaState) tx.set(this.getMetaBinding(), args.newMetaState);

    tx.commit({ notify: effectiveOptions.notify });
  },

  /** Check if binding value was changed on last re-render.
   * @param {Binding} binding binding
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} [compare] compare function, '===' for primitives / Immutable.is for collections by default */
  isChanged: function (binding, subpath, compare) {
    var args = Util.resolveArgs(
      arguments,
      'binding', function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?compare'
    );

    return args.binding.sub(args.subpath).isChanged(this._previousState, args.compare || Imm.is);
  },

  /** Initialize rendering.
   * @param {*} rootComp root application component */
  init: function (rootComp) {
    var self = this;
    var stop = false;
    var renderQueue = [];

    var transitionState = function () {
      var stateChanged, metaChanged;

      if (renderQueue.length === 1) {
        var singleFrame = renderQueue[0];

        stateChanged = singleFrame.stateChanged;
        metaChanged = singleFrame.metaChanged;

        if (stateChanged) self._previousState = singleFrame.previousState;
        if (metaChanged) self._previousMetaState = singleFrame.previousMetaState;
      } else {
        var elderStateChangedFrame = Util.find(renderQueue, function (q) { return q.stateChanged; });
        var elderMetaChangedFrame = Util.find(renderQueue, function (q) { return q.metaChanged; });

        stateChanged = !!elderStateChangedFrame;
        metaChanged = !!elderMetaChangedFrame;

        if (stateChanged) self._previousState = elderStateChangedFrame.previousState;
        if (metaChanged) self._previousMetaState = elderMetaChangedFrame.previousMetaState;
      }

      self._stateChanged = stateChanged;
      self._metaChanged = metaChanged;

      renderQueue = [];
    };

    var catchingRenderErrors = function (f) {
      try {
        if (rootComp.isMounted()) {
          f();
        }
      } catch (e) {
        if (self._options.stopOnRenderError) {
          stop = true;
        }

        console.error('Morearty: render error. ' + (stop ? 'Exiting.' : 'Continuing.'));
        console.error('Error details: %s', e.message, e.stack);
      }
    };

    var render = function () {
      transitionState();

      self._renderQueued = false;

      catchingRenderErrors(function () {
        if (self._fullUpdateQueued) {
          self._fullUpdateInProgress = true;
          rootComp.forceUpdate(function () {
            self._fullUpdateQueued = false;
            self._fullUpdateInProgress = false;
          });
        } else {
          rootComp.forceUpdate();
        }
      });
    };

    if (!self._options.renderOnce) {
      var renderRoutine = getRenderRoutine(self);

      var listenerId = self._stateBinding.addListener(function (changes) {
        if (stop) {
          self._stateBinding.removeListener(listenerId);
        } else {
          var stateChanged = changes.isValueChanged(), metaChanged = changes.isMetaChanged();

          if (stateChanged || metaChanged) {
            renderQueue.push({
              stateChanged: stateChanged,
              metaChanged: metaChanged,
              previousState: (stateChanged || null) && changes.getPreviousBackingValue(),
              previousMetaState: (metaChanged || null) && changes.getPreviousBackingMeta()
            });

            if (!self._renderQueued) {
              self._renderQueued = true;
              renderRoutine(render);
            }
          }
        }
      });
    }

    catchingRenderErrors(rootComp.forceUpdate.bind(rootComp));
  },

  /** Queue full update on next render. */
  queueFullUpdate: function () {
    this._fullUpdateQueued = true;
  },

  /** Create Morearty bootstrap component ready for rendering.
   * @param {*} rootComp root application component
   * @param {Object} [reactContext] custom React context (will be enriched with Morearty-specific data)
   * @return {*} Morearty bootstrap component */
  bootstrap: function (rootComp, reactContext) {
    var ctx = this;

    var effectiveReactContext = reactContext || {};
    effectiveReactContext.morearty = ctx;

    return React.createClass({
      displayName: 'Bootstrap',

      childContextTypes: {
        morearty: React.PropTypes.instanceOf(Context).isRequired
      },

      getChildContext: function () {
        return effectiveReactContext;
      },

      componentWillMount: function () {
        ctx.init(this);
      },

      render: function () {
        return React.createFactory(rootComp)({ binding: ctx.getBinding() });
      }
    });
  }

});

module.exports = {

  /** Binding module.
   * @memberOf Morearty
   * @see Binding */
  Binding: Binding,

  /** History module.
   * @memberOf Morearty
   * @see History */
  History: History,

  /** Util module.
   * @memberOf Morearty
   * @see Util */
  Util: Util,

  /** Callback module.
   * @memberOf Morearty
   * @see Callback */
  Callback: Callback,

  /** DOM module.
   * @memberOf Morearty
   * @see DOM */
  DOM: DOM,

  /** Merge strategy.
   * <p>Describes how existing state should be merged with component's default state on mount. Predefined strategies:
   * <ul>
   *   <li>OVERWRITE - overwrite current state with default state;</li>
   *   <li>OVERWRITE_EMPTY - overwrite current state with default state only if current state is null or empty collection;</li>
   *   <li>MERGE_PRESERVE - deep merge current state into default state;</li>
   *   <li>MERGE_REPLACE - deep merge default state into current state.</li>
   * </ul> */
  MergeStrategy: MERGE_STRATEGY,

  /** Morearty mixin.
   * @memberOf Morearty
   * @namespace
   * @classdesc Mixin */
  Mixin: {
     contextTypes: {
       morearty: React.PropTypes.instanceOf(Context).isRequired
     },

    /** Get Morearty context.
     * @returns {Context} */
    getMoreartyContext: function () {
      return this.context.morearty;
    },

    /** Get component state binding. Returns binding specified in component's binding attribute.
     * @param {String} [name] binding name (can only be used with multi-binding state)
     * @return {Binding|Object} component state binding */
    getBinding: function (name) {
      return getBinding(this.props, name);
    },

    /** Get default component state binding. Use this to get component's binding.
     * <p>Default binding is single binding for single-binding components or
     * binding with key 'default' for multi-binding components.
     * This method allows smooth migration from single to multi-binding components, e.g. you start with:
     * <pre><code>{ binding: foo }</code></pre>
     * or
     * <pre><code>{ binding: { default: foo } }</code></pre>
     * or even
     * <pre><code>{ binding: { any: foo } }</code></pre>
     * and add more bindings later:
     * <pre><code>{ binding: { default: foo, aux: auxiliary } }</code></pre>
     * This way code changes stay minimal.
     * @return {Binding} default component state binding */
    getDefaultBinding: function () {
      var binding = getBinding(this.props);
      if (binding instanceof Binding) {
        return binding;
      } else if (typeof binding === 'object') {
        var keys = Object.keys(binding);
        return keys.length === 1 ? binding[keys[0]] : binding['default'];
      }
    },

    /** Get component previous state value.
     * @param {String} [name] binding name (can only be used with multi-binding state)
     * @return {Binding} previous component state value */
    getPreviousState: function (name) {
      var ctx = this.getMoreartyContext();
      return getBinding(this.props, name).withBackingValue(ctx._previousState).get();
    },

    /** Consider specified binding for changes when rendering. Registering same binding twice has no effect.
     * @param {Binding} binding
     * @param {Function} [cb] optional callback receiving binding value
     * @return {*} undefined if cb argument is ommitted, cb invocation result otherwise */
    observeBinding: function (binding, cb) {
      if (!this.observedBindings) {
        this.observedBindings = [];
      }

      var bindingPath = binding.getPath();
      if (!Util.find(this.observedBindings, function (b) { return b.getPath() === bindingPath; })) {
        this.observedBindings.push(binding);
      }

      return cb ? cb(binding.get()) : undefined;
    },

    componentWillMount: function () {
      if (typeof this.getDefaultState === 'function') {
        var ctx = this.getMoreartyContext();
        var defaultState = this.getDefaultState();
        if (defaultState) {
          var binding = getBinding(this.props);
          var mergeStrategy =
            typeof this.getMergeStrategy === 'function' ? this.getMergeStrategy() : MERGE_STRATEGY.MERGE_PRESERVE;

          var immutableInstance = defaultState instanceof Imm.Iterable;

          if (binding instanceof Binding) {
            var effectiveDefaultState = immutableInstance ? defaultState : defaultState['default'];
            merge.call(ctx, mergeStrategy, effectiveDefaultState, binding);
          } else {
            var keys = Object.keys(binding);
            var defaultKey = keys.length === 1 ? keys[0] : 'default';
            var effectiveMergeStrategy = typeof mergeStrategy === 'string' ? mergeStrategy : mergeStrategy[defaultKey];

            if (immutableInstance) {
              merge.call(ctx, effectiveMergeStrategy, defaultState, binding[defaultKey]);
            } else {
              keys.forEach(function (key) {
                if (defaultState[key]) {
                  merge.call(ctx, effectiveMergeStrategy, defaultState[key], binding[key]);
                }
              });
            }
          }
        }
      }
    },

    shouldComponentUpdate: function (nextProps, nextState) {
      var self = this;
      var ctx = self.getMoreartyContext();
      var shouldComponentUpdate = function () {
        if (ctx._fullUpdateInProgress) {
          return true;
        } else {
          return stateChanged(self, getBinding(nextProps), getBinding(self.props));
        }
      };

      var shouldComponentUpdateOverride = self.shouldComponentUpdateOverride;
      return shouldComponentUpdateOverride ?
        shouldComponentUpdateOverride(shouldComponentUpdate, nextProps, nextState) :
        shouldComponentUpdate();
    },

    /** Add binding listener. Listener will be automatically removed on unmount
     * if this.shouldRemoveListeners() returns true.
     * @param {Binding} [binding] binding to attach listener to, default binding if omitted
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Function} cb function receiving changes descriptor
     * @return {String} listener id */
    addBindingListener: function (binding, subpath, cb) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return x instanceof Binding ? 'binding' : null; },
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; },
        'cb'
      );

      var defaultBinding = this.getDefaultBinding();

      if (defaultBinding) {
        var effectiveBinding = args.binding || defaultBinding;
        var listenerId = effectiveBinding.addListener(args.subpath, args.cb);
        defaultBinding.meta().atomically()
          .update('listeners', function (listeners) {
            return listeners ? listeners.push(listenerId) : Imm.List.of(listenerId);
          })
          .commit({ notify: false });

        return listenerId;
      } else {
        console.warn('Morearty: cannot attach binding listener to a component without default binding');
      }
    },

    componentWillUnmount: function () {
      if (typeof this.shouldRemoveListeners === 'function' && this.shouldRemoveListeners()) {
        var binding = this.getDefaultBinding();
        if (binding) {
          var listenersBinding = binding.meta('listeners');
          var listeners = listenersBinding.get();
          if (listeners) {
            listeners.forEach(binding.removeListener.bind(binding));
            listenersBinding.atomically().remove().commit({notify: false});
          }
        }
      }
    }
  },

  /** Create Morearty context.
   * @param {Object} [spec] spec object
   * @param {Immutable.Map|Object} [spec.initialState={}] initial state
   * @param {Immutable.Map|Object} [spec.initialMetaState={}] initial meta-state
   * @param {Object} [spec.options={}] options object
   * @param {Boolean} [spec.options.requestAnimationFrameEnabled=true] enable rendering in requestAnimationFrame
   * @param {Boolean} [spec.options.renderOnce=false]
   *                  ensure render is executed only once (useful for server-side rendering to save resources),
   *                  any further state updates are ignored
   * @param {Boolean} [spec.options.stopOnRenderError=false] stop on errors during render
   * @return {Context}
   * @memberOf Morearty */
  createContext: function (spec) {
    var initialState, initialMetaState, options;
    if (arguments.length <= 1) {
      var effectiveSpec = spec || {};
      initialState = effectiveSpec.initialState;
      initialMetaState = effectiveSpec.initialMetaState;
      options = effectiveSpec.options;
    } else {
      console.warn(
        'Passing multiple arguments to createContext is deprecated. Use single object form instead.'
      );

      initialState = arguments[0];
      initialMetaState = arguments[1];
      options = arguments[2];
    }

    var ensureImmutable = function (state) {
      return state instanceof Imm.Iterable ? state : Imm.fromJS(state);
    };

    var state = ensureImmutable(initialState || {});
    var metaState = ensureImmutable(initialMetaState || {});

    var metaBinding = Binding.init(metaState);
    var binding = Binding.init(state, metaBinding);

    var effectiveOptions = options || {};
    return new Context(binding, metaBinding, {
      requestAnimationFrameEnabled: effectiveOptions.requestAnimationFrameEnabled !== false,
      renderOnce: effectiveOptions.renderOnce || false,
      stopOnRenderError: effectiveOptions.stopOnRenderError || false
    });
  }

};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Binding":1,"./DOM":3,"./History":4,"./Util":6,"./util/Callback":7}],6:[function(require,module,exports){
/**
 * @name Util
 * @namespace
 * @classdesc Miscellaneous util functions.
 */

/* ---------------- */
/* Private helpers. */
/* ---------------- */

// resolveArgs

var isRequired, findTurningPoint, prepare;

isRequired = function (spec) {
  return typeof spec === 'string' && spec.charAt(0) !== '?';
};

findTurningPoint = function (arr, pred) {
  var first = pred(arr[0]);
  for (var i = 1; i < arr.length; i++) {
    if (pred(arr[i]) !== first) return i;
  }
  return null;
};

prepare = function (arr, splitAt) {
  return arr.slice(splitAt).reverse().concat(arr.slice(0, splitAt));
};

module.exports = {

  /** Identity function. Returns its first argument.
   * @param {*} x argument to return
   * @return {*} its first argument
   * @memberOf Util */
  identity: function (x) {
    return x;
  },

  /** 'Not' function returning logical not of its argument.
   * @param {*} x argument
   * @returns {*} !x
   * @memberOf Util */
  not: function (x) {
    return !x;
  },

  /** Create constant function (always returning x).
   * @param {*} x constant function return value
   * @return {Function} function always returning x
   * @memberOf Util */
  constantly: function (x) {
    return function () { return x; };
  },

  /** Execute function asynchronously.
   * @param {Function} f function */
  async: function (f) {
    setTimeout(f, 0);
  },

  /** Execute function f, then function cont. If f returns a promise, cont is executed when the promise resolves.
   * @param {Function} f function to execute first
   * @param {Function} cont function to execute after f
   * @memberOf Util */
  afterComplete: function (f, cont) {
    var result = f();
    if (result && typeof result.always === 'function') {
      result.always(cont);
    } else {
      cont();
    }
  },

  /** Check if argument is undefined or null.
   * @param {*} x argument to check
   * @returns {Boolean}
   * @memberOf Util */
  undefinedOrNull: function (x) {
    return x === undefined || x === null;
  },

  /** Get values of object properties.
   * @param {Object} obj object
   * @return {Array} object's properties values
   * @memberOf Util */
  getPropertyValues: function (obj) {
    return Object.keys(obj).map(function (key) { return obj[key]; });
  },

  /** Find array element satisfying the predicate.
   * @param {Array} arr array
   * @param {Function} pred predicate accepting current value, index, original array
   * @return {*} found value or null
   * @memberOf Util */
  find: function (arr, pred) {
    for (var i = 0; i < arr.length; i++) {
      var value = arr[i];
      if (pred(value, i, arr)) {
        return value;
      }
    }
    return null;
  },

  /** Resolve arguments. Acceptable spec formats:
   * <ul>
   *   <li>'foo' - required argument 'foo';</li>
   *   <li>'?foo' - optional argument 'foo';</li>
   *   <li>function (arg) { return arg instanceof MyClass ? 'foo' : null; } - checked optional argument.</li>
   * </ul>
   * Specs can only switch optional flag once in the list. This invariant isn't checked by the method,
   * its violation will produce indeterminate results.
   * <p>Optional arguments are matched in order, left to right. Provide check function if you need to allow to skip
   * one optional argument and use sebsequent optional arguments instead.
   * <p>Returned arguments descriptor contains argument names mapped to resolved values.
   * @param {Array} args arguments 'array'
   * @param {*} var_args arguments specs as a var-args list or array, see method description
   * @returns {Object} arguments descriptor object
   * @memberOf Util */
  resolveArgs: function (args, var_args) {
    var result = {};
    if (arguments.length > 1) {
      var specs = Array.isArray(var_args) ? var_args : Array.prototype.slice.call(arguments, 1);
      var preparedSpecs, preparedArgs;
      var turningPoint;

      if (isRequired(specs[0]) || !(turningPoint = findTurningPoint(specs, isRequired))) {
        preparedSpecs = specs;
        preparedArgs = args;
      } else {
        var effectiveArgs = Array.isArray(args) ? args : Array.prototype.slice.call(args);
        preparedSpecs = prepare(specs, turningPoint);
        preparedArgs = prepare(effectiveArgs, effectiveArgs.length - (specs.length - turningPoint));
      }

      for (var specIndex = 0, argIndex = 0;
           specIndex < preparedSpecs.length && argIndex < preparedArgs.length; specIndex++) {
        var spec = preparedSpecs[specIndex], arg = preparedArgs[argIndex];
        if (isRequired(spec)) {
          result[spec] = arg;
          argIndex++;
        } else {
          var name = typeof spec === 'function' ? spec(arg) : (spec.charAt(0) !== '?' ? spec : spec.substring(1));
          if (name || arg === undefined) {
            result[name] = arg;
            argIndex++;
          }
        }
      }
    }

    return result;
  },

  /** Check if argument can be valid binding subpath.
   * @param {*} x
   * @returns {Boolean}
   * @memberOf Util */
  canRepresentSubpath: function (x) {
    var type = typeof x;
    return type === 'string' || type === 'number' || Array.isArray(x);
  },

  /** ES6 Object.assign.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign */
  assign: function (target, firstSource) {
    if (target === undefined || target === null) {
      throw new TypeError('Cannot convert first argument to object');
    }

    var to = Object(target);

    var hasPendingException = false;
    var pendingException;

    for (var i = 1; i < arguments.length; i++) {
      var nextSource = arguments[i];
      if (nextSource === undefined || nextSource === null)
        continue;

      var keysArray = Object.keys(Object(nextSource));
      for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
        var nextKey = keysArray[nextIndex];
        try {
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (desc !== undefined && desc.enumerable)
            to[nextKey] = nextSource[nextKey];
        } catch (e) {
          if (!hasPendingException) {
            hasPendingException = true;
            pendingException = e;
          }
        }
      }

      if (hasPendingException)
        throw pendingException;
    }
    return to;
  }

};

},{}],7:[function(require,module,exports){
/**
 * @name Callback
 * @namespace
 * @classdesc Miscellaneous callback util functions.
 */
var Util = require('../Util');

module.exports = {

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
    };
  },

  /** Create callback used to delete binding value on an event.
   * @param {Binding} binding binding
   * @param {String|String[]} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} [pred] predicate
   * @returns {Function} callback
   * @memberOf Callback */
  remove: function (binding, subpath, pred) {
    var args = Util.resolveArgs(
      arguments,
      'binding', function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?pred'
    );

    return function (event) {
      var value = event.target.value;
      if (!args.pred || args.pred(value)) {
        binding.remove(args.subpath);
      }
    };
  },

  /** Create callback invoked when specified key combination is pressed.
   * @param {Function} cb callback
   * @param {String|Array} key key
   * @param {Boolean} [shiftKey] shift key flag
   * @param {Boolean} [ctrlKey] ctrl key flag
   * @returns {Function} callback
   * @memberOf Callback */
  onKey: function (cb, key, shiftKey, ctrlKey) {
    var effectiveShiftKey = shiftKey || false;
    var effectiveCtrlKey = ctrlKey || false;
    return function (event) {
      var keyMatched = typeof key === 'string' ?
        event.key === key :
        Util.find(key, function (k) { return k === event.key; });

      if (keyMatched && event.shiftKey === effectiveShiftKey && event.ctrlKey === effectiveCtrlKey) {
        cb(event);
      }
    };
  },

  /** Create callback invoked when enter key is pressed.
   * @param {Function} cb callback
   * @returns {Function} callback
   * @memberOf Callback */
  onEnter: function (cb) {
    return this.onKey(cb, 'Enter');
  },

  /** Create callback invoked when escape key is pressed.
   * @param {Function} cb callback
   * @returns {Function} callback
   * @memberOf Callback */
  onEscape: function (cb) {
    return this.onKey(cb, 'Escape');
  }

};

module.exports['delete'] = module.exports.remove;

},{"../Util":6}]},{},[5])(5)
});