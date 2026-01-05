import {
  ApplicationConfig,
  getPlatform,
  InputSignal,
  mergeApplicationConfig,
  provideZonelessChangeDetection,
  reflectComponentType,
  runInInjectionContext,
  Signal,
  Type,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';

import { ComponentNgElementumStrategyFactory } from './component-factory-strategy';
import {
  NgElementumStrategy,
  NgElementumStrategyFactory,
} from './element-strategy';
import { getDefaultAttributeToPropertyInputs } from './utils';

/**
 * Prototype for a class constructor based on an Angular component
 * that can be used for custom element registration. Implemented and returned
 * by the {@link createCustomElement createCustomElement() function}.
 *
 * @see [Angular Elements Overview](guide/elements "Turning Angular components into custom elements")
 *
 * @publicApi
 */
export interface NgElementumConstructor<P> {
  /**
   * An array of observed attribute names for the custom element,
   * derived by transforming input property names from the source component.
   */
  readonly observedAttributes: string[];

  /**
   * Initializes a constructor instance.
   */
  new (): NgElementum & WithProperties<P>;
}

/**
 * Implements the functionality needed for a custom element.
 *
 * @publicApi
 */
export abstract class NgElementum extends HTMLElement {
  /**
   * The strategy that controls how a component is transformed in a custom element.
   */
  protected abstract ngElementumStrategy: Promise<NgElementumStrategy>;

  /**
   * Prototype for a handler that responds to a change in an observed attribute.
   * @param attrName The name of the attribute that has changed.
   * @param oldValue The old value of the attribute.
   * @param newValue The new value of the attribute.
   * @returns Nothing.
   */
  abstract attributeChangedCallback(
    attrName: string,
    oldValue: string,
    newValue: string
  ): void;

  /**
   * Prototype for a handler that responds to the insertion of the custom element in the DOM.
   * @returns Nothing.
   */
  abstract connectedCallback(): void;

  /**
   * Prototype for a handler that responds to the deletion of the custom element from the DOM.
   * @returns Nothing.
   */
  abstract disconnectedCallback(): void;

  abstract getInputValue(propName: string): any;

  abstract setInputValue(propName: string, value: string): void;
}

/**
 * Additional type information that can be added to the NgElement class,
 * for properties that are added based
 * on the inputs and methods of the underlying component.
 *
 * @publicApi
 */
export type WithProperties<P> = {
  -readonly [property in keyof P]: P[property];
};

type ExtractPublicMethods<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends (...args: any[]) => any
      ? T[K] extends Signal<any>
        ? never
        : K
      : never
    : never;
}[keyof T];

type GetExposedMethods<C extends NgElementumConfig<any>> =
  C['exposedMethods'] extends (infer M extends string)[] ? M : never;

type ExposeMethods<T, C extends NgElementumConfig<T>> = {
  [K in GetExposedMethods<C>]: K extends keyof T
    ? T[K] extends (...args: infer A) => infer R
      ? (...args: A) => R extends Promise<any> ? R : Promise<R>
      : never
    : never;
};

type UnwrapInput<T> = T extends InputSignal<infer V> ? V | null : never;

type ExposeInputs<T> = {
  [K in keyof T as T[K] extends InputSignal<any> ? K : never]: UnwrapInput<
    T[K]
  >;
};

/**
 * A configuration that initializes an NgElementConstructor with the
 * dependencies and strategy it needs to transform a component into
 * a custom element class.
 *
 * @publicApi
 */
export type NgElementumConfig<T> = {
  /**
   * An optional custom strategy factory to use instead of the default.
   * The strategy controls how the transformation is performed.
   */
  strategyFactory?: NgElementumStrategyFactory;
  /**
   * An optional list of methods to expose on the custom element.
   */
  exposedMethods?: ExtractPublicMethods<T>[];
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
export function createCustomElement<T, const C extends NgElementumConfig<T>>(
  component: Type<T>,
  config: C
): NgElementumConstructor<ExposeInputs<T> & ExposeMethods<T, C>> {
  const componentType = reflectComponentType(component);

  if (!componentType) {
    throw new Error('cannot read component type');
  }

  const { inputs } = componentType;

  const strategyFactory =
    config.strategyFactory ||
    new ComponentNgElementumStrategyFactory(component);

  const attributeToPropertyInputs = getDefaultAttributeToPropertyInputs(inputs);

  class NgElementumImpl extends NgElementum {
    // Work around a bug in closure typed optimizations(b/79557487) where it is not honoring static
    // field externs. So using quoted access to explicitly prevent renaming.
    static readonly ['observedAttributes'] = Object.keys(
      attributeToPropertyInputs
    );

    readonly #ngElementumInputsCache = new Map<string, any>();
    #ngElementumStrategy: NgElementumStrategy | undefined;
    readonly #ngElementumConfig: ApplicationConfig =
      typeof config.applicationConfig === 'function'
        ? runInInjectionContext(
            getPlatform()!.injector,
            config.applicationConfig
          )
        : config.applicationConfig;

    protected readonly ngElementumStrategy = createApplication(
      mergeApplicationConfig(this.#ngElementumConfig, {
        providers: [provideZonelessChangeDetection()],
      })
    ).then(
      (applicationRef) =>
        (this.#ngElementumStrategy = strategyFactory.create(applicationRef))
    );

    override async attributeChangedCallback(
      attrName: string,
      oldValue: string,
      newValue: string
    ) {
      const [propName] = attributeToPropertyInputs[attrName];

      this.setInputValue(propName, newValue);
    }

    override async connectedCallback() {
      const strategy = await this.ngElementumStrategy;

      if (this.isConnected) {
        strategy.connect(this);

        for (const [attrName, [propName, transform]] of Object.entries(
          attributeToPropertyInputs
        )) {
          if (!this.hasAttribute(attrName)) {
            continue;
          }

          const value = this.getAttribute(attrName)!;

          strategy.setInputValue(propName, value, transform);
        }
      }
    }

    override async disconnectedCallback() {
      const strategy = await this.ngElementumStrategy;

      if (strategy && !this.isConnected) {
        strategy.disconnect();
      }
    }

    override getInputValue(propName: string): any {
      if (
        this.#ngElementumStrategy &&
        !this.#ngElementumInputsCache.has(propName)
      ) {
        this.#ngElementumInputsCache.set(
          propName,
          this.#ngElementumStrategy?.getInputValue(propName)
        );
      }

      return this.#ngElementumInputsCache.get(propName) ?? null;
    }

    override setInputValue(propName: string, newValue: string): void {
      this.#ngElementumInputsCache.set(propName, newValue);

      const transform = inputs.find(
        (input) => input.propName === propName
      )?.transform;

      if (this.#ngElementumStrategy) {
        this.#ngElementumStrategy.setInputValue(propName, newValue, transform);
        return;
      }

      this.ngElementumStrategy.then((strategy) => {
        strategy.setInputValue(propName, newValue, transform);
      });
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
      value: async function (this: NgElementumImpl, ...args: any[]) {
        const strategy = await this.ngElementumStrategy;

        return strategy.applyMethod(exposedMethod, args);
      },
    });
  }

  // Add getters and setters to the prototype for each property input.
  inputs.forEach(({ propName }) => {
    Object.defineProperty(NgElementumImpl.prototype, propName, {
      get(this: NgElementumImpl): any {
        return this.getInputValue(propName);
      },
      set(this: NgElementumImpl, newValue: any): void {
        this.setInputValue(propName, newValue);
      },
      configurable: true,
      enumerable: true,
    });
  });

  return NgElementumImpl as any;
}
