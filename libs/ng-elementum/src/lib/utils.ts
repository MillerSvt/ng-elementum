import { ComponentMirror } from '@angular/core';

/**
 * Convert a camelCased string to kebab-cased.
 */
export function camelToDashCase(input: string): string {
  return input.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

/**
 * Check whether the input is an `Element`.
 */
export function isElement(node: Node | null): node is Element {
  return !!node && node.nodeType === Node.ELEMENT_NODE;
}

/**
 * Convert a kebab-cased string to camelCased.
 */
export function kebabToCamelCase(input: string): string {
  return input.replace(/-([a-z\d])/g, (_, char) => char.toUpperCase());
}

export function matchesSelector(el: Element, selector: string): boolean {
  return el.nodeType === Node.ELEMENT_NODE ? el.matches(selector) : false;
}

/** Gets a map of default set of attributes to observe and the properties they affect. */
export function getDefaultAttributeToPropertyInputs(
  inputs: ComponentMirror<unknown>['inputs']
) {
  const attributeToPropertyInputs: {
    [key: string]: [
      propName: string,
      transform: ((value: any) => any) | undefined
    ];
  } = {};
  inputs.forEach(({ propName, templateName, transform }) => {
    attributeToPropertyInputs[camelToDashCase(templateName)] = [
      propName,
      transform,
    ];
  });

  return attributeToPropertyInputs;
}
