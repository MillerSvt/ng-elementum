import { Component, input } from '@angular/core';
import { page } from '@vitest/browser/context';
import { JsonPipe } from '@angular/common';
import { defineCustomElement } from './utils/define-custom-element';

@Component({
  template: `
    <p data-testid="some-string">{{ someString() }}</p>
    <p data-testid="some-object">{{ someObject() | json }}</p>
    <p data-testid="some-transform">{{ someTransform() }}</p>
  `,
  imports: [JsonPipe],
})
class Test {
  public readonly someString = input<string>('');
  public readonly someObject = input<Record<string, string>>({});
  public readonly someTransform = input('', {
    transform: (value: string) => value.toUpperCase(),
  });
}

const createElement = defineCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
});

it('should reflect element attributes', async () => {
  using test = createElement();

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
});

it('should proxy properties', async () => {
  using test = createElement();

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
});

it('should transform value', async () => {
  using test = createElement();

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  // We cannot receive the value from input because it has a transform function
  expect(test.someTransform).toBe(null);

  test.someTransform = 'foo';

  await expect
    .element(page.getByTestId('test').getByTestId('some-transform'))
    .toHaveTextContent('FOO');

  expect(test.someTransform).toBe('foo');
});

it('should apply inputs before attached', async () => {
  using test = createElement();

  test.setAttribute('data-testid', 'test');

  expect(test.someTransform).toBe(null);

  test.someTransform = 'foo';

  expect(test.someTransform).toBe('foo');

  document.body.appendChild(test);

  await expect
    .element(page.getByTestId('test').getByTestId('some-transform'))
    .toHaveTextContent('FOO');
});
