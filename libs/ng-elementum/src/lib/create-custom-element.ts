import {
  ApplicationConfig,
  ComponentMirror,
  getPlatform,
  InputSignal,
  mergeApplicationConfig,
  provideZonelessChangeDetection,
  reflectComponentType,
  runInInjectionContext,
  Signal,
  Type,
  WritableSignal,
} from '@angular/core';

import { NgElementumStrategy, UNAVAILABLE } from './component-strategy';
import { getDefaultAttributeToPropertyInputs } from './utils';
import { offCreatePlatform, onCreatePlatform } from './platform';
import { createApplicationSync } from './create-application-sync';

/**
 * Prototype for a class constructor based on an Angular component
 * that can be used for custom element registration. Implemented and returned
 * by the {@link createCustomElement createCustomElement() function}.
 *
 * @see [Angular Elements Overview](guide/elements "Turning Angular components into custom elements")
 *
 * @publicApi
 */
export interface NgElementumConstructor<
  T,
  M extends keyof T,
  S extends keyof T
> {
  /**
   * Initializes a constructor instance.
   */
  new (): NgElementum &
    ExposeInputs<T> &
    ExposeSignals<T, S> &
    ExposeMethods<T, M>;
}

/**
 * Implements the functionality needed for a custom element.
 *
 * @publicApi
 */
export abstract class NgElementum extends HTMLElement {
  readonly #ngElementumInputsCache = new Map<string, any>();
  readonly #ngElementumSignalsCache = new Map<string, any>();
  readonly #ngElementumComponentType: ComponentMirror<any>;
  readonly #ngElementumAttributeInputs: Record<string, [string, any]>;
  readonly #ngElementumOnCreatePlatformCallback = () =>
    this.connectedCallback();
  #ngElementumCachedStrategy: NgElementumStrategy | undefined;
  #ngElementumPreventRemove = false;
  #ngElementumConfig: NgElementumConfig<string, string>;

  constructor(
    componentType: ComponentMirror<any>,
    config: NgElementumConfig<string, string>
  ) {
    super();

    this.#ngElementumConfig = config;
    this.#ngElementumComponentType = componentType;
    this.#ngElementumAttributeInputs = getDefaultAttributeToPropertyInputs(
      componentType.inputs
    );
  }

  /**
   * Prototype for a handler that responds to a change in an observed attribute.
   * @param attrName The name of the attribute that has changed.
   * @param oldValue The old value of the attribute.
   * @param newValue The new value of the attribute.
   * @returns Nothing.
   */
  attributeChangedCallback(
    attrName: string,
    oldValue: string,
    newValue: string
  ) {
    const [propName] = this.#ngElementumAttributeInputs[attrName];

    this.ngElementumSetValue(propName, newValue);
  }

  /**
   * Prototype for a handler that responds to the insertion of the custom element in the DOM.
   * @returns Nothing.
   */
  connectedCallback() {
    const strategy = this.#ngElementumStrategy;

    if (!strategy) {
      onCreatePlatform(this.#ngElementumOnCreatePlatformCallback);
      return;
    }

    strategy.connect(this);

    for (const [attrName, [propName, transform]] of Object.entries(
      this.#ngElementumAttributeInputs
    )) {
      if (!this.hasAttribute(attrName)) {
        continue;
      }

      const value = this.getAttribute(attrName)!;

      strategy.setValue(propName, transform ? transform(value) : value);
    }

    for (const [key, value] of this.#ngElementumInputsCache) {
      strategy.setValue(key, value);
    }
  }

  /**
   * Prototype for a handler that responds to the deletion of the custom element from the DOM.
   * @returns Nothing.
   */
  disconnectedCallback() {
    offCreatePlatform(this.#ngElementumOnCreatePlatformCallback);
    const strategy = this.#ngElementumCachedStrategy;

    if (!strategy) {
      return;
    }

    strategy.disconnect();
  }

  protected ngElementumGetValue(propName: string): any {
    if (this.#ngElementumCachedStrategy) {
      const value = this.#ngElementumCachedStrategy.getValue(propName);

      if (value !== UNAVAILABLE) {
        this.#ngElementumInputsCache.set(propName, value);
      }
    }

    return this.#ngElementumInputsCache.get(propName) ?? null;
  }

  protected ngElementumSetValue(propName: string, newValue: string): void {
    this.#ngElementumInputsCache.set(propName, newValue);

    this.#ngElementumCachedStrategy?.setValue(propName, newValue);
  }

  setSignalValue(propName: string, newValue: string): void {
    this.#ngElementumSignalsCache.set(propName, newValue);

    this.#ngElementumCachedStrategy?.setValue(propName, newValue);
  }

  override remove(): void {
    if (this.#ngElementumPreventRemove) {
      if (this.shadowRoot) {
        this.shadowRoot.innerHTML = '';
      } else {
        this.innerHTML = '';
      }
    } else {
      super.remove();
    }
  }

  override attachShadow(init: ShadowRootInit): ShadowRoot {
    return this.shadowRoot ?? super.attachShadow(init);
  }

  #ngElementumCreateStrategy(): NgElementumStrategy | undefined {
    const applicationConfig = getApplicationConfig(
      this.#ngElementumConfig.applicationConfig
    );

    if (!applicationConfig) {
      return;
    }

    const applicationRef = createApplicationSync(applicationConfig);

    if (applicationRef.destroyed) {
      return;
    }

    getPlatform()?.onDestroy(() => {
      this.#ngElementumPreventRemove = true;
      applicationRef.destroy();
      this.#ngElementumPreventRemove = false;

      if (this.isConnected) {
        onCreatePlatform(this.#ngElementumOnCreatePlatformCallback);
      }
    });

    applicationRef.onDestroy(() => {
      this.#ngElementumCachedStrategy = undefined;
    });

    return new NgElementumStrategy(
      this.#ngElementumComponentType.type,
      applicationRef
    );
  }

  /**
   * The strategy that controls how a component is transformed in a custom element.
   */
  get #ngElementumStrategy(): NgElementumStrategy | undefined {
    return (this.#ngElementumCachedStrategy ??=
      this.#ngElementumCreateStrategy());
  }

  protected get ngElementumCachedStrategy(): NgElementumStrategy | undefined {
    return this.#ngElementumCachedStrategy;
  }
}

export type ExtractMethods<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends (...args: any[]) => any
      ? T[K] extends Signal<any>
        ? never
        : K
      : never
    : never;
}[keyof T];

export type ExtractSignals<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends Signal<any>
      ? K
      : never
    : never;
}[keyof T];

type UnwrapSignal<T> = T extends Signal<infer V> ? V | null : never;

export type ExposeInputs<T> = {
  -readonly [K in keyof T as T[K] extends InputSignal<any>
    ? K
    : never]: UnwrapSignal<T[K]>;
};

export type ExposeMethods<T, M extends keyof T> = {
  [K in keyof T as M extends K ? K : never]: T[K] extends (
    ...args: infer A
  ) => infer R
    ? (...args: A) => R extends Promise<any> ? R : Promise<R>
    : never;
};

export type ExposeSignals<T, S extends keyof T> = {
  readonly [K in keyof T as S extends K
    ? T[K] extends Signal<any>
      ? T[K] extends WritableSignal<any>
        ? never
        : K
      : never
    : never]: UnwrapSignal<T[K]>;
} & {
  -readonly [K in keyof T as S extends K
    ? T[K] extends WritableSignal<any>
      ? K
      : never
    : never]: UnwrapSignal<T[K]>;
};

/**
 * A configuration that initializes an NgElementConstructor with the
 * dependencies and strategy it needs to transform a component into
 * a custom element class.
 *
 * @publicApi
 */
export type NgElementumConfig<M extends string, S extends string> = {
  /**
   * An optional list of methods to expose on the custom element.
   */
  exposedMethods?: M[];
  /**
   * An optional list of signals to expose on the custom element.
   */
  exposedSignals?: S[];
  /**
   * The config for application.
   *
   * If function passed, it will be called within the platform injection context.
   */
  applicationConfig: ApplicationConfig | (() => ApplicationConfig);
};

/**
 *  @description Creates a custom element class based on an Angular component.
 *
 * Builds a class that encapsulates the functionality of the provided component and
 * uses the configuration information to provide more context to the class.
 * Takes the component factory's inputs and outputs to convert them to the proper
 * custom element API and add hooks to input changes.
 *
 * The configuration's injector is the initial injector set on the class,
 * and used by default for each created instance.This behavior can be overridden with the
 * static property to affect all newly created instances, or as a constructor argument for
 * one-off creations.
 *
 * @see [Angular Elements Overview](guide/elements "Turning Angular components into custom elements")
 *
 * @param component The component to transform.
 * @param config A configuration that provides initialization information to the created class.
 * @returns The custom-element construction class, which can be registered with
 * a browser's `CustomElementRegistry`.
 *
 * @publicApi
 */
export function createCustomElement<
  T,
  const M extends ExtractMethods<T>,
  const S extends ExtractSignals<T>
>(
  component: Type<T>,
  config: NgElementumConfig<M, S>
): NgElementumConstructor<T, M, S> {
  const componentType = reflectComponentType(component);

  if (!componentType) {
    throw new Error('Cannot read component type');
  }

  const { inputs } = componentType;

  const attributeToPropertyInputs = getDefaultAttributeToPropertyInputs(inputs);

  class NgElementumImpl extends NgElementum {
    // Work around a bug in closure typed optimizations(b/79557487) where it is not honoring static
    // field externs. So using quoted access to explicitly prevent renaming.
    static readonly ['observedAttributes'] = Object.keys(
      attributeToPropertyInputs
    );

    constructor() {
      super(componentType!, config);
    }
  }

  for (const exposedMethod of new Set(config.exposedMethods)) {
    if (typeof component.prototype[exposedMethod] !== 'function') {
      throw new Error(
        `Cannot expose method "${String(
          exposedMethod
        )}" because it is not a function of the component.`
      );
    }

    Object.defineProperty(NgElementumImpl.prototype, exposedMethod, {
      value: function (this: NgElementumImpl, ...args: any[]) {
        if (!this.isConnected) {
          throw new Error('Component is detached from DOM');
        }

        if (!this.ngElementumCachedStrategy) {
          throw new Error('Component is not initialized');
        }

        return this.ngElementumCachedStrategy.applyMethod(exposedMethod, args);
      },
    });
  }

  for (const exposedSignal of new Set(config.exposedSignals)) {
    Object.defineProperty(NgElementumImpl.prototype, exposedSignal, {
      get(this: NgElementumImpl) {
        return this.ngElementumGetValue(exposedSignal);
      },
      set(this: NgElementumImpl, newValue: any) {
        this.ngElementumSetValue(exposedSignal, newValue);
      },
      configurable: false,
      enumerable: true,
    });
  }

  // Add getters and setters to the prototype for each property input.
  inputs.forEach(({ propName }) => {
    Object.defineProperty(NgElementumImpl.prototype, propName, {
      get(this: NgElementumImpl): any {
        return this.ngElementumGetValue(propName);
      },
      set(this: NgElementumImpl, newValue: any): void {
        this.ngElementumSetValue(propName, newValue);
      },
      configurable: false,
      enumerable: true,
    });
  });

  return NgElementumImpl as any;
}

function addZoneless(applicationConfig: ApplicationConfig): ApplicationConfig {
  return mergeApplicationConfig(applicationConfig, {
    providers: [provideZonelessChangeDetection()],
  });
}

function getApplicationConfig(
  configOrResolver: ApplicationConfig | (() => ApplicationConfig)
): ApplicationConfig | undefined {
  if (typeof configOrResolver === 'function') {
    const platformRef = getPlatform();

    if (platformRef) {
      // TODO test config recreation
      return addZoneless(
        runInInjectionContext(platformRef.injector, configOrResolver)
      );
    }

    return;
  }

  return addZoneless(configOrResolver);
}
