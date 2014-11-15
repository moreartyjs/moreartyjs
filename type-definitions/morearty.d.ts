/// <reference path="../node_modules/immutable/dist/immutable.d.ts" />

import I = require('immutable');

declare module 'morearty' {

  class Context {
    constructor(initialState: I.Map<any, any>, initialMetaState: I.Map<any, any>, configuration: Object);
    getBinding(): Binding;
    getMetaBinding(): Binding;
    getCurrentState(): I.Map<any, any>;
    getPreviousState(): I.Map<any, any>;
    getCurrentMeta(): I.Map<any, any>;
    getPreviousMeta(): I.Map<any, any>;
    resetState(subpath: string, options: Object);
    resetState(subpath: string[], options: Object);
    replaceState(newState: I.Map<any, any>, newMetaState: I.Map<any, any>, options: {notify: boolean});
    isChanged(binding: Binding, subpath: string, compare: (val1: I.Iterable<any, any>, val2: I.Iterable<any, any>) => boolean);
    isChanged(binding: Binding, subpath: string[], compare: (val1: I.Iterable<any, any>, val2: I.Iterable<any, any>) => boolean);
    init(rootComp: Object);
    queueFullUpdate();
  }

  export interface Mixin {
    //contextTypes: {morearty: () => Context};
    getMoreartyContext(): Context;
    getBinding(name: string): Binding;
    getBinding(name: string): Object;
    getDefaultBinding(): Binding;
    getPreviousState(): I.Iterable<any, any>;
    componentWillMount();
    shouldComponentUpdate(nextProps: Object, nextState: Object);
    addBindingListener(binding: Binding, subpath: string, cb: (c: ChangesDescriptor) => void)
    componentWillUnmount();
  }

  export module Binding {

  }

  export class Binding {

  }

  export module Util {

  }

  export module Callback {

  }

  export module DOM {

  }

  export module ChangesDescriptor {

  }

  export interface ChangesDescriptor {

  }

  var ChangesDescriptor: {
    new()
  };


}
