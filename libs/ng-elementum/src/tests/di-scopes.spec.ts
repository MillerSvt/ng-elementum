import {
  Component,
  getPlatform,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { page } from '@vitest/browser/context';
import { defineCustomElement } from './utils/define-custom-element';

let platformIndex = 0;

@Injectable({
  providedIn: 'platform',
})
class PlatformService {
  public readonly value = signal(`platform-${++platformIndex}`);
}

let rootIndex = 0;

@Injectable({
  providedIn: 'root',
})
class RootService {
  public readonly value = signal(`root-${++rootIndex}`);
}

@Component({
  template: `
    <p data-testid="platform">{{ platformService.value() }}</p>
    <p data-testid="root">{{ rootService.value() }}</p>
  `,
})
class Test {
  protected readonly rootService = inject(RootService);
  protected readonly platformService = inject(PlatformService);
}

const [selector, NgElementum] = defineCustomElement(Test, {
  applicationConfig: {
    providers: [],
  },
});

type NgElementum = InstanceType<typeof NgElementum>;

it('should create separate instances of root service for each web component', async () => {
  const test1 = document.createElement(selector) as NgElementum;
  const test2 = document.createElement(selector) as NgElementum;

  test1.setAttribute('data-testid', 'test-1');
  test2.setAttribute('data-testid', 'test-2');

  document.body.appendChild(test1);
  document.body.appendChild(test2);

  await expect
    .element(page.getByTestId('test-1').getByTestId('root'))
    .toHaveTextContent('root-1');

  await expect
    .element(page.getByTestId('test-2').getByTestId('root'))
    .toHaveTextContent('root-2');

  test1.remove();
  test2.remove();
});

it('should create one instance of platform service', async () => {
  const test1 = document.createElement(selector) as NgElementum;
  const test2 = document.createElement(selector) as NgElementum;

  test1.setAttribute('data-testid', 'test-1');
  test2.setAttribute('data-testid', 'test-2');

  document.body.appendChild(test1);
  document.body.appendChild(test2);

  await expect
    .element(page.getByTestId('test-1').getByTestId('platform'))
    .toHaveTextContent('platform-1');

  await expect
    .element(page.getByTestId('test-2').getByTestId('platform'))
    .toHaveTextContent('platform-1');

  getPlatform()!.injector.get(PlatformService).value.set('platform-100');

  await expect
    .element(page.getByTestId('test-1').getByTestId('platform'))
    .toHaveTextContent('platform-100');

  await expect
    .element(page.getByTestId('test-2').getByTestId('platform'))
    .toHaveTextContent('platform-100');

  test1.remove();
  test2.remove();
});
