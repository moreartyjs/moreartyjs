define(['Dyn', 'Util', 'util/Holder'], function (Dyn, Util, Holder) {

  var Imm = null;
  Dyn.onRegisterModule('Immutable', function (module) {
    Imm = module;
  });

  /* ---------------- */
  /* Private helpers. */
  /* ---------------- */

  var copyBinding, getBackingValue, setBackingValue;

  copyBinding = function (binding, backingValueHolder, path) {
    return new Binding(
      backingValueHolder, binding._regCountHolder, path, binding._listeners, binding._listenerNestingLevelHolder
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
    return typeof path === 'string' ?
      getPathElements(path) :
      (Util.undefinedOrNull(path) ? [] : path);
  };

  asStringPath = function (path) {
    return typeof path === 'string' ? path : path.join(PATH_SEPARATOR);
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
          return coll.has(key) ? coll.update(key, update) : coll.set(key, update());
        };

        var len = effectivePath.length;
        switch (len) {
          case 0:
            throwPathMustPointToKey();
            break;
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
        return coll.delete(key);
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
    return value ? value.clear() : value;
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
   * @public
   * @class Binding
   * @classdesc Wraps immutable map. Provides convenient read-write access to nested values.
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
  var Binding = function (backingValueHolder, regCountHolder, path, listeners, listenerNestingLevelHolder) {
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
  };

  Binding.prototype = Object.freeze( /** @lends Binding.prototype */ {

    /** Create new binding with empty listeners set.
     * @param {Map} backingValue backing value
     * @return {Binding} fresh binding instance */
    init: function (backingValue) {
      return new Binding(Holder.init(backingValue));
    },

    /** Update backing value.
     * @param {Map} newBackingValue new backing value
     * @return {Binding} new binding instance, original is unaffected */
    withBackingValue: function (newBackingValue) {
      return copyBinding(this, Holder.init(newBackingValue), this._path);
    },

    /** Mutate backing value.
     * @param {Map} newBackingValue new backing value
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
      return copyBinding(this, this._backingValueHolder, joinPaths(this._path, asArrayPath(subpath)));
    },

    /** Update binding value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Function} update update function */
    update: function (subpath, update) {
      var args = Util.resolveArgs(arguments, '?subpath', 'update');
      var oldBackingValue = getBackingValue(this);
      var affectedPath = updateValue(this, args.update, asArrayPath(args.subpath));
      notifyAllListeners(this, affectedPath, oldBackingValue);
    },

    /** Set binding value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {*} newValue new value */
    set: function (subpath, newValue) {
      var args = Util.resolveArgs(arguments, '?subpath', 'newValue');
      this.update(args.subpath, Util.constantly(args.newValue));
    },

    /** Delete value.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers */
    delete: function (subpath) {
      var oldBackingValue = getBackingValue(this);
      var affectedPath = unsetValue(this, asArrayPath(subpath));
      notifyAllListeners(this, affectedPath, oldBackingValue);
    },

    /** Deep merge values.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers
     * @param {Boolean} [preserve] preserve existing values when merging, false by default
     * @param {*} newValue new value */
    merge: function (subpath, preserve, newValue) {
      var args = Util.resolveArgs(
        arguments,
        function (x) { return Util.canRepresentSubpath(x) ? 'subpath' : null; },
        '?preserve',
        'newValue'
      );
      this.update(args.subpath, function (value) {
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

    /** Clear nested collection.
     * @param {String|Array} [subpath] subpath as a dot-separated string or an array of strings and numbers */
    clear: function (subpath) {
      var effectiveSubpath = asArrayPath(subpath);
      if (getBackingValue(this).getIn(effectiveSubpath)) this.update(effectiveSubpath, function (coll) {
        return clear(coll);
      });
    },

    /** Add change listener.
     * @param {String|Array} path path to listen for changes
     * @param {Function} cb function of (newValue, oldValue, absolutePath, relativePath)
     * @return {String} unique id which should be used to un-register the listener */
    addListener: function (path, cb) {
      var listenerId = 'reg' + this._regCountHolder.updateValue(function (count) { return count + 1; });
      var pathAsString = asStringPath(joinPaths(this._path, asArrayPath(path)));
      var samePathListeners = this._listeners[pathAsString];
      var listenerDescriptor = { cb: cb, disabled: false };
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
     * @param {String} listenerId listener id */
    enableListener: function (listenerId) {
      setListenerDisabled(this, listenerId, false);
    },

    /** Disable listener.
     * @param {String} listenerId listener id */
    disableListener: function (listenerId) {
      setListenerDisabled(this, listenerId, true);
    },

    /** Execute function with listener temporarily disabled. Correctly handles functions returning promises.
     * @param {String} listenerId listener id
     * @param {Function} f function to execute */
    withDisabledListener: function (listenerId, f) {
      var samePathListeners = findSamePathListeners(this, listenerId);
      if (samePathListeners) {
        var descriptor = samePathListeners[listenerId];
        descriptor.disabled = true;
        Util.afterComplete(f, function () { descriptor.disabled = false; });
      } else {
        f();
      }
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
    },

    /** Convert string path to array path.
     * @param {String} pathAsString path as string */
    asArrayPath: function (pathAsString) {
      return asArrayPath(pathAsString);
    },

    /** Convert array path to string path.
     * @param {String[]} pathAsAnArray path as an array */
    asStringPath: function (pathAsAnArray) {
      return asStringPath(pathAsAnArray);
    },

    /** Check whether obj is binding instance.
     * @param {*} obj object to check
     * @return {Boolean} */
    isInstance: function (obj) {
      return obj instanceof Binding;
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

    var addUpdate, addRemoval, hasChanges, filterRedundantPaths, commitSilently;

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
            result.push(currentPath);
            previousPathAsString = currentPathAsString;
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
            return newValue;
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

  return new Binding(Holder.init(null));

});
