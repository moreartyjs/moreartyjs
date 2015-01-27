var Imm = require('immutable');
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
