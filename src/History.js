/**
 * @name History
 * @namespace
 * @classdesc Undo/redo history handling.
 */
define(['data/Map', 'data/Vector'], function (Map, Vector) {

  var initHistory, clearHistory, destroyHistory, listenForChanges, revertToStep, revert;

  initHistory = function (historyBinding) {
    historyBinding.assoc(Map.fill('listenerId', null, 'undo', Vector, 'redo', Vector));
  };

  clearHistory = function (historyBinding) {
    historyBinding.atomically()
      .assoc('undo', Vector)
      .assoc('redo', Vector)
      .commit();
  };

  destroyHistory = function (historyBinding) {
    var listenerId = historyBinding.val('listenerId');
    historyBinding.removeListener(listenerId);
    historyBinding.assoc(null);
  };

  listenForChanges = function (binding, historyBinding) {
    var listenerId = binding.addListener([], function (newValue, oldValue, absolutePath, relativePath) {
      historyBinding.atomically().update(function (history) {
        return history
          .update('undo', function (undo) {
            var pathAsArray = binding.asArrayPath(relativePath);
            return undo.prepend(Map.fillFromObject({
              newValue: pathAsArray.length ? newValue.getIn(pathAsArray) : newValue,
              oldValue: pathAsArray.length ? oldValue.getIn(pathAsArray) : oldValue,
              path: relativePath
            }));
          })
          .assoc('redo', Vector);
      }).commit(false);
    });

    historyBinding.atomically().assoc('listenerId', listenerId).commit(false);
  };

  revertToStep = function (path, value, listenerId, dataBinding) {
    dataBinding.withDisabledListener(listenerId, function () {
      dataBinding.assoc(path, value);
    });
  };

  revert = function (dataBinding, fromBinding, toBinding, listenerId, valueProperty) {
    var from = fromBinding.val();
    if (!from.isEmpty()) {
      var step = from.get(0);

      fromBinding.atomically()
        .dissoc(0)
        .update(toBinding, function (to) {
          return to.prepend(step);
        })
        .commit(false);

      revertToStep(step.get('path'), step.get(valueProperty), listenerId, dataBinding);
      return true;
    } else {
      return false;
    }
  };

  return {

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
     * @memberOf History */
    destroy: function (historyBinding) {
      destroyHistory(historyBinding);
    },

    /** Check if history has undo information.
     * @param {Binding} historyBinding history binding
     * @returns {Boolean}
     * @memberOf History */
    hasUndo: function (historyBinding) {
      var undo = historyBinding.val('undo');
      return !!undo && !undo.isEmpty();
    },

    /** Check if history has redo information.
     * @param {Binding} historyBinding history binding
     * @returns {Boolean}
     * @memberOf History */
    hasRedo: function (historyBinding) {
      var redo = historyBinding.val('redo');
      return !!redo && !redo.isEmpty();
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

});
