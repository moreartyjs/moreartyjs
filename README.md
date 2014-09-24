* [Introduction](#introduction)
* [Download](#download)
* [Dependencies](#dependencies)
* [Changelog](#changelog)
* [API documentation](#api-documentation)
* [Usage](#usage)
* [TodoMVC](#todomvc)
  * [App component](#app-component)
  * [Header component](#header-component)
  * [TodoList component](#todolist-component)
  * [TodoItem component](#todoitem-component)
  * [Footer component](#footer-component)
  * [Starting the application](#starting-the-application)
  * [Principal differences from raw React](#principal-differences-from-raw-react)
* [Custom shouldComponentUpdate](#custom-shouldcomponentupdate)
* [Multi-binding component and default binding](#multi-binding-components-and-default-binding)
* [Default state publication](#default-state-publication)
* [requestAnimationFrame support](#requestanimationframe-support)
* [Other features](#other-features)
* [Future goals by priority](#future-goals-by-priority)
* [Credits](#credits)

# Introduction #

**Morearty.js** is a thin layer on top of [React](http://facebook.github.io/react/index.html) (implemented as a mixin) providing better state management facilities in the manner of [Om](https://github.com/swannodette/om) but written in pure JavaScript.

Underneath Morearty leverages immutable data structures provided by Facebook's [Immutable](https://github.com/facebook/immutable-js) library which hold the state of an application. That state is described by a single [Binding](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html) object and all state transitions are performed through it. When an application component needs to delegate a part of its state to a sub-component, it can create a [sub-binding](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#sub) which points to a nested location within the global state and is fully synchronized with the original binding. This way every component knows only what it should know and the entire state is effectively encapsulated. Morearty detects any changes automatically and triggers re-rendering. Each component gets a correctly defined [shouldComponentUpdate](http://facebook.github.io/react/docs/component-specs.html#updating-shouldcomponentupdate) method that compares the component's state using straightforward JavaScript strict equals operator `===`. This is possible due to immutable nature of underlying data structures. So, only the components whose state was altered are re-rendered.

# Download #

Current version is 0.4.0. Test coverage is almost 100% with more than 200 test cases. Browser, AMD, Node.js environments are supported. You can get [production](https://raw.githubusercontent.com/Tvaroh/moreartyjs/master/dist/morearty.min.js) (20kb) and [development](https://raw.githubusercontent.com/Tvaroh/moreartyjs/master/dist/morearty.js) (60kb) versions. Or just `npm install morearty`. In browser loading with [Require.js](http://requirejs.org/) is preferable. Starting from version 0.4.0 Morearty requires globally-available `React` and `Immutable` vars.

# Dependencies #

Morearty requires React version 0.11.1 or higher ([download](http://facebook.github.io/react/downloads.html)) and Immutable 2.0.16 or higher ([download](https://github.com/facebook/immutable-js/tree/master/dist)). **Both should be available as global variables with names `React` and `Immutable`.** Require.js users can do something like:

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

  require(['app/Context', 'component/Bootstrap'], function (Ctx, Bootstrap) {
    React.renderComponent(
      Bootstrap(),
      document.getElementById('root')
    );
  });
});
```

# Changelog #

* 0.4.0 - Normalize dependencies. New standalone build (thanks to Marat Bektimirov). Fixes #19.
* 0.3.6 - Fix incorrect behavior of `Binding.clear`. Correct `Context.isChanged` when rendering on requestAnimationFrame. Minor improvements.
* 0.3.5 - Fix caching issue.
* 0.3.4 - #17 Add sub-bindings cache. #18 Don't fail on React render errors. 
* 0.3.3 - Fix #16 (minimize notifications count on commit). Binding methods now return this (Fluent-API).
* 0.3.2 - Fix #14 (support updating binding from root). Update to Immutable 2.0.17.
* 0.3.1 - Support delete at non-existent subpath.
* 0.3.0 - Reimplement Morearty as a React mixin. Better multi-binding components support. `getState` method renamed to `getBinding`, binding is passed in `binding` attribute by default (was `state`), introduced default binding [concept](#multi-binding-components-and-default-binding). Update to Immutable 2.0.16.
* 0.2.4 - CommonJS modules, simplify build process (thanks to Tim Griesser). Update to Immutable 2.0.15.
* 0.2.3 - Update to Immutable 2.0.14 (thanks to Tim Griesser).
* 0.2.2 - Add requestAnimationFrame-friendly wrappers around input, textarea, and option. Update to Immutable 2.0.6.
* 0.2.1 - Support getDefaultState and [getMergeStrategy](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Context.html#MergeStrategy) in components. Allow to [replace](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Context.html#replaceState) whole application state. Add [merge](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#merge) operation to Binding. Callback's [onKey](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Callback.html#onKey) now accepts multiple keys in an array.
* 0.2.0 - Migrate on Facebook's [Immutable](https://github.com/facebook/immutable-js) library. Major API changes.
* 0.1.0-0.1.9 (deprecated) - Support rendering in requestAnimationFrame, new methods, bug fixes, library stabilization.

# API documentation #

Auto-generated API documentation is available [here](https://rawgit.com/Tvaroh/moreartyjs/master/doc/index.html).

# Usage #

To start using Morearty.js add the [script]() to the page or load it with your favorite AMD loader, e.g. [Require.js](http://requirejs.org/), and create Morearty context using [createContext](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Morearty.html#createContext) method:

```javascript
var Ctx = Morearty.createContext(
  { // initial state
    nowShowing: 'all',
    items: [{
      title: 'My first task',
      completed: false,
      editing: false
    }]
  },
  { // configuration
    requestAnimationFrameEnabled: true
  }
);
```

Next, create Bootstrap component which will initialize the context and plug it into your application:

```javascript
var Bootstrap = React.createClass({
  componentWillMount: function () {
    Ctx.init(this);
  },

  render: function () {
    return React.withContext({ morearty: Ctx }, function () { // pass Morearty context downside
      return App({ binding: Ctx.getBinding() });              // your App component
    });
  }
});
```

When you create components this way, they acquire correctly defined `shouldComponentUpdate` method which uses component's binding (if any) to determine if its state was changed. By default state is transferred to sub-components in `binding` attribute and can be retrieved using `getDefaultBinding` method.

# TodoMVC #
To continue this introduction [TodoMVC](http://todomvc.com/) implementation based on Morearty.js will be used ([repository](https://github.com/Tvaroh/todomvc-moreartyjs), [application](https://rawgit.com/Tvaroh/todomvc-moreartyjs/master/index.html)). You should have some previous React knowledge to follow painlessly, only Morearty-specific parts will be described.

## App component ##
Having defined Bootstrap module let's now create main application module `App`:

```javascript
var NOW_SHOWING = Object.freeze({ ALL: 'all', ACTIVE: 'active', COMPLETED: 'completed' });

var App = React.createClass({
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
    var _ = React.DOM;
    return  _.section({ id: 'todoapp' },
      Header({ binding: binding }),
      TodoList({ binding: binding }),
      Footer({ binding: binding })
    );
  }
});
```

Notice that `App` uses `getDefaultBinding` method to retrieve its state binding and delegate it to its children. See `getDefaultBinding` API [doc](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Morearty.Mixin.html#getDefaultBinding) for the discussion of the default binding concept.

## Header component ##

```javascript
var Header = React.createClass({
  mixins: [Morearty.Mixin],

  componentDidMount: function () {
    this.refs.newTodo.getDOMNode().focus(); // focus on show
  },

  onAddTodo: function (event) {
    var title = event.target.value;
    if (title) {
      this.getDefaultBinding().update('items', function (todos) { // add new item
        return todos.push(Immutable.Map({
          title: title,
          completed: false,
          editing: false
        }));
      });
      event.target.value = '';
    }
  },

  render: function () {
    var _ = React.DOM;
    return _.header({ id: 'header' },
      _.h1(null, 'todos'),
      Morearty.DOM.input({ // requestAnimationFrame-friendly wrapper around input
        id: 'new-todo',
        ref: 'newTodo',
        placeholder: 'What needs to be done?',
        onKeyPress: Morearty.Callback.onEnter(this.onAddTodo)
      })
    );
  }
});
```

In `onAddTodo` method component state is [updated](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#update) by appending new TODO item to the list. `render` method output custom `input` component version suitable for [rendering in requestAnimationFrame](https://github.com/Tvaroh/moreartyjs#requestanimationframe-support).

## TodoList component ##

```javascript
var TodoList = React.createClass({
  mixins: [Morearty.Mixin],

  onToggleAll: function (event) {
    var completed = event.target.checked;
    this.getDefaultBinding().update('items', function (items) {
      return items.map(function (item) {
        return item.set('completed', completed);
      }).toVector();
    });
  },

  render: function () {
    var binding = this.getDefaultBinding();
    var nowShowing = binding.val('nowShowing');
    var itemsBinding = binding.sub('items');
    var items = itemsBinding.val();

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
      return isShown(item) ? TodoItem({ binding: itemsBinding.sub(index) }) : null;
    };

    var allCompleted = !items.find(function (item) {
      return !item.get('completed');
    });

    var _ = React.DOM;
    var ctx = this.getMoreartyContext();
    return _.section({ id: 'main' },
      items.length ? Morearty.DOM.input({ id: 'toggle-all', type: 'checkbox', checked: allCompleted, onChange: this.onToggleAll }) : null,
      _.ul({ id: 'todo-list' },
        items.map(renderTodo).toArray()
      )
    );
  }
});
```

`onToggleAll` callback sets `completed` property on all items. Note how state is transferred to the children: only the relevant sub-state is passed using [sub](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#sub) method which creates a sub-binding pointing deeper into global state. So, TODO item can only access and modify its own cell, and the rest of application state is protected from incidental modification. [val](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#val) method allows to retrieve the value stored in the binding or in its sub-path.

## TodoItem ##

```javascript
var TodoItem = React.createClass({
  mixins: [Morearty.Mixin],

  componentDidUpdate: function () {
    var ctx = this.getMoreartyContext();
    if (ctx.isChanged(this.getDefaultBinding().sub('editing'))) {
      var node = this.refs.editField.getDOMNode();
      node.focus();
      node.setSelectionRange(node.value.length, node.value.length);
    }
  },

  onToggleCompleted: function (event) {
    this.getDefaultBinding().set('completed', event.target.checked);
    return false;
  },

  onToggleEditing: function (editing) {
    this.getDefaultBinding().set('editing', editing);
    return false;
  },

  onEnter: function (event) {
    this.getDefaultBinding().atomically()
      .set('title', event.target.value)
      .set('editing', false)
      .commit();
    return false;
  },

  render: function () {
    var binding = this.getDefaultBinding();
    var item = binding.val();

    var liClass = React.addons.classSet({
      completed: item.get('completed'),
      editing: item.get('editing')
    });
    var title = item.get('title');

    var _ = React.DOM;
    var ctx = this.getMoreartyContext();
    return _.li({ className: liClass },
      _.div({ className: 'view' },
        Morearty.DOM.input({
          className: 'toggle',
          type: 'checkbox',
          checked: item.get('completed'),
          onChange: this.onToggleCompleted
        }),
        _.label({ onClick: this.onToggleEditing.bind(null, true) }, title),
        _.button({ className: 'destroy', onClick: binding.delete.bind(binding, '') })
      ),
      Morearty.DOM.input({
        className: 'edit',
        ref: 'editField',
        value: title,
        onChange: Morearty.Callback.set(binding, 'title'),
        onKeyPress: Morearty.Callback.onEnter(this.onEnter),
        onBlur: this.onToggleEditing.bind(null, false)
      })
    )
  }
});
```

Here component title is written to the global state using [set](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Callback.html#set) helper when text in changed. To delete the item no callback needs to be passed from the parent: item component just calls Binding's [delete](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#delete) method which removes it from the list of items. In `onEnter` method transaction is used to prevent re-rendering between state transitions. It effectively notifies global listeners once on [commit](https://rawgit.com/Tvaroh/moreartyjs/master/doc/TransactionContext.html#commit).

## Footer component ##

```javascript
var Footer = React.createClass({
  mixins: [Morearty.Mixin],

  onClearCompleted: function () {
    this.getDefaultBinding().update('items', function (items) {
      return items.filter(function (item) {
        return !item.get('completed');
      }).toVector();
    });
  },

  render: function () {
    var binding = this.getDefaultBinding();
    var nowShowing = binding.val('nowShowing');

    var items = binding.val('items');
    var completedItemsCount = items.reduce(function (acc, item) {
      return item.get('completed') ? acc + 1 : acc;
    }, 0);

    var _ = React.DOM;
    return _.footer({ id: 'footer' },
      _.span({ id: 'todo-count' }, items.length - completedItemsCount + ' items left'),
      _.ul({ id: 'filters' },
        _.li(null, _.a({ className: nowShowing === NOW_SHOWING.ALL ? 'selected' : '', href: '#/' }, 'All')),
        _.li(null, _.a({ className: nowShowing === NOW_SHOWING.ACTIVE ? 'selected' : '', href: '#/active' }, 'Active')),
        _.li(null, _.a({ className: nowShowing === NOW_SHOWING.COMPLETED ? 'selected' : '', href: '#/completed' }, 'Completed'))
      ),
      completedItemsCount ?
        _.button({ id: 'clear-completed', onClick: this.onClearCompleted },
            'Clear completed (' + completedItemsCount + ')'
        ) :
        null
    );
  }
});
```

Nothing special here so let's jump straight to...

## Starting the application ##

```javascript
React.renderComponent(
  Bootstrap(),
  document.getElementById('root')
);
```

Just usual React routine here.

## Principal differences from raw React ##

You can compare this Morearty-based TodoMVC implementation to the official React [version](https://github.com/tastejs/todomvc/tree/gh-pages/architecture-examples/react). Main highlights are:

* No callbacks are passed to sub-components. This becomes especially useful when you find yourself trying to transfer a callback to a component's grand-children (you may never know how you DOM may be restructured after a redesign). There is nothing inherently wrong in passing callbacks to sub-components, but in many cases this can be avoided.
* No hacks in code simulating immutable state and other tricks (look at the comments withing React version sources).
* Reasoning about the application is much simpler!
* Each component gets `shouldComponentUpdate` method, no need to define it manually (but you can if you like).
* Less code.

# Custom shouldComponentUpdate #

If customized `shouldComponentUpdate` is needed, declare `shouldComponentUpdateOverride` method accepting original `shouldComponentUpdate`, `nextProps`, and `nextState`, e.g.:

```javascript
shouldComponentUpdateOverride: function (shouldComponentUpdate, nextProps) {
  return shouldComponentUpdate() ||
    (this.props && nextProps && this.props.language !== nextProps.language);
}
```

# Multi-binding components and default binding #

For some components single binding may be not enough. For example, you display some data but display language is set globally in other state section. You can choose to pass language as an attribute and override `shouldComponentUpdate` method as above (if you don't do this, the component won't be re-rendered on attribute change). Alternatively, you can supply multiple bindings to your component in JavaScript object:

```javascript
render: function () {
  return MyComponent({ binding: { default: defaultBinding, language: languageBinding } });
}
```

When checking for modifications every component's binding will be assumed.

To comfortably extend your components to multiple bindings default binding concept is introduced. You start with single binding and acquire it using `this.getDefaultBinding()` method which always return single binding for single-binding components (no matter how it was passed - directly or in an object) and binding with key `default` (hence the name) for multi-binding components. When you move to multiple-binding you access your auxiliary bindings with `this.getBinding(name)` method while existing code stays intact:

```javascript
var binding = this.getDefaultBinding(); // no changes required
var languageBinding = this.getBinding('language');
var language = languageBinding.val();
// ...
```

# Default state publication #

Often, component needs to initialize its state on mount. In Morearty model, when component is mounted, its state may already contain some data. For example, you can persist application state to local storage by converting it to [transit-js](https://github.com/cognitect/transit-js) format (helpful [gist](https://gist.github.com/Tvaroh/52efbe8f4541ca537908) supporting sets and ordered maps) and restore it on start. For this to work Morearty supports four merge strategies out of the box and the custom one:

* `Morearty.MERGE_STRATEGY.OVERWRITE` - overwrite existing state;
* `Morearty.MERGE_STRATEGY.OVERWRITE_EMPTY` - overwrite if existing state is empty (undefined or null);
* `Morearty.MERGE_STRATEGY.MERGE_PRESERVE` (default) - perform deep merge preserving existing values;
* `Morearty.MERGE_STRATEGY.MERGE_REPLACE` - perform deep merge replacing existing values;
* custom function accepting `currentState`, `defaultState` and returning merge result.

To initialize component's state on mount declare `getDefaultState` method:

```javascript
getDefaultState: function () {
  return Immutable.Map({
    name: null,
    status: '...'
  });
}
```

or for multi-binding component:

```javascript
getDefaultState: function () {
  return {
    default: Immutable.Map({
      name: null,
      status: '...'
    }),
    language: 'en'
  };
}
```

You can customize merge strategy by declaring `getMergeStrategy` method:

```javascript
getMergeStrategy: function () {
  return Morearty.MERGE_STRATEGY.OVERWRITE;
}
```

or for multi-binding component:

```javascript
getMergeStrategy: function () {
  return {
    default: Morearty.MERGE_STRATEGY.MERGE_PRESERVE,
    language: Morearty.MERGE_STRATEGY.OVERWRITE
  };
}
```

# requestAnimationFrame support #

Morearty supports rendering in [requestAnimationFrame](https://developer.mozilla.org/en/docs/Web/API/window.requestAnimationFrame). Just pass `requestAnimationFrameEnabled` property to `createContext` function. See [details](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Morearty.html#createContext) in the API documentation.

Note that enabling this feature will produce strange results when using controlled inputs, e.g. focus jumping to the end of the line. To fix that, Morearty provides requestAnimationFrame-friendly wrappers `ctx.DOM.input`, `ctx.DOM.textarea`, and `ctx.DOM.option` (where `ctx` is Morearty context instance obtained using `this.getMoreartyContext()` method) like Om [does](https://github.com/swannodette/om/blob/master/src/om/dom.cljs).

# Other features #

* [Util](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Util.html) module with some useful functions;
* [History](https://rawgit.com/Tvaroh/moreartyjs/master/doc/History.html) module well-integrated with [Binding](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html) allowing to painlessly implement undo/redo;
* [Callback](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Callback.html) module;
* binding listeners support: you can listen to state changes and react accordingly;
* and [more](https://github.com/Tvaroh/moreartyjs#api-documentation).

# Future goals by priority #

1. Leverage Immutable cursors.
2. Improve the documentation, provide more examples.
3. Gather community feedback to find areas for improvement.
4. Stabilize API and code.
5. Battle-test the library on more projects.

# Credits

* Alexander Semenov @Tvaroh (author)
* Tim Griesser @tgriesser (collaborator)
* Marat Bektimirov @mbektimirov (collaborator)
