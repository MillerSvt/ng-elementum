import { Component, input } from '@angular/core';
import { page } from '@vitest/browser/context';
import { JsonPipe } from '@angular/common';
import { defineCustomElement } from './utils/define-custom-element';

@Component({
  template: `
    <p data-testid="some-string">{{ someString() }}</p>
    <p data-testid="some-object">{{ someObject() | json }}</p>
  `,
  imports: [JsonPipe],
})
class Test {
  public readonly someString = input<string>('');
  public readonly someObject = input<Record<string, string>>({});
}

const [selector, NgElementum] = defineCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
});

type NgElementum = InstanceType<typeof NgElementum>;

it('should reflect element attributes', async () => {
  const test = document.createElement(selector) as NgElementum;

  test.setAttribute('data-testid', 'test');

  expect(test.someString).toBe(null);

  test.setAttribute('some-string', 'foo');

  expect(test.someString).toBe('foo');

  document.body.appendChild(test);

  await expect
    .element(page.getByTestId('test').getByTestId('some-string'))
    .toHaveTextContent('foo');

  test.setAttribute('some-string', 'bar');

  expect(test.someString).toBe('bar');

  await expect
    .element(page.getByTestId('test').getByTestId('some-string'))
    .toHaveTextContent('bar');

  test.remove();
});

it('should proxy properties', async () => {
  const test = document.createElement(selector) as NgElementum;

  test.setAttribute('data-testid', 'test');

  expect(test.someObject).toBe(null);

  document.body.appendChild(test);

  expect(test.someObject).toEqual({});

  await expect
    .element(page.getByTestId('test').getByTestId('some-object'))
    .toHaveTextContent('{}');

  test.someObject = { foo: 'bar' };

  expect(test.someObject).toEqual({ foo: 'bar' });

  await expect
    .element(page.getByTestId('test').getByTestId('some-object'))
    .toHaveTextContent('{ "foo": "bar" }');

  test.remove();
});
