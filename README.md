[npm-url]: https://npmjs.org/package/morearty
[npm-image]: http://img.shields.io/npm/v/morearty.svg?style=flat

# Morearty.js
[![NPM version][npm-image]][npm-url] [![Build Status](https://travis-ci.org/moreartyjs/moreartyjs.svg?branch=master)](https://travis-ci.org/moreartyjs/moreartyjs) [![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/moreartyjs/moreartyjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![devDependency Status](https://david-dm.org/moreartyjs/moreartyjs/dev-status.svg)](https://david-dm.org/moreartyjs/moreartyjs#info=devDependencies)

* [Introduction](#introduction)
* [Download](#download)
* [Dependencies](#dependencies)
* [Current status](#current-status)
* [Documentation](#documentation)
* [Usage](#usage)
* [TodoMVC](#todomvc)
  * [App component](#app-component)
  * [Header component](#header-component)
  * [TodoList component](#todolist-component)
  * [TodoItem component](#todoitem-component)
  * [Footer component](#footer-component)
  * [Starting the application](#starting-the-application)
  * [Principal differences from raw React](#principal-differences-from-raw-react)
  * [Flux implementation](#flux-implementation)
* [Future goals by priority](#future-goals-by-priority)
* [Want to help?](#want-to-help)
* [Credits](#credits)

# Introduction

**Morearty.js** is a thin layer on top of [React](http://facebook.github.io/react/index.html) (implemented as a mixin) providing better state management facilities in the manner of [Om](https://github.com/swannodette/om) but written in pure JavaScript.

Underneath Morearty leverages immutable data structures provided by Facebook's [Immutable](https://github.com/facebook/immutable-js) library which hold the state of an application. That state is described by a single [Binding](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Binding.html) object and all state transitions are performed through it. When an application component needs to delegate a part of its state to a sub-component, it can create a [sub-binding](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Binding.html#sub) which points to a nested location within the global state and is fully synchronized with the original binding. This way every component knows only what it should know and the entire state is effectively encapsulated. Morearty detects any changes automatically and triggers re-rendering. Moreover, each component gets a correctly defined [shouldComponentUpdate](http://facebook.github.io/react/docs/component-specs.html#updating-shouldcomponentupdate) method that compares the component's state using straightforward JavaScript strict equals operator `===`. So, only the components whose state was altered are re-rendered.

Morearty puts state updates in a render queue and applies them asynchronously in [requestAnimationFrame](http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/) in one pass, falling back to `setTimeout` when `requestAnimationFrame` is not available. This dramatically simplifies reasoning about the application and improves performance.

See [documentation](#documentation) for more info.

# Download

Browser, AMD, Node.js environments are supported. You can get [production](https://raw.githubusercontent.com/moreartyjs/moreartyjs/master/dist/morearty.min.js) (23kb) and [development](https://raw.githubusercontent.com/moreartyjs/moreartyjs/master/dist/morearty.js) (68kb) versions. Or just `npm install morearty`.

# Dependencies

Morearty requires React version 0.12 or higher ([download](http://facebook.github.io/react/downloads.html)) and Immutable 3.6 and above ([download](https://github.com/facebook/immutable-js/releases)). **Both should be available as global variables with names `React` and `Immutable` unless you're using NPM.** Require.js users can do something like:

```javascript
require.config({
  paths: {
    react: 'path/to/react',
    immutable: 'path/to/immutable'
  }
});

require(['react', 'immutable'], function (React, Imm) {
  window.React = React;
  window.Immutable = Imm;

  require(['component/Bootstrap'], function (Bootstrap) {
    React.renderComponent(
      Bootstrap(),
      document.getElementById('root')
    );
  });
});
```

# Current status

**Morearty** 0.7 series changes:

* Support React 0.13.
* Update to Immutable 3.6.
* Asynchronous rendering is the default, synchronous mode is no longer supported.
* Support `this.addBindingListener(...)` in components for component lifecycle bounded listeners creation. Just listen for changes, all required cleanup is performed in `componentWillUnmount` automatically, if component's `shouldRemoveListeners` method returns true.
* Meta-binding fixes and improvements.
* Support `renderOnce` configuration parameter useful to ensure rendering is performed only once. Other server rendering corrections.
* `Context.bootstrap` helper method simplifying application bootstrapping.
* Support dynamic bindings ([#36](https://github.com/moreartyjs/moreartyjs/issues/36)).
* Support passing custom React context ([#37](https://github.com/moreartyjs/moreartyjs/issues/37)).
* Introduced [observed bindings](https://github.com/moreartyjs/moreartyjs/wiki/Authoring-components#using-observed-bindings).
* Support IE8. Deprecate `Binding.delete` in favor of `remove`.

**Morearty** 0.6 series changes:

* React 0.12 and Immutable 3.0 or higher now required.
* Introduce [bindings meta info](https://github.com/moreartyjs/moreartyjs/wiki/Binding#attaching-meta-information) that allows to store data you don't want to put in the main state, e.g. validation info, history, and so on.
* Generate less garbage during render.
* History module migrated on meta binding API.

See [releases page](https://github.com/moreartyjs/moreartyjs/releases) for detailed per-release changes descriptions.

# Documentation

See Wiki [pages](https://github.com/moreartyjs/moreartyjs/wiki) for a thourough explanation of Morearty concepts.

Auto-generated API documentation is available [here](https://rawgit.com/moreartyjs/moreartyjs/master/doc/index.html).

# Usage

To start using Morearty.js add the script to the page or load it with your favorite AMD loader, e.g. [Require.js](http://requirejs.org/), and create Morearty context using [createContext](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Morearty.html#createContext) method:

```javascript
var Ctx = Morearty.createContext({
  initialState: {
    nowShowing: 'all',
    items: [{
      title: 'My first task',
      completed: false,
      editing: false
    }]
  }
});
```

When you create components this way, they acquire correctly defined `shouldComponentUpdate` method which uses component's binding (if any) to determine if its state was changed. By default state is transferred to sub-components in `binding` attribute and can be retrieved using `getDefaultBinding` method.

# TodoMVC
To continue this introduction [TodoMVC](http://todomvc.com/) implementation based on Morearty.js will be used ([repository](https://github.com/moreartyjs/todomvc-moreartyjs), [application](https://rawgit.com/moreartyjs/todomvc-moreartyjs/master/index.html)). You should have some previous React knowledge to follow painlessly, only Morearty-specific parts will be described.

## App component
Let's now define main application module `App`:

```javascript
var NOW_SHOWING = Object.freeze({ ALL: 'all', ACTIVE: 'active', COMPLETED: 'completed' });

var App = React.createClass({
  displayName: 'App',

  mixins: [Morearty.Mixin],

  componentDidMount: function () {
    var binding = this.getDefaultBinding();
    Router({
      '/': binding.set.bind(binding, 'nowShowing', NOW_SHOWING.ALL),
      '/active': binding.set.bind(binding, 'nowShowing', NOW_SHOWING.ACTIVE),
      '/completed': binding.set.bind(binding, 'nowShowing', NOW_SHOWING.COMPLETED)
    }).init();
  },

  render: function () {
    var binding = this.getDefaultBinding();
    return (
      <section id='todoapp'>
        <Header binding={ binding } />
        <TodoList binding={ binding } />
        <Footer binding={ binding } />
      </section>
    );
  }
});
```

Notice that `App` uses `getDefaultBinding` method to retrieve its state binding and delegate it to its children. See `getDefaultBinding` API [doc](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Morearty.Mixin.html#getDefaultBinding) for the discussion of the default binding concept.

## Header component

```javascript
var Header = React.createClass({
  displayName: 'Header',
  mixins: [Morearty.Mixin],

  componentDidMount: function () {
    this.refs.newTodo.getDOMNode().focus(); // focus on show
  },

  onAddTodo: function (event) {
    var title = event.target.value;
    if (title) {
      this.getDefaultBinding().update('items', function (todos) { // add new item
        return todos.push(Immutable.Map({
          id: currentId++,
          title: title,
          completed: false,
          editing: false
        }));
      });
      event.target.value = '';
    }
  },

  render: function () {
    return (
      <header id='header'>
        <h1>todos</h1>
        <Morearty.DOM.input id='new-todo' // // requestAnimationFrame-friendly wrapper around input
                            ref='newTodo'
                            placeholder='What needs to be done?'
                            onKeyDown={ Morearty.Callback.onEnter(this.onAddTodo) } />
      </header>
    );
  }
});
```

In `onAddTodo` method component state is [updated](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Binding.html#update) by appending new TODO item to the list. `render` method output custom `input` component version suitable for [rendering in requestAnimationFrame](https://github.com/moreartyjs/moreartyjs#requestanimationframe-support).

## TodoList component

```javascript
var TodoList = React.createClass({
  displayName: 'TodoList',

  mixins: [Morearty.Mixin],

  onToggleAll: function (event) {
    var completed = event.target.checked;
    this.getDefaultBinding().update('items', function (items) {
      return items.map(function (item) {
        return item.set('completed', completed);
      });
    });
  },

  render: function () {
    var binding = this.getDefaultBinding();
    var nowShowing = binding.get('nowShowing');
    var itemsBinding = binding.sub('items');
    var items = itemsBinding.get();

    var isShown = function (item) {
      switch (nowShowing) {
        case NOW_SHOWING.ALL:
          return true;
        case NOW_SHOWING.ACTIVE:
          return !item.get('completed');
        case NOW_SHOWING.COMPLETED:
          return item.get('completed');
      }
    };

    var renderTodo = function (item, index) {
      var itemBinding = itemsBinding.sub(index);
      return isShown(item) ? <TodoItem binding={ itemBinding} key={ itemBinding.toJS('id') } /> : null;
    };

    var allCompleted = !items.find(function (item) {
      return !item.get('completed');
    });

    return (
      <section id='main'>
      {
        items.count() ?
          <Morearty.DOM.input id='toggle-all'
                              type='checkbox'
                              checked={ allCompleted }
                              onChange={ this.onToggleAll } /> :
          null
      }
        <ul id='todo-list'>{ items.map(renderTodo).toArray() }</ul>
      </section>
    );
  }
});
```

`onToggleAll` callback sets `completed` property on all items. Note how state is transferred to the children: only the relevant sub-state is passed using [sub](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Binding.html#sub) method which creates a sub-binding pointing deeper into global state. So, TODO item can only access and modify its own cell, and the rest of application state is protected from incidental modification. [val](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Binding.html#val) method allows to retrieve the value stored in the binding or in its sub-path.

## TodoItem

```javascript
var TodoItem = React.createClass({
  displayName: 'TodoItem',

  mixins: [Morearty.Mixin],

  componentDidUpdate: function () {
    var ctx = this.getMoreartyContext();
    if (ctx.isChanged(this.getDefaultBinding().sub('editing'))) {
      var node = this.refs.editField.getDOMNode();
      node.focus();
      node.setSelectionRange(0, node.value.length);
    }
  },

  onToggleCompleted: function (event) {
    this.getDefaultBinding().set('completed', event.target.checked);
  },

  onToggleEditing: function (editing) {
    this.getDefaultBinding().set('editing', editing);
  },

  onEnter: function (event) {
    this.getDefaultBinding().atomically()
      .set('title', event.target.value)
      .set('editing', false)
      .commit();
  },

  render: function () {
    var binding = this.getDefaultBinding();
    var item = binding.get();

    var liClass = React.addons.classSet({
      completed: item.get('completed'),
      editing: item.get('editing')
    });
    var title = item.get('title');

    return (
      <li className={ liClass }>
        <div className='view'>
          <Morearty.DOM.input className='toggle'
                              type='checkbox'
                              checked={ item.get('completed') }
                              onChange={ this.onToggleCompleted } />
          <label onClick={ this.onToggleEditing.bind(null, true) }>{ title }</label>
          <button className='destroy' onClick={ binding.remove.bind(binding, '') }></button>
        </div>
        <Morearty.DOM.input className='edit'
                            ref='editField'
                            value={ title }
                            onChange={ Morearty.Callback.set(binding, 'title') }
                            onKeyDown={ Morearty.Callback.onEnter(this.onEnter) }
                            onBlur={ this.onToggleEditing.bind(null, false) } />
      </li>
    );
  }
});
```

Here component title is written to the global state using [set](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Callback.html#set) helper when text in changed. To remove the item no callback needs to be passed from the parent: item component just calls Binding's [remove](https://rawgit.com/moreartyjs/moreartyjs/master/doc/Binding.html#remove) method which removes it from the list of items. In `onEnter` method transaction is used to prevent re-rendering between state transitions. It effectively notifies global listeners once on [commit](https://rawgit.com/moreartyjs/moreartyjs/master/doc/TransactionContext.html#commit).

## Footer component

```javascript
var Footer = React.createClass({
  displayName: 'Footer',

  mixins: [Morearty.Mixin],

  onClearCompleted: function () {
    this.getDefaultBinding().update('items', function (items) {
      return items.filter(function (item) {
        return !item.get('completed');
      });
    });
  },

  render: function () {
    var binding = this.getDefaultBinding();
    var nowShowing = binding.get('nowShowing');

    var items = binding.get('items');
    var completedItemsCount = items.reduce(function (acc, item) {
      return item.get('completed') ? acc + 1 : acc;
    }, 0);

    return (
      <footer id='footer'>
        <span id='todo-count'>{ items.count() - completedItemsCount + ' items left' }</span>
        <ul id='filters'>
          <li>
            <a className={ nowShowing === NOW_SHOWING.ALL ? 'selected' : '' } href='#/'>All</a>
          </li>
          <li>
            <a className={ nowShowing === NOW_SHOWING.ACTIVE ? 'selected' : '' } href='#/active'>Active</a>
          </li>
          <li>
            <a className={ nowShowing === NOW_SHOWING.COMPLETED ? 'selected' : '' } href='#/completed'>Completed</a>
          </li>
        </ul>
      {
        completedItemsCount ?
          <button id='clear-completed' onClick={ this.onClearCompleted }>
            { 'Clear completed (' + completedItemsCount + ')' }
          </button> :
          null
      }
      </footer>
    );
  }
});
```

Nothing special here so let's jump straight to...

## Starting the application

```javascript

var Bootstrap = Ctx.bootstrap(App); // will pass root binding to App

React.render(
  <Bootstrap />,
  document.getElementById('root')
);
```

`Ctx.bootstrap` method creates Morearty application bootstrap component which is then passed to React render routine.

## Principal differences from raw React

You can compare this Morearty-based TodoMVC implementation to the official React [version](https://github.com/tastejs/todomvc/tree/gh-pages/architecture-examples/react). Main highlights are:

* No callbacks are passed to sub-components. This becomes especially useful when you find yourself trying to transfer a callback to a component's grand-children (you may never know how you DOM may be restructured after a redesign). There is nothing inherently wrong in passing callbacks to sub-components, but in many cases this can be avoided.
* No hacks in code simulating immutable state and other tricks (look at the comments withing React version sources).
* Reasoning about the application is much simpler!
* Each component gets `shouldComponentUpdate` method, no need to define it manually (but you can if you like).
* Less code.

## Flux implementation
[z3tsu](https://github.com/z3tsu) provided Flux version of Todo-MVC based on [Reflux](https://github.com/spoike/refluxjs): [z3tsu/todomvc-morearty-reflux](https://github.com/z3tsu/todomvc-morearty-reflux).

# Future goals by priority

1. Introduce automatic server sync support on state nodes.
2. Add well-defined flexible validation support and guidelines.
3. Improve the documentation, provide more examples.
4. Gather community feedback to find areas for improvement.
5. Stabilize API and code.

# Want to help?

Feel free to [provide](https://github.com/moreartyjs/moreartyjs/issues) ideas, suggestions, enhancements, documentation improvements. Any feedback or input is highly appreciated.

# Credits

* Alexander Semenov @Tvaroh (author)
* Marat Bektimirov @mbektimirov (collaborator)
* Tim Griesser @tgriesser (collaborator)
* Pavel Birukov @r00ger (collaborator)
