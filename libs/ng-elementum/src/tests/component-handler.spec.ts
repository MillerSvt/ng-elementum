import { Component, input } from '@angular/core';
import { page } from 'vitest/browser';
import {
  afterConnected,
  afterDisconnected,
  afterNextConnected,
  afterNextDisconnected,
} from '../index';
import { defineCustomElement } from './utils/define-custom-element';

/** Flushes the application render cycle so `afterNextRender` callbacks run. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

let events: string[] = [];

@Component({
  template: `<div data-testid="connected"></div>`,
})
class Test {
  readonly value = input('default');

  constructor() {
    afterConnected(() => {
      events.push(`connected:${this.value()}`);
    });
    afterDisconnected(() => {
      events.push('disconnected');
    });
  }
}

const createElement = defineCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
});

it('should throw when called outside an injection context', () => {
  expect(() => afterConnected(() => {})).toThrow();
  expect(() => afterDisconnected(() => {})).toThrow();
  expect(() => afterNextConnected(() => {})).toThrow();
  expect(() => afterNextDisconnected(() => {})).toThrow();
});

it('should run afterConnected after render with inputs available', async () => {
  events = [];

  using test = createElement();

  test.setAttribute('data-testid', 'test');
  test.setAttribute('value', 'hello');

  document.body.appendChild(test);

  await expect
    .element(page.getByTestId('test').getByTestId('connected'))
    .toBeInTheDocument();
  await flush();

  expect(events).toEqual(['connected:hello']);
});

it('should run afterDisconnected when the element is removed', async () => {
  events = [];

  using test = createElement();

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await flush();

  expect(events).toEqual(['connected:default']);

  test.remove();

  await flush();

  expect(events).toEqual(['connected:default', 'disconnected']);
});

it('should fire connected and disconnected hooks when the element is moved within the DOM', async () => {
  events = [];

  using test = createElement();

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await flush();

  expect(events).toEqual(['connected:default']);

  const container = document.createElement('div');

  document.body.appendChild(container);

  container.appendChild(test);

  await flush();

  expect(events).toEqual([
    'connected:default',
    'disconnected',
    'connected:default',
  ]);
});

it('should run afterNextConnected and afterNextDisconnected only once', async () => {
  events = [];

  @Component({
    template: `<div data-testid="next-inner"></div>`,
  })
  class NextTest {
    constructor() {
      afterNextConnected(() => events.push('next-connected'));
      afterNextDisconnected(() => events.push('next-disconnected'));
    }
  }

  using test = defineCustomElement(NextTest, {
    applicationConfig: {
      providers: [],
    },
  })();

  test.setAttribute('data-testid', 'next');

  document.body.appendChild(test);

  await expect.element(page.getByTestId('next-inner')).toBeInTheDocument();
  await flush();

  expect(events).toEqual(['next-connected']);

  // Move within the DOM: the next-disconnected fires, next-connected is consumed.
  const container = document.createElement('div');

  document.body.appendChild(container);

  container.appendChild(test);

  await flush();

  expect(events).toEqual(['next-connected', 'next-disconnected']);
});
