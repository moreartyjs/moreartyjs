var Imm = require('immutable');
var Util = require('./Util');
var Holder = require('./util/Holder');
var ChangesDescriptor = require('./ChangesDescriptor');

/* ---------------- */
/* Private helpers. */
/* ---------------- */

var UNSET_VALUE = {};

var copyBinding, getBackingValue, setBackingValue;

copyBinding = function (binding, backingValueHolder, metaBinding, path) {
  return new Binding(
    backingValueHolder,
    metaBinding,
    binding._regCountHolder, path, binding._listeners, binding._cache
  );
};

getBackingValue = function (binding) {
  return binding._backingValueHolder.getValue();
};

setBackingValue = function (binding, newBackingValue) {
  binding._backingValueHolder.setValue(newBackingValue);
};

var EMPTY_PATH, PATH_SEPARATOR, META_NODE, getPathElements, joinPaths, getMetaPath, getValueAtPath;

EMPTY_PATH = [];
PATH_SEPARATOR = '.';
META_NODE = '__meta__';

getPathElements = function (path) {
  return path ? path.split(PATH_SEPARATOR).map(function (s) { return isNaN(s) ? s : +s; }) : [];
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

var setOrUpdate, updateValue, deleteValue, clear;

setOrUpdate = function (rootValue, effectivePath, f) {
  return rootValue.updateIn(effectivePath, UNSET_VALUE, function (value) {
    return value === UNSET_VALUE ? f() : f(value);
  });
};

updateValue = function (binding, subpath, f) {
  var effectivePath = joinPaths(binding._path, subpath);
  var newBackingValue = setOrUpdate(getBackingValue(binding), effectivePath, f);
  setBackingValue(binding, newBackingValue);
  return effectivePath;
};

deleteValue = function (binding, subpath) {
  var effectivePath = joinPaths(binding._path, subpath);
  var backingValue = getBackingValue(binding);

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
            return coll && coll.delete(key);
          }
        });

        setBackingValue(binding, newBackingValue);
      }

      return pathTo;
  }
};

clear = function (value) {
  return value instanceof Imm.Iterable ? value.clear() : null;
};

var notifySamePathListeners, notifyGlobalListeners, isPathAffected, notifyNonGlobalListeners, notifyAllListeners;

notifySamePathListeners =
  function (binding, samePathListeners, listenerPath, path, previousBackingValue, previousMeta) {
    if (previousBackingValue || previousMeta) {
      Util.getPropertyValues(samePathListeners).forEach(function (listenerDescriptor) {
        if (!listenerDescriptor.disabled) {
          listenerDescriptor.cb(
            new ChangesDescriptor(
              binding, path, asArrayPath(listenerPath), previousBackingValue, previousMeta
            )
          );
        }
      });
    }
  };

notifyGlobalListeners =
  function (binding, path, previousBackingValue, previousMeta) {
    var listeners = binding._listeners;
    var globalListeners = listeners[''];
    if (globalListeners) {
      notifySamePathListeners(
        binding, globalListeners, EMPTY_PATH, path, previousBackingValue, previousMeta);
    }
  };

isPathAffected = function (listenerPath, changedPath) {
  return Util.startsWith(changedPath, listenerPath) || Util.startsWith(listenerPath, changedPath);
};

notifyNonGlobalListeners = function (binding, path, previousBackingValue, previousMeta) {
  var listeners = binding._listeners;
  Object.keys(listeners).filter(Util.identity).forEach(function (listenerPath) {
    if (isPathAffected(listenerPath, asStringPath(path))) {
      notifySamePathListeners(
        binding, listeners[listenerPath], listenerPath, path, previousBackingValue, previousMeta);
    }
  });
};

notifyAllListeners = function (binding, path, previousBackingValue, previousMeta) {
  notifyNonGlobalListeners(binding, path, previousBackingValue, previousMeta);
  notifyGlobalListeners(binding, path, previousBackingValue, previousMeta);
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
 * @param {Binding} metaBinding meta binding
 * @param {Holder} [regCountHolder] registration count holder
 * @param {String[]} [path] binding path, empty array if omitted
 * @param {Object} [listeners] change listeners, empty if omitted
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
var Binding = function (
  backingValueHolder, metaBinding, regCountHolder, path, listeners, cache) {

  /** @private */
  this._backingValueHolder = backingValueHolder;
  /** @private */
  this._metaBinding = metaBinding;
  /** @private */
  this._regCountHolder = regCountHolder || Holder.init(0);
  /** @private */
  this._path = path || EMPTY_PATH;
  /** @private */
  this._listeners = listeners || {};
  /** @private */
  this._cache = cache || {};
};

/* --------------- */
/* Static helpers. */
/* --------------- */

/** Create new binding with empty listeners set.
 * @param {Holder|Immutable.Map} backingValue backing value
 * @param {Binding} [metaBinding] meta binding
 * @return {Binding} fresh binding instance */
Binding.init = function (backingValue, metaBinding) {
  var binding = new Binding(
    backingValue instanceof Holder ? backingValue: Holder.init(backingValue),
    metaBinding
  );

  if (metaBinding) {
    metaBinding.addGlobalListener(function (changes) {
      if (changes.isValueChanged()) {
        var metaNodePath = changes.getPath();
        var changedPath = metaNodePath.slice(0, metaNodePath.length - 1);
        notifyAllListeners(binding, changedPath, null, changes.getPreviousValue());
      }
    });
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

Binding.prototype = Object.freeze( /** @lends Binding.prototype */ {

  /** Get binding path.
   * @returns {Array} binding path */
  getPath: function () {
    return this._path;
  },

  /** Update backing value.
   * @param {Immutable.Map} newBackingValue new backing value, unchanged if null or undefined
   * @return {Binding} new binding instance, original is unaffected */
  withBackingValue: function (newBackingValue) {
    var backingValueHolder =
      Util.undefinedOrNull(newBackingValue) ? this._backingValueHolder : Holder.init(newBackingValue);
    return copyBinding(this, backingValueHolder, this._metaBinding, this._path);
  },

  /** Check if binding value is changed in alternative backing value.
   * @param {Immutable.Map} alternativeBackingValue alternative backing value
   * @param {Function} [compare] alternative compare function, does reference equality check if omitted */
  isChanged: function (alternativeBackingValue, compare) {
    var value = this.get();
    var alternativeValue = alternativeBackingValue.getIn(this._path);
    return compare ? compare(value, alternativeValue) : value !== alternativeValue;
  },

  /** Check if this and supplied binding are relatives (i.e. share same backing value).
   * @param {Binding} otherBinding potential relative
   * @return {Boolean} */
  isRelative: function (otherBinding) {
    return this._backingValueHolder === otherBinding._backingValueHolder;
  },

  /** Get binding's meta binding.
   * @returns {Binding} meta binding or undefined */
  getMetaBinding: function () {
    return this._metaBinding && this._metaBinding.sub(META_NODE);
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
      var cached = this._cache[absolutePathAsString];

      if (cached) {
        return cached;
      } else {
        var metaBinding = this._metaBinding && this._metaBinding.sub(pathAsArray);
        var subBinding = copyBinding(this, this._backingValueHolder, metaBinding, absolutePath);
        this._cache[absolutePathAsString] = subBinding;
        return subBinding;
      }
    } else {
      return this;
    }
  },

  /** Update binding value.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @param {Function} f f function
   * @return {Binding} this binding */
  update: function (subpath, f) {
    var args = Util.resolveArgs(arguments, '?subpath', 'f');
    var previousBackingValue = getBackingValue(this);
    var affectedPath = updateValue(this, asArrayPath(args.subpath), args.f);
    notifyAllListeners(this, affectedPath, previousBackingValue);
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
    var previousBackingValue = getBackingValue(this);
    var affectedPath = deleteValue(this, asArrayPath(subpath));
    notifyAllListeners(this, affectedPath, previousBackingValue);
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
        if (value instanceof Imm.Iterable && effectiveNewValue instanceof Imm.Iterable) {
          return args.preserve ? effectiveNewValue.mergeDeep(value) : value.mergeDeep(effectiveNewValue);
        } else {
          return args.preserve ? value : effectiveNewValue;
        }
      }
    });
  },

  /** Clear nested collection. Does '.clear()' on Immutable values, nullifies otherwise.
   * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
   * @return {Binding} this binding */
  clear: function (subpath) {
    var subpathAsArray = asArrayPath(subpath);
    if (!Util.undefinedOrNull(this.get(subpathAsArray))) this.update(subpathAsArray, clear);
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
   * @param {Function} cb function receiving changes descriptor
   * @return {String} unique id which should be used to un-register the listener
   * @see ChangesDescriptor */
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
    return new TransactionContext(this);
  }

});

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
      var metaBinding = self._binding.getMetaBinding();
      if (metaBinding) {
        self._hasMetaChanges = binding.isRelative(metaBinding);
      }
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
      var updatedPaths = self._updates.map(function (o) { return updateValue(o.binding, o.subpath, o.update); });
      var removedPaths = self._deletions.map(function (o) { return deleteValue(o.binding, o.subpath); });
      self._committed = true;
      return joinPaths(updatedPaths, removedPaths);
    } else {
      throw new Error('Transaction already committed');
    }
  };

  return Object.freeze( /** @lends TransactionContext.prototype */ {

    /** Update binding value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Binding} [binding] binding to apply update to
     * @param {Function} f update function
     * @return {TransactionContext} updated transaction context carrying latest binding used */
    update: function (subpath, binding, f) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?binding', 'f'
      );
      addUpdate(this, args.binding || this._binding, args.f, asArrayPath(args.subpath));
      return this;
    },

    /** Set binding value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Binding} [binding] binding to apply update to
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
     * @param {Binding} [binding] binding to apply update to
     * @return {TransactionContext} updated transaction context carrying latest binding used */
    delete: function (subpath, binding) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?binding'
      );
      addDeletion(this, args.binding || this._binding, asArrayPath(args.subpath));
      return this;
    },

    /** Deep merge values.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Boolean} [preserve] preserve existing values when merging, false by default
     * @param {Binding} [binding] binding to apply update to
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
          if (value instanceof Imm.Iterable && effectiveNewValue instanceof Imm.Iterable) {
            return args.preserve ? effectiveNewValue.mergeDeep(value) : value.mergeDeep(effectiveNewValue);
          } else {
            return args.preserve ? value : effectiveNewValue;
          }
        }
      });
    },

    /** Clear collection or nullify nested value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Binding} [binding] binding to apply update to */
    clear: function (subpath, binding) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; }, '?binding'
      );
      addUpdate(
        this,
        args.binding || this._binding,
        function (value) { return clear(value); },
        asArrayPath(args.subpath)
      );
      return this;
    },

    /** Commit transaction (write changes and notify listeners).
     * @param {Boolean} [notifyListeners] should listeners be notified;
     *                                    true by default, set to false to disable notification
     * @return {String[]} array of affected paths */
    commit: function (notifyListeners) {
      if (hasChanges(this)) {
        var binding = this._binding;

        var previousBackingValue = null, previousMetaValue = null;
        if (notifyListeners !== false) {
          if (this._hasChanges) previousBackingValue = getBackingValue(binding);
          if (this._hasMetaChanges) previousMetaValue = getBackingValue(binding.getMetaBinding());
        }

        var affectedPaths = commitSilently(this);

        if (notifyListeners !== false) {
          var filteredPaths = filterRedundantPaths(affectedPaths);
          filteredPaths.forEach(function (path) {
            notifyNonGlobalListeners(binding, path, previousBackingValue, previousMetaValue);
          });
          notifyGlobalListeners(binding, filteredPaths[0], previousBackingValue, previousMetaValue);
        }

        return affectedPaths;

      } else {
        return [];
      }
    }

  });
})();

module.exports = Binding;
