import { Component } from '@angular/core';
import { createCustomElement } from '../lib/create-custom-element';
import { page } from '@vitest/browser/context';

let componentIndex = 0;

@Component({
  template: `<div data-testid="component-index">{{ value }}</div>`,
})
class Test {
  protected readonly value = ++componentIndex;
}

const NgElementum = createCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
});

type NgElementum = InstanceType<typeof NgElementum>;

customElements.define('test-element', NgElementum);

it('should not recreate component when element is moved within the DOM', async () => {
  componentIndex = 0;

  const test = document.createElement('test-element') as NgElementum;

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await expect
    .element(page.getByTestId('test').getByTestId('component-index'))
    .toHaveTextContent('1');

  const newContainer = document.createElement('div');

  document.body.appendChild(newContainer);

  newContainer.appendChild(test);

  await expect
    .element(page.getByTestId('test').getByTestId('component-index'))
    .toHaveTextContent('1');

  test.remove();
});

it('should recreate component when element is attached to the DOM again', async () => {
  componentIndex = 0;

  const test = document.createElement('test-element') as NgElementum;

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await expect
    .element(page.getByTestId('test').getByTestId('component-index'))
    .toHaveTextContent('1');

  test.remove();

  await new Promise(requestAnimationFrame);

  document.body.appendChild(test);

  await expect
    .element(page.getByTestId('test').getByTestId('component-index'))
    .toHaveTextContent('2');

  test.remove();
});
