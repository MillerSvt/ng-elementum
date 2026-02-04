import { Type } from '@angular/core';
import {
  createCustomElement,
  ExtractMethods,
  ExtractSignals,
  NgElementumConfig,
  NgElementumConstructor,
} from '../../lib/create-custom-element';

export function defineCustomElement<
  T,
  const M extends ExtractMethods<T>,
  const S extends ExtractSignals<T>
>(
  component: Type<T>,
  config: NgElementumConfig<M, S>
): () => InstanceType<NgElementumConstructor<T, M, S>> & Disposable {
  const ElementCtor = createCustomElement(component, config);

  const selector = `test-${crypto.randomUUID()}`;

  customElements.define(selector, ElementCtor);

  return () =>
    Object.assign(
      document.createElement(selector) as InstanceType<
        NgElementumConstructor<T, M, S>
      >,
      {
        [Symbol.dispose](this: HTMLElement) {
          this.remove();
        },
      }
    );
}
