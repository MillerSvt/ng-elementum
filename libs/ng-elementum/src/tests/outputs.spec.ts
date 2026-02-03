import { Component, output } from '@angular/core';
import { page } from '@vitest/browser/context';
import { defineCustomElement } from './utils/define-custom-element';

@Component({
  template: `<button
    data-testid="open-some-page"
    (click)="openSomePage.emit(123)"
  >
    Open some page
  </button>`,
})
class Test {
  public readonly openSomePage = output<any>();
}

const [selector, NgElementum] = defineCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
});

type NgElementum = InstanceType<typeof NgElementum>;

it('should expose methods', async () => {
  const test = document.createElement(selector) as NgElementum;

  test.setAttribute('data-testid', 'test');

  document.body.appendChild(test);

  const spy = vi.fn();

  test.addEventListener('open-some-page', spy);

  await page.getByTestId('test').getByTestId('open-some-page').click();

  await expect
    .poll(() => spy)
    .toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'open-some-page',
        detail: 123,
      })
    );

  test.remove();
});
