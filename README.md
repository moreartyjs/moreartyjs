# Introduction #

**Morearty.js** is a thin layer on top of [React](http://facebook.github.io/react/index.html) providing better state management facilities in the manner of [Om](https://github.com/swannodette/om) but written in pure JavaScript without any external dependencies.

In its core Morearty implements immutable [Map](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Map.html) and [Vector](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Vector.html) data structures which hold the state of an application. That state is described by a single [Binding](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html) object and all state transitions are performed through it. When an application component needs to delegate a part of its state to a sub-component, it can create a [sub-binding](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#sub) which points to a nested location within the global state and is fully synchronized with the original binding. This way every component knows only what it should know and the entire state is effectively encapsulated. Morearty detects any changes automatically and triggers re-rendering. Each component gets a correctly defined [shouldComponentUpdate](http://facebook.github.io/react/docs/component-specs.html#updating-shouldcomponentupdate) method that compares the component's state using straightforward JavaScript strict equals operator `===`. This is possible due to immutable nature of underlying data structures. So, only the components whose state was altered are re-rendered.

# Download #

Current version is 0.1.2. Browser, AMD, Node.js environments are supported. You can get [production](https://raw.githubusercontent.com/Tvaroh/moreartyjs/master/dist/morearty-0.1.2.min.js) (30kb) and [development](https://raw.githubusercontent.com/Tvaroh/moreartyjs/master/dist/morearty-0.1.2.js) (70kb) versions. Or just `npm install morearty`. In browser loading with [Require.js](http://requirejs.org/) is preferable.

# API documentation #

Auto-generated API documentation is available [here](https://rawgit.com/Tvaroh/moreartyjs/master/doc/index.html).

# Usage #

To start using Morearty.js add the [script]() to the page or load it with your favorite AMD loader, e.g. [Require.js](http://requirejs.org/), and create Morearty context using [createContext](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Morearty.html#createContext) method:

```javascript
var Ctx = Morearty.createContext(React, {
  // your initial application state
  nowShowing: 'all',
  items: [{
    title: 'My first task',
    completed: false,
    editing: false
  }]
});
```

All further activities will be performed through this context which exposes a set of modules, mainly:

* Data.[Map](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Map.html) - immutable persistent Map based on hash trie with Java-like hashcode implementation;
* Data.[Vector](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Vector.html) - immutable Vector currently based on array-copying;
* [Callback](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Callback.html) - callback related utilities.

Next, create Bootstrap component which will initialize the context and pass it to your application:

```javascript
var Bootstrap = Ctx.createClass({
  componentWillMount: function () {
    Ctx.init(this);
  },

  render: function () {
    return App({ state: Ctx.state() });
  }
});
```

When you create components this way, they acquire correctly defined `shouldComponentUpdate` method which uses component's binding (if any) to determine if its state was changed. By default state is transferred to sub-components in `state` attribute and can be retrieved using `getState` method. `init` method creates global listener which queues re-rendering on [requestAnimationFrame](https://developer.mozilla.org/en/docs/Web/API/window.requestAnimationFrame) (if available) on state transitions.

# TodoMVC #
To continue this introduction [TodoMVC](http://todomvc.com/) implementation based on Morearty.js will be used ([repository](https://github.com/Tvaroh/todomvc-moreartyjs), [application](https://rawgit.com/Tvaroh/todomvc-moreartyjs/master/index.html)). You should have some previous React knowledge to follow painlessly, only Morearty-specific parts will be described.

## App component ##
Having defined Bootstrap module let's now create main application module `App`:

```javascript
var NOW_SHOWING = Object.freeze({ ALL: 'all', ACTIVE: 'active', COMPLETED: 'completed' });

var App = Ctx.createClass({
  componentDidMount: function () {
    var state = this.getState();
    Router({
      '/': state.assoc.bind(state, 'nowShowing', NOW_SHOWING.ALL),
      '/active': state.assoc.bind(state, 'nowShowing', NOW_SHOWING.ACTIVE),
      '/completed': state.assoc.bind(state, 'nowShowing', NOW_SHOWING.COMPLETED)
    }).init();
  },

  render: function () {
    var state = this.getState();
    var _ = Ctx.React.DOM;
    return _.section({ id: 'todoapp' },
      Header({ state: state }),
      TodoList({ state: state }),
      Footer({ state: state })
    );
  }
});
```

Notice that `App` uses `getState` method to retrieve its state binding and delegate it to its children.

## Header component ##

```javascript
var Header = Ctx.createClass({
  componentDidMount: function () {
    this.refs.newTodo.getDOMNode().focus();
  },

  onAddTodo: function (event) {
    var title = event.target.value;
    if (title) {
      this.getState().update('items', function (todos) {
        return todos.append(Ctx.Data.Map.fill(
          'title', title,
          'completed', false,
          'editing', false
        ));
      });
      event.target.value = '';
    }
  },

  render: function () {
    var _ = Ctx.React.DOM;
    return _.header({ id: 'header' },
      _.h1(null, 'todos'),
      _.input({
        id: 'new-todo',
        ref: 'newTodo',
        placeholder: 'What needs to be done?',
        onKeyPress: Ctx.Callback.onEnter(this.onAddTodo)
      })
    );
  }
});
```

In `onAddTodo` method component state is [updated](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#update) by appending new TODO item to the list.

## TodoList component ##

```javascript
var TodoList = Ctx.createClass({
  onToggleAll: function (event) {
    var completed = event.target.checked;
    this.getState().update('items', function (items) {
      return items.map(function (item) {
        return item.assoc('completed', completed);
      });
    });
  },

  render: function () {
    var state = this.getState();
    var nowShowing = state.val('nowShowing');
    var itemsBinding = state.sub('items');
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
      return isShown(item) ? TodoItem({ state: itemsBinding.sub(index) }) : null;
    };

    var allCompleted = !items.find(function (item) {
      return !item.get('completed');
    });

    var _ = Ctx.React.DOM;
    return _.section({ id: 'main' },
      items.size() ? _.input({ id: 'toggle-all', type: 'checkbox', checked: allCompleted, onChange: this.onToggleAll }) : null,
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
var TodoItem = Ctx.createClass({
  componentDidUpdate: function () {
    if (this.getState().val('editing')) {
      var node = this.refs.editField.getDOMNode();
      node.focus();
      node.setSelectionRange(node.value.length, node.value.length);
    }
  },

  onToggleCompleted: function (event) {
    this.getState().assoc('completed', event.target.checked);
    return false;
  },

  onToggleEditing: function () {
    this.getState().update('editing', Ctx.Util.not);
    return false;
  },

  onEnter: function (event) {
    this.getState().atomically()
      .assoc('title', event.target.value)
      .assoc('editing', false)
      .commit();
    return false;
  },

  render: function () {
    var state = this.getState();
    var item = state.val();

    var liClass = Ctx.React.addons.classSet({
      completed: item.get('completed'),
      editing: item.get('editing')
    });
    var title = item.get('title');

    var _ = Ctx.React.DOM;
    return _.li({ className: liClass },
      _.div({ className: 'view' },
        _.input({
          className: 'toggle',
          type: 'checkbox',
          checked: item.get('completed'),
          onChange: this.onToggleCompleted
        }),
        _.label({ onClick: this.onToggleEditing }, title),
        _.button({ className: 'destroy', onClick: state.dissoc.bind(state, '') })
      ),
      _.input({
        className: 'edit',
        ref: 'editField',
        value: title,
        onChange: Ctx.Callback.assoc(state, 'title'),
        onKeyPress: Ctx.Callback.onEnter(this.onEnter),
        onBlur: this.onToggleEditing
      })
    )
  }
});
```

Here component title is written to the global state using [assoc](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Callback.html#assoc) helper when text in changed. To delete the item no callback needs to be passed from the parent: item component just calls Binding's [dissoc](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html#dissoc) method which removes it from the list of items. In `onEnter` method transaction is used to prevent re-rendering between state transitions. It effectively notifies global listeners once on [commit](https://rawgit.com/Tvaroh/moreartyjs/master/doc/TransactionContext.html#commit).

## Footer component ##

```javascript
var Footer = Ctx.createClass({
  onClearCompleted: function () {
    this.getState().update('items', function (items) {
      return items.filter(function (item) {
        return !item.get('completed');
      });
    });
  },

  render: function () {
    var state = this.getState();
    var nowShowing = state.val('nowShowing');

    var items = state.val('items');
    var completedItems = items.filter(function (item) {
      return item.get('completed');
    });
    var completedItemsCount = completedItems.size();

    var _ = Ctx.React.DOM;
    return _.footer({ id: 'footer' },
      _.span({ id: 'todo-count' }, items.size() - completedItemsCount + ' items left'),
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
Ctx.React.renderComponent(
  Bootstrap(),
  document.getElementById('root')
);
```

Just usual React routine here.

# Principal differences from React #

You can compare this Morearty-based TodoMVC implementation to the official React [version](https://github.com/tastejs/todomvc/tree/gh-pages/architecture-examples/react). Main highlights are:

* No callbacks are passed to sub-components. This becomes especially useful when you find yourself trying to transfer a callback to a component's grand-children (you may never know how you DOM may be restructured after a redesign). There is nothing inherently wrong in passing callbacks to sub-components, but in many cases this can be avoided.
* No hacks in code simulating immutable state and other tricks (look at the comments withing React version sources).
* Reasoning about the application is much simpler!
* Each component gets `shouldComponentUpdate` method, no need to define it manually (but you can if you like).
* Less code.

# Other features #

* [Util](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Util.html) and [Data.Util](https://rawgit.com/Tvaroh/moreartyjs/master/doc/DataUtil.html) modules with a bunch of useful functions;
* [History](https://rawgit.com/Tvaroh/moreartyjs/master/doc/History.html) module well-integrated with [Binding](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Binding.html) allowing to painlessly implement undo/redo;
* [Callback](https://rawgit.com/Tvaroh/moreartyjs/master/doc/Callback.html) module;
* binding listeners support: you can listen to state changes and react accordingly;
* and [more](https://github.com/Tvaroh/moreartyjs#api-documentation).

# Current status #

Version 0.1.2 is [ready](https://github.com/Tvaroh/moreartyjs#download). Test coverage is almost 100% with more than 400 test cases. Map performance is very good: approximately 3-times faster then [Mori](http://swannodette.github.io/mori/)'s implementation for additions and retrievals. Vector modification is 2-3 times slower than Mori's, but has significantly faster iteration. This is due to underlying array-copying based implementation.

# Future goals by priority #

1. Improve the documentation, provide more examples.
2. Gather community feedback to find areas for improvement.
3. Stabilize API and code.
4. Battle-test the library on more projects.
5. Rewrite Vector using more efficient persistent immutable data structure keeping its contract intact.
