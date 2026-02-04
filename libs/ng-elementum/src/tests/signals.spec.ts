import { Component, computed, signal } from '@angular/core';
import { page } from '@vitest/browser/context';
import { defineCustomElement } from './utils/define-custom-element';

@Component({
  template: `
    <p data-testid="writable-signal">{{ writableSignal() }}</p>
    <p data-testid="readonly-signal">{{ readonlySignal() }}</p>
  `,
})
class Test {
  public readonly writableSignal = signal('');
  public readonly readonlySignal = computed(this.writableSignal);

  public internalChange(): void {
    this.writableSignal.update((value) => value.repeat(2));
  }
}

const createElement = defineCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
  exposedSignals: ['writableSignal', 'readonlySignal'],
  exposedMethods: ['internalChange'],
});

it('should read/write writable signal', async () => {
  using test = createElement();

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  expect(test.writableSignal).toBe('');

  await expect
    .element(page.getByTestId('test').getByTestId('writable-signal'))
    .toHaveTextContent('');

  test.writableSignal = 'foo';

  expect(test.writableSignal).toBe('foo');

  await expect
    .element(page.getByTestId('test').getByTestId('writable-signal'))
    .toHaveTextContent('foo');

  test.internalChange();

  expect(test.writableSignal).toBe('foofoo');

  await expect
    .element(page.getByTestId('test').getByTestId('writable-signal'))
    .toHaveTextContent('foofoo');
});

it('should read read-only signal', async () => {
  using test = createElement();

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  expect(test.readonlySignal).toBe('');

  // @ts-expect-error should not be writable
  test.readonlySignal = 'bar';

  await expect
    .element(page.getByTestId('test').getByTestId('readonly-signal'))
    .toHaveTextContent('');

  test.writableSignal = 'foo';

  expect(test.readonlySignal).toBe('foo');

  await expect
    .element(page.getByTestId('test').getByTestId('readonly-signal'))
    .toHaveTextContent('foo');
});

it('should apply changes before attached', async () => {
  using test = createElement();

  test.setAttribute('data-testid', 'test');

  expect(test.writableSignal).toBe(null);

  test.writableSignal = 'foo';

  expect(test.writableSignal).toBe('foo');

  document.body.appendChild(test);

  await expect
    .element(page.getByTestId('test').getByTestId('writable-signal'))
    .toHaveTextContent('foo');

  test.internalChange();

  expect(test.writableSignal).toBe('foofoo');

  await expect
    .element(page.getByTestId('test').getByTestId('writable-signal'))
    .toHaveTextContent('foofoo');
});
