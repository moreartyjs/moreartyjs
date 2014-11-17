/// <reference path="../node_modules/immutable/dist/immutable.d.ts" />

declare module 'morearty' {
  import I = require('immutable');
  import Map = I.Map;
  import Iterable = I.Iterable;

  // TODO: waiting for union types and type aliases
  // type SubPath = string | Array<string | number>

  interface Comparable {
    (val1: any, val2: any): boolean;
  }

  export interface ContextConfig {
    requestAnimationFrameEnabled: boolean;
  }

  export interface IMergeStrategy {
    OVERWRITE: string;
    OVERWRITE_EMPTY: string;
    MERGE_PRESERVE: string;
    MERGE_REPLACE: string;
  }

  export class Context {
    constructor(initialState: Map<any, any>, initialMetaState: Map<any, any>, configuration: ContextConfig);
    getBinding(): Binding;
    getMetaBinding(): Binding;
    getCurrentState(): Map<any, any>;
    getPreviousState(): Map<any, any>;
    getCurrentMeta(): Map<any, any>;
    getPreviousMeta(): Map<any, any>;
    resetState(subpath: any, options: Object);
    resetState(subpath: any[], options: Object);
    replaceState(newState: Map<any, any>, newMetaState: Map<any, any>, options: {notify: boolean});
    isChanged(binding: Binding, subpath: any, compare: Comparable);
    isChanged(binding: Binding, subpath: any[], compare: Comparable);
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
    addBindingListener(binding: Binding, subpath: any, cb: (c: ChangesDescriptor) => void)
    addBindingListener(binding: Binding, subpath: any[], cb: (c: ChangesDescriptor) => void)
    componentWillUnmount();
  }

  export var MergeStrategy: IMergeStrategy;

  export function createContext(
    initialState: Map<any,any>,
    initialMetaState: Map<any,any>,
    options: ContextConfig
  ): Context;

  export module Binding {

  }

  export class Binding {
    static init(backingValue?: Map<any,any>, metaBinding?: Binding): Binding;
    static asArrayPath(path: any): any[];
    static asStringPath(path: any): string;
    static META_NODE: string;

    constructor(path: any[], sharedInternals: Object /*TODO: add interface*/);

    getPath(): any[];
    withBackingValue(newBackingValue: Map<any,any>);
    isChanged(alternativeBackingValue?: Map<any,any>, compare?: Comparable);
    isRelative(otherBinding: Binding): boolean;
    meta(subpath?: any): Binding;
    unlinkMeta(): void;
    get(subpath?: any): any;
    toJS(subpath?: any): any;
    sub(subpath?: any): Binding;

    update(f: (val: any) => any): Binding;
    update(subpath: any, f: (val: any) => any): Binding;

    set(newValue: any): Binding;
    set(subpath: any, newValue: any): Binding;

    delete(): Binding;
    delete(subpath: any): Binding;

    merge(newValue: any): Binding;
    merge(subpath: any, newValue: any): Binding;
    merge(preserve: boolean, newValue: any): Binding;
    merge(subpath: any, preserve: boolean, newValue: any): Binding;

    clear(): Binding;
    clear(subpath: any): Binding;

    addListener(cb: (changes: ChangesDescriptor) => void): string;
    addListener(subpath: any, cb: (changes: ChangesDescriptor) => void): string;

    addGlobalListener(cb: (changes: ChangesDescriptor) => void): string;
    enableListener(listenerId: string): Binding;
    disableListener(listenerId: string): Binding;
    withDisabledListener(listenerId: string, f: () => any): Binding;
    removeListener(listenerId: string): Binding;
    atomically(): TransactionContext;
  }

  export class TransactionContext {
    constructor(binding: Binding, updates: Array<(val: any) => any>, removals: Array<(val: any) => any>);

    update(f: (val: any) => any): TransactionContext;
    update(binding: Binding, f: (val: any) => any): TransactionContext;
    update(subpath: any, f: (val: any) => any): TransactionContext;
    update(binding: Binding, subpath: any, f: (val: any) => any): TransactionContext;

    set(newValue: any): TransactionContext;
    set(subpath: any, newValue: any): TransactionContext;
    set(binding: Binding, subpath: any, newValue: any): TransactionContext;

    delete(): TransactionContext;
    delete(binding: Binding): TransactionContext;
    delete(subpath: any): TransactionContext;
    delete(binding: Binding, subpath: any): TransactionContext;

    merge(newValue: any): TransactionContext;
    merge(subpath: any, newValue: any): TransactionContext;
    merge(binding: Binding, newValue: any): TransactionContext;
    merge(binding: Binding, subpath: any, newValue: any): TransactionContext;
    merge(binding: Binding, subpath: any, preserve: boolean, newValue: any): TransactionContext;

    clear(subpath?: any): TransactionContext;
    clear(binding: Binding, subpath: any): TransactionContext;

    commit(options?: {notify: boolean}): any[];
  }

  export class ChangesDescriptor {
    constructor(
      path: any[], listenerPath: any[], valueChanged: boolean,
      previousValue: Map<any, any>, previousMeta: Map<any, any>
    );

    getPath(): any[];
    isValueChanged(): boolean;
    isMetaChanged(): boolean;
    getPreviousValue(): any;
    getPreviousMeta(): any;
  }

  export module Util {
    export function identity(x: any): any;
    export function not(x: any): any;
    export function constantly(x: any): () => any;
    export function async(f: () => any): void;
    export function afterComplete(f: () => any, cont: () => any);
    export function undefinedOrNull(x: any);
    export function getPropertyValues(obj: Object): any[];
    export function find(arr: any[], pred: (value: any, index: number, arr: any[]) => any): any;
    export function resolveArgs(args: IArguments, var_args: any): Object;
    export function canRepresentSubpath(x: any): boolean;
    export function assign(target: Object);
  }

  export module Callback {

  }

  export module DOM {

  }

}
