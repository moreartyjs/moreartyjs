/**
 * @name DOM
 * @namespace
 * @classdesc DOM module. Exposes requestAnimationFrame-friendly wrappers around input, textarea, and option.
 */
define(['Dyn'], function (Dyn) {

  var exports = {};

  var React;
  Dyn.onRegisterModule('React', function (module) {
    React = module;
    var _ = React.DOM;

    exports.input = wrapComponent(_.input, 'input');
    exports.textarea = wrapComponent(_.textarea, 'textarea');
    exports.otion = wrapComponent(_.option, 'option');

    Object.freeze(exports);
  });

  var wrapComponent = function (comp, displayName) {
    //noinspection JSUnusedGlobalSymbols
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

  return exports;

});
