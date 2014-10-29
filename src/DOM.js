var Util  = require('./Util');
var React = require('react');

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
