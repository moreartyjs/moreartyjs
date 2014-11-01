var Imm = require('immutable');
var Binding = require('./Binding');

var initHistory, clearHistory, destroyHistory, listenForChanges, revertToStep, revert;

initHistory = function (historyBinding) {
  historyBinding.set(Imm.fromJS({ listenerId: null, undo: [], redo: [] }));
};

clearHistory = function (historyBinding) {
  historyBinding.atomically()
    .set('undo', Imm.List.of())
    .set('redo', Imm.List.of())
    .commit();
};

destroyHistory = function (historyBinding, notify) {
  var listenerId = historyBinding.get('listenerId');
  historyBinding.removeListener(listenerId);
  historyBinding.atomically().set(null).commit({ notify: notify });
};

listenForChanges = function (binding, historyBinding) {
  var listenerId = binding.addListener([], function (changes) {
    historyBinding.atomically().update(function (history) {
      var path = changes.getPath();
      var previousValue = changes.getPreviousValue(), newValue = binding.get();
      return history
        .update('undo', function (undo) {
          var pathAsArray = Binding.asArrayPath(path);
          return undo && undo.unshift(Imm.Map({
            newValue: pathAsArray.length ? newValue.getIn(pathAsArray) : newValue,
            oldValue: pathAsArray.length ? previousValue.getIn(pathAsArray) : previousValue,
            path: path
          }));
        })
        .set('redo', Imm.List.of());
    }).commit({ notify: false });
  });

  historyBinding.atomically().set('listenerId', listenerId).commit({ notify: false });
};

revertToStep = function (path, value, listenerId, dataBinding) {
  dataBinding.withDisabledListener(listenerId, function () {
    dataBinding.set(path, value);
  });
};

revert = function (dataBinding, fromBinding, toBinding, listenerId, valueProperty) {
  var from = fromBinding.get();
  if (from.count() > 0) {
    var step = from.get(0);

    fromBinding.atomically()
      .delete(0)
      .update(toBinding, function (to) {
        return to.unshift(step);
      })
      .commit({ notify: false });

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
   * @param {Object} [options] options object, supported options are:
   * <ul>
   *   <li>notify - should listeners be notified, true by default, set to false to disable notification.</li>
   * </ul>
   * @memberOf History */
  destroy: function (historyBinding, options) {
    var effectiveOptions = options || {};
    destroyHistory(historyBinding, effectiveOptions.notify);
  },

  /** Check if history has undo information.
   * @param {Binding} historyBinding history binding
   * @returns {Boolean}
   * @memberOf History */
  hasUndo: function (historyBinding) {
    var undo = historyBinding.get('undo');
    return !!undo && undo.count() > 0;
  },

  /** Check if history has redo information.
   * @param {Binding} historyBinding history binding
   * @returns {Boolean}
   * @memberOf History */
  hasRedo: function (historyBinding) {
    var redo = historyBinding.get('redo');
    return !!redo && redo.count() > 0;
  },

  /** Revert to previous state.
   * @param {Binding} dataBinding data binding
   * @param {Binding} historyBinding history binding
   * @returns {Boolean} true, if binding has undo information
   * @memberOf History */
  undo: function (dataBinding, historyBinding) {
    var listenerId = historyBinding.get('listenerId');
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
    var listenerId = historyBinding.get('listenerId');
    var undoBinding = historyBinding.sub('undo');
    var redoBinding = historyBinding.sub('redo');
    return revert(dataBinding, redoBinding, undoBinding, listenerId, 'newValue');
  }

};

module.exports = History;
