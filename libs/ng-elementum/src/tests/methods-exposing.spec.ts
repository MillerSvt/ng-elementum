import { Component, signal } from '@angular/core';
import { createCustomElement } from '../lib/create-custom-element';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function typingTest(fn: () => any): void {
  // nothing
}

@Component({
  template: ``,
})
class Test {
  public readonly value = signal('test');

  public syncMethod(arg: string): string {
    return `test ${arg}`;
  }

  public async asyncMethod(arg: string): Promise<string> {
    return `test ${arg}`;
  }
}

typingTest(() =>
  createCustomElement(Test, {
    applicationConfig: {
      providers: [],
    },
    // @ts-expect-error cannot expose signals
    exposedMethods: ['value'],
  })
);

const NgElementum = createCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
  exposedMethods: ['syncMethod', 'asyncMethod'],
});

typingTest(() => {
  const element = new NgElementum();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const syncMethodResult: Promise<string> = element.syncMethod('test');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const asyncMethodResult: Promise<string> = element.asyncMethod('test');

  // @ts-expect-error arguments should be validated
  element.syncMethod(123);
  // @ts-expect-error arguments should be validated
  element.syncMethod('test', 123);
});

type NgElementum = InstanceType<typeof NgElementum>;

customElements.define('test-element', NgElementum);

it('should expose methods', async () => {
  expect(NgElementum.prototype.syncMethod).toBeTypeOf('function');
  expect(NgElementum.prototype.asyncMethod).toBeTypeOf('function');

  const test = document.createElement('test-element') as NgElementum;

  test.setAttribute('data-testid', 'test');

  await expect(test.syncMethod('test')).rejects.toEqual(
    new Error('Component is detached from DOM')
  );
  await expect(test.asyncMethod('test')).rejects.toEqual(
    new Error('Component is detached from DOM')
  );

  document.body.appendChild(test);

  await expect(test.syncMethod('test')).resolves.toBe('test test');
  await expect(test.asyncMethod('test')).resolves.toBe('test test');

  test.remove();

  await Promise.resolve();

  await expect(test.syncMethod('test')).rejects.toEqual(
    new Error('Component is detached from DOM')
  );
  await expect(test.asyncMethod('test')).rejects.toEqual(
    new Error('Component is detached from DOM')
  );
});
