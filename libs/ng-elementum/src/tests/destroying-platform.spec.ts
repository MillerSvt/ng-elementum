import {
  Component,
  getPlatform,
  inject,
  InjectionToken,
  ViewEncapsulation,
} from '@angular/core';
import { page } from '@vitest/browser/context';
import { platformElementum } from '../lib/platform';
import { defineCustomElement } from './utils/define-custom-element';

let appIndex = 0;

const appIndexToken = new InjectionToken<number>('appIndex');

@Component({
  template: `<div data-testid="app-index">{{ value }}</div>`,
  encapsulation: ViewEncapsulation.ShadowDom,
})
class Test {
  protected readonly value = inject(appIndexToken);
}

const [selector, NgElementum] = defineCustomElement(Test, {
  applicationConfig: {
    providers: [
      {
        provide: appIndexToken,
        useFactory: () => ++appIndex,
      },
    ],
  },
});

type NgElementum = InstanceType<typeof NgElementum>;

it('should not detach component when platform is destroyed', async () => {
  getPlatform()?.destroy();

  appIndex = 0;

  const platform = platformElementum();

  const test = document.createElement(selector) as NgElementum;

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await expect.element(page.getByTestId('test')).toBeInTheDocument();

  platform.destroy();

  await expect.element(page.getByTestId('test')).toBeInTheDocument();

  test.remove();
});

it('should clear shadow dom when platform is destroyed', async () => {
  getPlatform()?.destroy();

  appIndex = 0;

  const platform = platformElementum();

  const test = document.createElement(selector) as NgElementum;

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await expect.element(page.getByTestId('test')).toBeVisible();

  platform.destroy();

  expect(page.getByTestId('test').element().shadowRoot?.innerHTML).toBe('');

  test.remove();
});

it('should recreate component when platform recreated again', async () => {
  getPlatform()?.destroy();

  appIndex = 0;

  let platform = platformElementum();

  const test = document.createElement(selector) as NgElementum;

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await expect.element(page.getByTestId('test')).toBeVisible();
  await expect
    .element(page.getByTestId('test').getByTestId('app-index'))
    .toHaveTextContent('1');

  platform.destroy();
  platform = platformElementum();

  await expect.element(page.getByTestId('test')).toBeVisible();
  await expect
    .element(page.getByTestId('test').getByTestId('app-index'))
    .toHaveTextContent('2');

  platform.destroy();
  platform = platformElementum();

  await expect.element(page.getByTestId('test')).toBeVisible();
  await expect
    .element(page.getByTestId('test').getByTestId('app-index'))
    .toHaveTextContent('3');

  platform.destroy();

  test.remove();
});

it('should not recreate component when component is detached', async () => {
  getPlatform()?.destroy();

  appIndex = 0;

  let platform = platformElementum();

  const test = document.createElement(selector) as NgElementum;

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await expect.element(page.getByTestId('test')).toBeVisible();
  await expect
    .element(page.getByTestId('test').getByTestId('app-index'))
    .toHaveTextContent('1');

  platform.destroy();

  test.remove();

  platform = platformElementum();

  expect(appIndex).toBe(1);

  platform.destroy();
});
