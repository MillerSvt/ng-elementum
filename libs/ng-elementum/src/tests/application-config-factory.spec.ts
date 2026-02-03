import {
  Component,
  getPlatform,
  inject,
  Injectable,
  InjectionToken,
  signal,
  Type,
} from '@angular/core';
import { page } from '@vitest/browser/context';
import { NgComponentOutlet } from '@angular/common';
import { defineCustomElement } from './utils/define-custom-element';

@Injectable({
  providedIn: 'platform',
})
class PlatformService {
  public readonly isEnabled = signal(false);
}

const componentsToken = new InjectionToken<Type<any>[]>('component', {
  factory: () => [],
});

@Component({
  template: `
    @for (component of components; track component) {
    <ng-container *ngComponentOutlet="component" />
    }
  `,
  imports: [NgComponentOutlet],
})
class Test {
  protected readonly components = inject(componentsToken);
}

@Component({
  template: `<p data-testid="dynamic-component">test</p>`,
})
class DynamicComponent {}

const [selector, NgElementum] = defineCustomElement(Test, {
  applicationConfig: (platformService = inject(PlatformService)) => ({
    providers: [
      platformService.isEnabled()
        ? {
            provide: componentsToken,
            useValue: DynamicComponent,
            multi: true,
          }
        : [],
    ],
  }),
});

type NgElementum = InstanceType<typeof NgElementum>;

it('should create separate instances of root service for each web component', async () => {
  const platformService = getPlatform()!.injector.get(PlatformService);

  platformService.isEnabled.set(false);

  const test1 = document.createElement(selector) as NgElementum;

  test1.setAttribute('data-testid', 'test-1');

  document.body.appendChild(test1);

  expect(
    await page.getByTestId('test-1').getByTestId('dynamic-component').query()
  ).toBeNull();

  platformService.isEnabled.set(true);

  expect(
    await page.getByTestId('test-1').getByTestId('dynamic-component').query()
  ).toBeNull();

  test1.remove();

  const test2 = document.createElement(selector) as NgElementum;

  test2.setAttribute('data-testid', 'test-2');

  document.body.appendChild(test2);

  await expect
    .element(page.getByTestId('test-2').getByTestId('dynamic-component'))
    .toBeVisible();

  test2.remove();
});
