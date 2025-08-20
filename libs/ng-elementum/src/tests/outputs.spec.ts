import { Component, output } from '@angular/core';
import { createCustomElement } from '../lib/create-custom-element';
import { page } from '@vitest/browser/context';

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

const NgElementum = createCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
});

type NgElementum = InstanceType<typeof NgElementum>;

customElements.define('test-element', NgElementum);

it('should expose methods', async () => {
  const test = document.createElement('test-element') as NgElementum;

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
