/// <reference path="../node_modules/immutable/dist/immutable.d.ts" />

declare module 'morearty' {
  import I = require('immutable');
  import Map = I.Map;
  import Iterable = I.Iterable;

  interface ContextConfig {
    requestAnimationFrameEnabled: boolean;
  }

  interface IMergeStrategy {
    OVERWRITE: string;
    OVERWRITE_EMPTY: string;
    MERGE_PRESERVE: string;
    MERGE_REPLACE: string;
  }

  class Context {
    constructor(initialState: Map<any, any>, initialMetaState: Map<any, any>, configuration: ContextConfig);
    getBinding(): Binding;
    getMetaBinding(): Binding;
    getCurrentState(): Map<any, any>;
    getPreviousState(): Map<any, any>;
    getCurrentMeta(): Map<any, any>;
    getPreviousMeta(): Map<any, any>;
    resetState(subpath: string, options: Object);
    resetState(subpath: string[], options: Object);
    replaceState(newState: Map<any, any>, newMetaState: Map<any, any>, options: {notify: boolean});
    isChanged(binding: Binding, subpath: string, compare: (val1: Iterable<any, any>, val2: Iterable<any, any>) => boolean);
    isChanged(binding: Binding, subpath: string[], compare: (val1: Iterable<any, any>, val2: Iterable<any, any>) => boolean);
    init(rootComp: Object);
    queueFullUpdate();
  }

  export interface Mixin {
    contextTypes: {morearty: () => Context};
    getMoreartyContext(): Context;
    getBinding(name: string): Binding;
    getBinding(name: string): Object;
    getDefaultBinding(): Binding;
    getPreviousState(): Iterable<any, any>;
    componentWillMount();
    shouldComponentUpdate(nextProps: Object, nextState: Object);
    addBindingListener(binding: Binding, subpath: string, cb: (c: ChangesDescriptor) => void)
    addBindingListener(binding: Binding, subpath: string[], cb: (c: ChangesDescriptor) => void)
    componentWillUnmount();
  }

  export var MergeStrategy: IMergeStrategy;

  export function createContext(
    initialState: Map<any,any>,
    initialMetaState: Map<any,any>,
    options: ContextConfig
  ): Context;

  export class Binding {
    constructor(backingValueHolder, metaBinding, path, options, internals);
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
