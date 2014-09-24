var React = require('react');

/**
 * @name DOM
 * @namespace
 * @classdesc DOM module. Exposes requestAnimationFrame-friendly wrappers around input, textarea, and option.
 */
module.exports = function () {

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

  return {

    input: wrapComponent(_.input, 'input'),

    textarea: wrapComponent(_.textarea, 'textarea'),

    option: wrapComponent(_.option, 'option')

  };

};
