import { Type } from '@angular/core';
import {
  createCustomElement,
  ExposeInputs,
  ExposeMethods,
  NgElementumConfig,
  NgElementumConstructor,
} from '../../lib/create-custom-element';

export function defineCustomElement<T, const C extends NgElementumConfig<T>>(
  component: Type<T>,
  config: C
): readonly [
  string,
  NgElementumConstructor<ExposeInputs<T> & ExposeMethods<T, C>>
] {
  const ElementCtor = createCustomElement(component, config);

  const selector = `test-${crypto.randomUUID()}`;

  customElements.define(selector, ElementCtor);

  return [selector, ElementCtor] as const;
}
