!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Morearty=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var Util   = require('./Util');
var Holder = require('./util/Holder');
var Imm = (typeof window !== "undefined" ? window.Immutable : typeof global !== "undefined" ? global.Immutable : null);

/* ---------------- */
/* Private helpers. */
/* ---------------- */

var copyBinding, getBackingValue, setBackingValue;

copyBinding = function (binding, backingValueHolder, path) {
  return new Binding(
    backingValueHolder,
    binding._regCountHolder, path, binding._listeners, binding._listenerNestingLevelHolder, binding._cache
  );
};

getBackingValue = function (binding) {
  return binding._backingValueHolder.getValue();
};

setBackingValue = function (binding, newBackingValue) {
  binding._backingValueHolder.setValue(newBackingValue);
};

var EMPTY_PATH, PATH_SEPARATOR, getPathElements, asArrayPath, asStringPath, joinPaths;

EMPTY_PATH = [];
PATH_SEPARATOR = '.';

getPathElements = function (path) {
  return path ? path.split(PATH_SEPARATOR).map(function (s) { return isNaN(s) ? s : +s; }) : [];
};

asArrayPath = function (path) {
  switch (typeof path) {
    case 'string':
      return getPathElements(path);
    case 'number':
      return [path];
    default:
      return Util.undefinedOrNull(path) ? [] : path;
  }
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

joinPaths = function (path1, path2) {
  return path1.concat(path2);
};

var throwPathMustPointToKey, getValueAtPath, updateBackingValue, updateValue, unsetValue, clear;

throwPathMustPointToKey = function () {
  throw new Error('Path must point to a key');
};

getValueAtPath = function (backingValue, path) {
  return path.length > 0 ? backingValue.getIn(path) : backingValue;
};

updateBackingValue = function (binding, f, subpath) {
  var effectivePath = joinPaths(binding._path, subpath);
  var newBackingValue = f(getBackingValue(binding), effectivePath);
  setBackingValue(binding, newBackingValue);
  return effectivePath;
};

updateValue = function (binding, update, subpath) {
  return updateBackingValue(
    binding,
    function (backingValue, effectivePath) {
      var setOrUpdate = function (coll, key) {
        if (coll) {
          return coll.has(key) ? coll.update(key, update) : coll.set(key, update());
        } else {
          return Imm.Map.empty().set(key, update());
        }
      };

      var len = effectivePath.length;
      switch (len) {
        case 0:
          return update(backingValue);
        case 1:
          return setOrUpdate(backingValue, effectivePath[0]);
        default:
          var pathTo = effectivePath.slice(0, len - 1);
          var key = effectivePath[len - 1];
          return backingValue.updateIn(pathTo, function (coll) {
            return setOrUpdate(coll, key);
          });
      }
    },
    subpath
  );
};

unsetValue = function (binding, subpath) {
  var effectivePath = joinPaths(binding._path, subpath);
  var backingValue = getBackingValue(binding);

  var newBackingValue;
  var len = effectivePath.length;
  var pathTo = effectivePath.slice(0, len - 1);

  var deleteValue = function (coll, key) {
    if (coll instanceof Imm.Vector) {
      return coll.splice(key, 1).toVector();
    } else {
      return coll && coll.delete(key);
    }
  };

  switch (len) {
    case 0:
      throwPathMustPointToKey();
      break;
    case 1:
      newBackingValue = deleteValue(backingValue, effectivePath[0]);
      break;
    default:
      var key = effectivePath[len - 1];
      newBackingValue = backingValue.has(pathTo[0]) && backingValue.updateIn(pathTo, function (coll) {
        return deleteValue(coll, key);
      }) || backingValue;
  }

  setBackingValue(binding, newBackingValue);
  return pathTo;
};

clear = function (value) {
  return value instanceof Imm.Sequence ? value.clear() : null;
};

var ensuringNestingLevel, getRelativePath, notifySamePathListeners, notifyGlobalListeners, isPathAffected, notifyNonGlobalListeners, notifyAllListeners;

ensuringNestingLevel = function (self, f) {
  self._listenerNestingLevelHolder.updateValue(function (x) { return x + 1; });
  f(self._listenerNestingLevelHolder.getValue());
  self._listenerNestingLevelHolder.updateValue(function (x) { return x - 1; });
};

getRelativePath = function (listenerPathAsArray, absolutePathAsArray) {
  if (listenerPathAsArray.length === absolutePathAsArray.length) {
    return '';
  } else {
    return asStringPath(absolutePathAsArray.slice(listenerPathAsArray.length));
  }
};

notifySamePathListeners = function (samePathListeners, listenerPath, pathAsString, newBackingValue, oldBackingValue) {
  var listenerPathAsArray = asArrayPath(listenerPath);
  var absolutePathAsArray = asArrayPath(pathAsString);
  var newValue = getValueAtPath(newBackingValue, listenerPathAsArray);
  var oldValue = getValueAtPath(oldBackingValue, listenerPathAsArray);
  if (newValue !== oldValue) {
    Util.getPropertyValues(samePathListeners).forEach(function (listenerDescriptor) {
      if (!listenerDescriptor.disabled) {
        listenerDescriptor.cb(
          newValue, oldValue, pathAsString, getRelativePath(listenerPathAsArray, absolutePathAsArray));
      }
    });
  }
};

notifyGlobalListeners = function (listeners, path, newBackingValue, oldBackingValue, listenerNestingLevel) {
  if (listenerNestingLevel < 2) {
    var globalListeners = listeners[''];
    if (globalListeners) {
      notifySamePathListeners(globalListeners, EMPTY_PATH, asStringPath(path), newBackingValue, oldBackingValue);
    }
  }
};

isPathAffected = function (listenerPath, changedPath) {
  return Util.startsWith(changedPath, listenerPath) || Util.startsWith(listenerPath, changedPath);
};

notifyNonGlobalListeners = function (listeners, path, newBackingValue, oldBackingValue) {
  var pathAsString = asStringPath(path);
  Object.keys(listeners).filter(Util.identity).forEach(function (listenerPath) {
    if (isPathAffected(listenerPath, pathAsString)) {
      notifySamePathListeners(listeners[listenerPath], listenerPath, pathAsString, newBackingValue, oldBackingValue);
    }
  });
};

notifyAllListeners = function (self, path, oldBackingValue) {
  ensuringNestingLevel(self, function (nestingLevel) {
    var newBackingValue = getBackingValue(self);
    notifyNonGlobalListeners(self._listeners, path, newBackingValue, oldBackingValue);
    notifyGlobalListeners(self._listeners, path, newBackingValue, oldBackingValue, nestingLevel);
  });
};

var findSamePathListeners, setListenerDisabled;

findSamePathListeners = function (binding, listenerId) {
  return Util.find(
    Util.getPropertyValues(binding._listeners),
    function (samePathListeners) { return !!samePathListeners[listenerId]; }
  );
};

setListenerDisabled = function (binding, listenerId, disabled) {
  var samePathListeners = findSamePathListeners(binding, listenerId);
  if (samePathListeners) {
    samePathListeners[listenerId].disabled = disabled;
  }
};

/** Binding constructor.
 * @param {Holder} backingValueHolder backing value holder
 * @param {Holder} [regCountHolder] registration count holder
 * @param {String[]} [path] binding path, empty array if omitted
 * @param {Object} [listeners] change listeners, empty if omitted
 * @param {Holder} [listenerNestingLevelHolder] listener nesting level holder
 * @param {Object} [cache] bindings cache
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
 * </ul> */
var Binding = function (backingValueHolder, regCountHolder, path, listeners, listenerNestingLevelHolder, cache) {
  /** @private */
  this._backingValueHolder = backingValueHolder;
  /** @private */
  this._regCountHolder = regCountHolder || Holder.init(0);
  /** @private */
  this._path = path || EMPTY_PATH;
  /** @protected */
  this._listeners = listeners || {};
  /** @private */
  this._listenerNestingLevelHolder = listenerNestingLevelHolder || Holder.init(0);
  /** @private */
  this._cache = cache || {};
};

/* ---------------- */
/* Static helpers. */
/* ---------------- */

/** Create new binding with empty listeners set.
 * @param {IMap} [backingValue] backing value
 * @return {Binding} fresh binding instance */
Binding.init = function (backingValue) {
  return new Binding(Holder.init(backingValue || Imm.Map.empty()));
};

/** Convert string path to array path.
 * @param {String} pathAsString path as string */
Binding.asArrayPath = function (pathAsString) {
  return asArrayPath(pathAsString);
};

/** Convert array path to string path.
 * @param {String[]} pathAsAnArray path as an array */
Binding.asStringPath = function (pathAsAnArray) {
  return asStringPath(pathAsAnArray);
};

Binding.prototype = Object.freeze( /** @lends Binding.prototype */ {
  /** Update backing value.
   * @param {IMap} newBackingValue new backing value
   * @return {Binding} new binding instance, original is unaffected */
  withBackingValue: function (newBackingValue) {
    return copyBinding(this, Holder.init(newBackingValue), this._path);
  },

  /** Mutate backing value.
   * @param {IMap} newBackingValue new backing value
   * @param {Boolean} [notifyListeners] should listeners be notified;
   *                                  true by default, set to false to disable notification */
  setBackingValue: function (newBackingValue, notifyListeners) {
    var oldBackingValue = getBackingValue(this);
    this._backingValueHolder.setValue(newBackingValue);

    if (notifyListeners !== false) {
      notifyAllListeners(this, EMPTY_PATH, oldBackingValue);
    }
  },

  /** Get binding value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {*} value at path or null */
  val: function (subpath) {
    return getValueAtPath(getBackingValue(this), joinPaths(this._path, asArrayPath(subpath)));
  },

  /** Bind to subpath. Both bindings share the same backing value. Changes are mutually visible.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {Binding} new binding instance, original is unaffected */
  sub: function (subpath) {
    var absolutePath = joinPaths(this._path, asArrayPath(subpath));
    if (absolutePath.length > 0) {
      var absolutePathAsString = asStringPath(absolutePath);
      var cached = this._cache[absolutePathAsString];

      if (cached) {
        return cached;
      } else {
        var subBinding = copyBinding(this, this._backingValueHolder, absolutePath);
        this._cache[absolutePathAsString] = subBinding;
        return subBinding;
      }
    } else {
      return this;
    }
  },

  /** Update binding value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} update update function
   * @return {Binding} this binding */
  update: function (subpath, update) {
    var args = Util.resolveArgs(arguments, '?subpath', 'update');
    var oldBackingValue = getBackingValue(this);
    var affectedPath = updateValue(this, args.update, asArrayPath(args.subpath));
    notifyAllListeners(this, affectedPath, oldBackingValue);
    return this;
  },

  /** Set binding value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {*} newValue new value
   * @return {Binding} this binding */
  set: function (subpath, newValue) {
    var args = Util.resolveArgs(arguments, '?subpath', 'newValue');
    return this.update(args.subpath, Util.constantly(args.newValue));
  },

  /** Delete value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {Binding} this binding */
  delete: function (subpath) {
    var oldBackingValue = getBackingValue(this);
    var affectedPath = unsetValue(this, asArrayPath(subpath));
    notifyAllListeners(this, affectedPath, oldBackingValue);
    return this;
  },

  /** Deep merge values.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Boolean} [preserve] preserve existing values when merging, false by default
   * @param {*} newValue new value
   * @return {Binding} this binding */
  merge: function (subpath, preserve, newValue) {
    var args = Util.resolveArgs(
      arguments,
      function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; },
      '?preserve',
      'newValue'
    );
    return this.update(args.subpath, function (value) {
      var effectiveNewValue = args.newValue;
      if (Util.undefinedOrNull(value)) {
        return effectiveNewValue;
      } else {
        if (value instanceof Imm.Sequence && effectiveNewValue instanceof Imm.Sequence) {
          return args.preserve ? effectiveNewValue.mergeDeep(value) : value.mergeDeep(effectiveNewValue);
        } else {
          return args.preserve ? value : effectiveNewValue;
        }
      }
    });
  },

  /** Clear nested collection. Does '.empty()' on Immutable values, nullifies otherwise.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {Binding} this binding */
  clear: function (subpath) {
    var subpathAsArray = asArrayPath(subpath);
    if (this.val(subpathAsArray)) this.update(subpathAsArray, clear);
    return this;
  },

  /** Add change listener.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} cb function of (newValue, oldValue, absolutePath, relativePath)
   * @return {String} unique id which should be used to un-register the listener */
  addListener: function (subpath, cb) {
    var args = Util.resolveArgs(
      arguments, function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, 'cb'
    );

    var listenerId = 'reg' + this._regCountHolder.updateValue(function (count) { return count + 1; });
    var pathAsString = asStringPath(joinPaths(this._path, asArrayPath(args.subpath || '')));
    var samePathListeners = this._listeners[pathAsString];
    var listenerDescriptor = { cb: args.cb, disabled: false };
    if (samePathListeners) {
      samePathListeners[listenerId] = listenerDescriptor;
    } else {
      var listeners = {};
      listeners[listenerId] = listenerDescriptor;
      this._listeners[pathAsString] = listeners;
    }
    return listenerId;
  },

  /** Add change listener listening from the root.
   * @param {Function} cb function of (newValue, oldValue, absolutePath, relativePath)
   * @return {String} unique id which should be used to un-register the listener */
  addGlobalListener: function (cb) {
    return this.addListener(EMPTY_PATH, cb);
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
    return new TransactionContext(this, [], []);
  }
});

/** Transaction context constructor.
 * @param {Binding} binding binding
 * @param {Function[]} updates queued updates
 * @param {Function[]} removals queued removals
 * @public
 * @class TransactionContext
 * @classdesc Transaction context. */
var TransactionContext = function (binding, updates, removals) {
  /** @private */
  this._binding = binding;
  /** @private */
  this._updates = updates;
  /** @private */
  this._removals = removals;
  /** @private */
  this._committed = false;
};

TransactionContext.prototype = (function () {

  var addUpdate, addRemoval, hasChanges, areSiblings, filterRedundantPaths, commitSilently;

  addUpdate = function (self, binding, update, subpath) {
    var result = self._updates.slice(0);
    result.push({ binding: binding, update: update, subpath: subpath });
    return result;
  };

  addRemoval = function (self, binding, subpath) {
    var result = self._removals.slice(0);
    result.push({ binding: binding, subpath: subpath });
    return result;
  };

  hasChanges = function (self) {
    return self._updates.length > 0 || self._removals.length > 0;
  };

  areSiblings = function (path1, path2) {
    var path1Length = path1.length, path2Length = path2.length;
    return path1Length === path2Length && (
      path1Length === 1 || path1[path1Length - 2] === path2[path1Length - 2]
    );
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
        if (!Util.startsWith(currentPathAsString, previousPathAsString)) {
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
      var updatedPaths = self._updates.map(function (o) { return updateValue(o.binding, o.update, o.subpath); });
      var removedPaths = self._removals.map(function (o) { return unsetValue(o.binding, o.subpath); });
      self._committed = true;
      return updatedPaths.concat(removedPaths);
    } else {
      throw new Error('Transaction already committed');
    }
  };

  return Object.freeze( /** @lends TransactionContext.prototype */ {

    /** Update binding value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Binding} [binding] binding to apply update to, latest used by default
     * @param {Function} update update function
     * @return {TransactionContext} updated transaction context carrying latest binding used */
    update: function (subpath, binding, update) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?binding', 'update'
      );
      var effectiveBinding = args.binding || this._binding;
      var updates = addUpdate(this, effectiveBinding, args.update, asArrayPath(args.subpath));
      return new TransactionContext(effectiveBinding, updates, this._removals);
    },

    /** Set binding value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Binding} [binding] binding to apply update to, latest used by default
     * @param {*} newValue new value
     * @return {TransactionContext} updated transaction context carrying latest binding used */
    set: function (subpath, binding, newValue) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?binding', 'newValue'
      );
      return this.update(args.subpath, args.binding, Util.constantly(args.newValue));
    },

    /** Remove value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Binding} [binding] binding to apply update to, latest used by default
     * @return {TransactionContext} updated transaction context carrying latest binding used */
    delete: function (subpath, binding) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?binding'
      );
      var effectiveBinding = args.binding || this._binding;
      var removals = addRemoval(this, effectiveBinding, asArrayPath(args.subpath));
      return new TransactionContext(effectiveBinding, this._updates, removals);
    },

    /** Deep merge values.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Boolean} [preserve] preserve existing values when merging, false by default
     * @param {Binding} [binding] binding to apply update to, latest used by default
     * @param {*} newValue new value */
    merge: function (subpath, preserve, binding, newValue) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; },
        function (x) { return typeof x === 'boolean' ? 'preserve' : null; },
        '?binding',
        'newValue'
      );
      return this.update(args.subpath, args.binding, function (value) {
        var effectiveNewValue = args.newValue;
        if (Util.undefinedOrNull(value)) {
          return effectiveNewValue;
        } else {
          if (value instanceof Imm.Sequence && effectiveNewValue instanceof Imm.Sequence) {
            return args.preserve ? effectiveNewValue.mergeDeep(value) : value.mergeDeep(effectiveNewValue);
          } else {
            return args.preserve ? value : effectiveNewValue;
          }
        }
      });
    },

    /** Clear collection or nullify nested value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Binding} [binding] binding to apply update to, latest used by default */
    clear: function (subpath, binding) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?binding'
      );
      var effectiveBinding = args.binding || this._binding;
      var updates = addUpdate(
        this,
        effectiveBinding,
        function (value) { return clear(value); },
        asArrayPath(args.subpath)
      );
      return new TransactionContext(effectiveBinding, updates, this._removals);
    },

    /** Commit transaction (write changes and notify listeners).
     * @param {Boolean} [notifyListeners] should listeners be notified;
     *                                    true by default, set to false to disable notification
     * @return {String[]} array of affected paths */
    commit: function (notifyListeners) {
      if (hasChanges(this)) {
        var binding = this._binding;
        var oldBackingValue = getBackingValue(binding);
        var affectedPaths = commitSilently(this);
        var newBackingValue = getBackingValue(binding);

        if (notifyListeners !== false) {
          if (newBackingValue !== oldBackingValue) {
            var filteredPaths = filterRedundantPaths(affectedPaths);
            ensuringNestingLevel(binding, function (nestingLevel) {
              var listeners = binding._listeners;
              filteredPaths.forEach(function (path) {
                notifyNonGlobalListeners(listeners, path, newBackingValue, oldBackingValue);
              });
              notifyGlobalListeners(listeners, filteredPaths[0], newBackingValue, oldBackingValue, nestingLevel);
            }.bind(binding));
            return affectedPaths;
          } else {
            return [];
          }
        } else {
          return affectedPaths;
        }

      } else {
        return [];
      }
    }

  });
})();

module.exports = Binding;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Util":5,"./util/Holder":7}],2:[function(require,module,exports){
(function (global){
var React = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);

var _ = React.DOM;

var wrapComponent = function (comp, displayName) {
  return React.createClass({

    getDisplayName: function () {
      return displayName;
    },

    getInitialState: function () {
      return { value: this.props.value };
    },

    onChange: function (event) {
      var handler = this.props.onChange;
      if (handler) {
        var result = handler(event);
        this.setState({ value: event.target.value });
        return result;
      }
    },

    componentWillReceiveProps: function (newProps) {
      this.setState({ value: newProps.value });
    },

    render: function () {
      return this.transferPropsTo(comp({
        value: this.state.value,
        onChange: this.onChange,
        children: this.props.children
      }));
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
},{}],3:[function(require,module,exports){
(function (global){
var Imm = (typeof window !== "undefined" ? window.Immutable : typeof global !== "undefined" ? global.Immutable : null);
var Binding = require('./Binding');

var initHistory, clearHistory, destroyHistory, listenForChanges, revertToStep, revert;

initHistory = function (historyBinding) {
  historyBinding.set(Imm.fromJS({ listenerId: null, undo: [], redo: [] }));
};

clearHistory = function (historyBinding) {
  historyBinding.atomically()
    .set('undo', Imm.Vector.empty())
    .set('redo', Imm.Vector.empty())
    .commit();
};

destroyHistory = function (historyBinding, notifyListeners) {
  var listenerId = historyBinding.val('listenerId');
  historyBinding.removeListener(listenerId);
  historyBinding.atomically().set(null).commit(notifyListeners);
};

listenForChanges = function (binding, historyBinding) {
  var listenerId = binding.addListener([], function (newValue, oldValue, absolutePath, relativePath) {
    historyBinding.atomically().update(function (history) {
      return history
        .update('undo', function (undo) {
          var pathAsArray = Binding.asArrayPath(relativePath);
          return undo && undo.unshift(Imm.Map({
            newValue: pathAsArray.length ? newValue.getIn(pathAsArray) : newValue,
            oldValue: pathAsArray.length ? oldValue.getIn(pathAsArray) : oldValue,
            path: relativePath
          }));
        })
        .set('redo', Imm.Vector.empty());
    }).commit(false);
  });

  historyBinding.atomically().set('listenerId', listenerId).commit(false);
};

revertToStep = function (path, value, listenerId, dataBinding) {
  dataBinding.withDisabledListener(listenerId, function () {
    dataBinding.set(path, value);
  });
};

revert = function (dataBinding, fromBinding, toBinding, listenerId, valueProperty) {
  var from = fromBinding.val();
  if (from.length > 0) {
    var step = from.get(0);

    fromBinding.atomically()
      .delete(0)
      .update(toBinding, function (to) {
        return to.unshift(step);
      })
      .commit(false);

    revertToStep(step.get('path'), step.get(valueProperty), listenerId, dataBinding);
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
   * @param {Binding} dataBinding data binding
   * @param {Binding} historyBinding history binding
   * @memberOf History */
  init: function (dataBinding, historyBinding) {
    initHistory(historyBinding);
    listenForChanges(dataBinding, historyBinding);
  },

  /** Clear history.
   * @param {Binding} historyBinding history binding
   * @memberOf History */
  clear: function (historyBinding) {
    clearHistory(historyBinding);
  },

  /** Clear history and shutdown listener.
   * @param {Binding} historyBinding history binding
   * @param {Boolean} notifyListeners should listeners be notified;
   *                                  true by default, set to false to disable notification
   * @memberOf History */
  destroy: function (historyBinding, notifyListeners) {
    destroyHistory(historyBinding, notifyListeners);
  },

  /** Check if history has undo information.
   * @param {Binding} historyBinding history binding
   * @returns {Boolean}
   * @memberOf History */
  hasUndo: function (historyBinding) {
    var undo = historyBinding.val('undo');
    return !!undo && undo.length > 0;
  },

  /** Check if history has redo information.
   * @param {Binding} historyBinding history binding
   * @returns {Boolean}
   * @memberOf History */
  hasRedo: function (historyBinding) {
    var redo = historyBinding.val('redo');
    return !!redo && redo.length > 0;
  },

  /** Revert to previous state.
   * @param {Binding} dataBinding data binding
   * @param {Binding} historyBinding history binding
   * @returns {Boolean} true, if binding has undo information
   * @memberOf History */
  undo: function (dataBinding, historyBinding) {
    var listenerId = historyBinding.val('listenerId');
    var undoBinding = historyBinding.sub('undo');
    var redoBinding = historyBinding.sub('redo');
    return revert(dataBinding, undoBinding, redoBinding, listenerId, 'oldValue');
  },

  /** Revert to next state.
   * @param {Binding} dataBinding data binding
   * @param {Binding} historyBinding history binding
   * @returns {Boolean} true, if binding has redo information
   * @memberOf History */
  redo: function (dataBinding, historyBinding) {
    var listenerId = historyBinding.val('listenerId');
    var undoBinding = historyBinding.sub('undo');
    var redoBinding = historyBinding.sub('redo');
    return revert(dataBinding, redoBinding, undoBinding, listenerId, 'newValue');
  }

};

module.exports = History;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Binding":1}],4:[function(require,module,exports){
(function (global){
/**
 * @name Morearty
 * @namespace
 * @classdesc Morearty main module. Exposes [createContext]{@link Morearty.createContext} function.
 */
var Util     = require('./Util');
var Binding  = require('./Binding');
var History  = require('./History');
var Callback = require('./util/Callback');
var DOM      = require('./DOM');
var Immutable = (typeof window !== "undefined" ? window.Immutable : typeof global !== "undefined" ? global.Immutable : null);
var Imm = Immutable;

var MERGE_STRATEGY = Object.freeze({
  OVERWRITE: 'overwrite',
  OVERWRITE_EMPTY: 'overwrite-empty',
  MERGE_PRESERVE: 'merge-preserve',
  MERGE_REPLACE: 'merge-replace'
});

var getBinding, bindingChanged, stateChanged;

getBinding = function (context, comp, key) {
  if (context) {
    var binding = comp.props[context._configuration.bindingPropertyName];
    return key ? binding[key] : binding;
  } else {
    throw new Error('Context is missing.');
  }
};

bindingChanged = function (binding, previousState) {
  var currentValue = binding.val();
  var previousValue = previousState ? binding.withBackingValue(previousState).val() : null;
  return currentValue !== previousValue;
};

stateChanged = function (context, state) {
  var previousState = context._previousState;
  if (state instanceof Binding) {
    return bindingChanged(state, previousState);
  } else {
    var bindings = Util.getPropertyValues(state);
    return !!Util.find(bindings, function (binding) {
      return binding && bindingChanged(binding, previousState);
    });
  }
};

var merge = function (mergeStrategy, defaultState, stateBinding) {
  var context = this;

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
            (currentState instanceof Imm.Sequence && currentState.count() === 0);
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

  tx.commit(false);
};

/** Morearty context constructor.
 * @param {IMap} initialState initial state
 * @param {Object} configuration configuration
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
 * </ul>
 */
var Context = function (initialState, configuration) {
  /** @private */
  this._initialState = initialState;

  /** State before current render.
   * @protected
   * @ignore */
  this._previousState = null;
  /** State during current render.
   * @private */
  this._currentState = initialState;
  /** @private */
  this._currentStateBinding = Binding.init(initialState);

  /** @private */
  this._configuration = configuration;

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
    return this._currentStateBinding;
  },

  /** Get current state.
   * @return {IMap} current state */
  getCurrentState: function () {
    return this.getBinding().val();
  },

  /** Get previous state.
   * @return {IMap} previous state */
  getPreviousState: function () {
    return this._previousState;
  },

  /** Revert to initial state.
   * @param {Boolean} [notifyListeners] should listeners be notified;
   *                                    true by default, set to false to disable notification
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers */
  resetState: function (notifyListeners, subpath) {
    var args = Util.resolveArgs(
      arguments,
      function (x) { return typeof x === 'boolean' ? 'notifyListeners' : null; }, '?subpath'
    );
    var notify = args.notifyListeners !== false;
    if (args.subpath) {
      var pathAsArray = Binding.asArrayPath(args.subpath);
      this.getBinding().atomically().set(pathAsArray, this._initialState.getIn(pathAsArray)).commit(notify);
    } else {
      this._currentStateBinding.setBackingValue(this._initialState, notify);
    }
  },

  /** Replace whole state with new value.
   * @param {IMap} newState
   * @param {Boolean} [notifyListeners] should listeners be notified;
   *                                    true by default, set to false to disable notification */
  replaceState: function (newState, notifyListeners) {
    this._currentStateBinding.setBackingValue(newState, notifyListeners);
  },

  /** Check if binding value was changed on last re-render.
   * @param {Binding} binding binding
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} [compare] compare function, '===' by default */
  isChanged: function (binding, subpath, compare) {
    var args = Util.resolveArgs(
      arguments,
      'binding', function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?compare'
    );
    var currentValue = args.binding.withBackingValue(this._currentState).val(args.subpath);
    var previousValue = args.binding.withBackingValue(this._previousState).val(args.subpath);
    return args.compare ? !args.compare(currentValue, previousValue) : currentValue !== previousValue;
  },

  /** Initialize rendering.
   * @param {Object} rootComp root application component */
  init: function (rootComp) {
    var self = this;
    var requestAnimationFrameEnabled = self._configuration.requestAnimationFrameEnabled;
    var requestAnimationFrame = window && window.requestAnimationFrame;

    var render = function (newValue, oldValue) {
      if (rootComp.isMounted()) {
        self._currentState = newValue;
        self._previousState = oldValue;
        try {
          if (self._fullUpdateQueued) {
            self._fullUpdateInProgress = true;
            rootComp.forceUpdate(function () {
              self._fullUpdateQueued = false;
              self._fullUpdateInProgress = false;
            });
          } else {
            rootComp.forceUpdate();
          }
        } catch (e) {
          if (self._configuration.stopOnRenderError) {
            throw e;
          } else {
            console.error('Morearty: skipping render error', e);
          }
        }
      }
    };

    self._currentStateBinding.addGlobalListener(function (newValue, oldValue) {
      if (requestAnimationFrameEnabled && requestAnimationFrame) {
        requestAnimationFrame(render.bind(self, newValue, oldValue), null);
      } else {
        render(newValue, oldValue);
      }
    });
  },

  /** Queue full update on next render. */
  queueFullUpdate: function () {
    this._fullUpdateQueued = true;
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
    contextTypes: { morearty: function () {} },

    /** Get Morearty context.
     * @returns {Context} */
    getMoreartyContext: function () {
      return this.context.morearty;
    },

    /** Get component state binding. Returns binding specified in component's binding attribute.
     * @param {String} [name] binding name (can only be used with multi-binding state)
     * @return {Binding|Object} component state binding */
    getBinding: function (name) {
      return getBinding(this.getMoreartyContext(), this, name);
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
      var context = this.getMoreartyContext();
      var binding = getBinding(context, this);
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
      var context = this.getMoreartyContext();
      return getBinding(context, this, name).withBackingValue(context._previousState).val();
    },

    componentWillMount: function () {
      if (typeof this.getDefaultState === 'function') {
        var context = this.getMoreartyContext();
        var defaultState = this.getDefaultState();
        if (defaultState) {
          var binding = getBinding(context, this);
          var mergeStrategy =
              typeof this.getMergeStrategy === 'function' ? this.getMergeStrategy() : MERGE_STRATEGY.MERGE_PRESERVE;

          var immutableInstance = defaultState instanceof Imm.Sequence;

          if (binding instanceof Binding) {
            var effectiveDefaultState = immutableInstance ? defaultState : defaultState['default'];
            merge.call(context, mergeStrategy, effectiveDefaultState, binding);
          } else {
            var keys = Object.keys(binding);
            var defaultKey = keys.length === 1 ? keys[0] : 'default';
            var effectiveMergeStrategy = typeof mergeStrategy === 'string' ? mergeStrategy : mergeStrategy[defaultKey];

            if (immutableInstance) {
              merge.call(context, effectiveMergeStrategy, defaultState, binding[defaultKey]);
            } else {
              keys.forEach(function (key) {
                if (defaultState[key]) {
                  merge.call(context, effectiveMergeStrategy, defaultState[key], binding[key]);
                }
              });
            }
          }
        }
      }
    },

    shouldComponentUpdate: function (nextProps, nextState) {
      var shouldComponentUpdate = function () {
        var context = this.getMoreartyContext();
        if (context._fullUpdateInProgress) {
          return true;
        } else {
          var binding = getBinding(context, this);
          return !binding || stateChanged(context, binding);
        }
      }.bind(this);

      var shouldComponentUpdateOverride = this.shouldComponentUpdateOverride;
      return shouldComponentUpdateOverride ?
        shouldComponentUpdateOverride(shouldComponentUpdate, nextProps, nextState) :
        shouldComponentUpdate();
    }
  },

  /** Create Morearty context.
   * @param {Object} React React instance
   * @param {Object} Immutable Immutable instance
   * @param {IMap|Object} initialState initial state
   * @param {Object} [configuration] Morearty configuration. Supported parameters:
   * <ul>
   *   <li>bindingPropertyName - name of the property holding component's binding, 'binding' by default;</li>
   *   <li>requestAnimationFrameEnabled - enable rendering in requestAnimationFrame, false by default;</li>
   *   <li>stopOnRenderError - stop on errors during render, false by default.</li>
   * </ul>
   * @return {Context}
   * @memberOf Morearty */
  createContext: function (initialState, configuration) {
    var Sequence = Immutable.Sequence;
    var state = initialState instanceof Sequence ? initialState : Immutable.fromJS(initialState);
    var conf = configuration || {};
    return new Context(state, {
      bindingPropertyName: conf.bindingPropertyName || 'binding',
      requestAnimationFrameEnabled: conf.requestAnimationFrameEnabled || false,
      stopOnRenderError: conf.stopOnRenderError || false
    });
  }

};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Binding":1,"./DOM":2,"./History":3,"./Util":5,"./util/Callback":6}],5:[function(require,module,exports){
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

  /** Check if s1 starts with s2.
   * @param {String} s1
   * @param {String} s2
   * @return {Boolean}
   * @memberOf Util */
  startsWith: function (s1, s2) {
    return s1.indexOf(s2) === 0;
  },

  /** Self-descriptive.
   * @param {*} x
   * @return {String}
   * @memberOf Util */
  toString: function (x) {
    switch (x) {
      case undefined:
        return 'undefined';
      case null:
        return 'null';
      default:
        if (typeof x === 'string') {
          return '"' + x + '"';
        } else if (Array.isArray(x)) {
          return '[' + x.join(', ') + ']';
        } else {
          return x.toString();
        }
    }
  },

  /** Check if arguments are equal.
   * Checks strict equality first, if false, 'equals' method is tried, if any.
   * @param {*} x
   * @param {*} y
   * @returns {Boolean}
   * @memberOf Util */
  equals: function (x, y) {
    return x === y || (x && x.equals && x.equals(y));
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

  /** Shallow merge object properties from source object to dest.
   * @param {Object} source source object
   * @param {Object} dest destination object
   * @return {Object} destination object
   * @memberOf Util */
  shallowMerge: function (source, dest) {
    for (var prop in source) {
      if (source.hasOwnProperty(prop)) {
        dest[prop] = source[prop];
      }
    }
    return dest;
  },

  /** Partially apply React component constructor.
   * @param {Function} comp component constructor
   * @param {Object} props properties to apply
   * @param {Boolean} override override existing properties flag, true by default
   * @returns {Function} partially-applied React component constructor
   * @memberOf Util */
  papply: function (comp, props, override) {
    var self = this;
    var f = function (props2, children) {
      var effectiveChildren = arguments.length > 1 ? Array.prototype.slice.call(arguments, 1) : null;
      if (props2) {
        var effectiveProps = {};
        if (f._props) {
          self.shallowMerge(f._props, effectiveProps);
          self.shallowMerge(props2, effectiveProps);
        } else {
          effectiveProps = props2;
        }
        return comp(effectiveProps, effectiveChildren);
      } else {
        return comp(f._props, effectiveChildren);
      }
    };

    if (comp._props) {
      var newCompProps = {};
      if (override !== false) {
        self.shallowMerge(comp._props, newCompProps);
        self.shallowMerge(props, newCompProps);
      } else {
        self.shallowMerge(props, newCompProps);
        self.shallowMerge(comp._props, newCompProps);
      }
      f._props = newCompProps;
    } else {
      f._props = props;
    }

    return f;
  }

};

},{}],6:[function(require,module,exports){
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
      return false;
    };
  },

  /** Create callback used to delete binding value on an event.
   * @param {Binding} binding binding
   * @param {String|String[]} [subpath] subpath as a dot-separated string or an array of strings and numbers
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
   * <p>Callback will return false on successful match, true otherwise.
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

},{"../Util":5}],7:[function(require,module,exports){
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

module.exports = new Holder(null);

},{}]},{},[4])(4)
});