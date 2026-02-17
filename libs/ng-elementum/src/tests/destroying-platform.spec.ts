import { Component, DestroyRef, getPlatform, inject, InjectionToken, ViewEncapsulation } from '@angular/core';
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

const createElement = defineCustomElement(Test, {
  applicationConfig: {
    providers: [
      {
        provide: appIndexToken,
        useFactory: () => ++appIndex,
      },
    ],
  },
});


it('should not detach component when platform is destroyed', async () => {
  getPlatform()?.destroy();

  appIndex = 0;

  const platform = platformElementum();

  using test = createElement();

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await expect.element(page.getByTestId('test')).toBeInTheDocument();

  platform.destroy();

  await expect.element(page.getByTestId('test')).toBeInTheDocument();
});

it('should clear shadow dom when platform is destroyed', async () => {
  getPlatform()?.destroy();

  appIndex = 0;

  const platform = platformElementum();

  using test = createElement();

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  await expect.element(page.getByTestId('test')).toBeVisible();

  platform.destroy();

  expect(page.getByTestId('test').element().shadowRoot?.innerHTML).toBe('');
});

it('should recreate component when platform recreated again', async () => {
  getPlatform()?.destroy();

  appIndex = 0;

  let platform = platformElementum();

  using test = createElement();

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
});

it('should not recreate component when component is detached', async () => {
  getPlatform()?.destroy();

  appIndex = 0;

  let platform = platformElementum();

  using test = createElement();

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
});

it('should invoke DestroyRef callbacks', async () => {
  getPlatform()?.destroy();

  const platform = platformElementum();
  const destroyRef = platform.injector.get(DestroyRef);

  const destroyCallback = vi.fn();
  const revokedDestroyCallback = vi.fn();

  destroyRef.onDestroy(destroyCallback);
  destroyRef.onDestroy(revokedDestroyCallback)();

  platform.destroy();

  await Promise.resolve();

  expect(destroyCallback).toHaveBeenCalled();
  expect(revokedDestroyCallback).not.toHaveBeenCalled();
  expect(destroyRef.destroyed).toBe(true);
});
