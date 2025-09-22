# ng-elementum

<img src="images/logo.svg" width="40%" alt="logo">

`ng-elementum` is a modern fork of `@angular/elements` that enhances the integration of Angular components with the Web
Components standard. It preserves the simplicity of Angular Elements while adding new powerful features for exposing
component APIs, improving flexibility, and ensuring better developer experience.

> **Important:** `ng-elementum` works **only in zoneless mode** (no `zone.js`). See the **Zoneless requirement** section
> below.

---

## Overview

**ng-elementum** packages Angular components
as [Custom Elements](https://developer.mozilla.org/docs/Web/Web_Components/Using_custom_elements), also known as Web
Components. These are framework-agnostic HTML elements defined by JavaScript classes and registered with the browser's
`CustomElementRegistry`.

By transforming Angular components into custom elements, you can:

- Use Angular components outside of Angular applications
- Distribute reusable UI components without requiring Angular knowledge
- Leverage native browser APIs for interoperability

---

## Installation

```bash
npm install ng-elementum --save
```

---

## Zoneless requirement

`ng-elementum` relies on Angular's **zoneless change detection** and must run **without `zone.js`**.

- `createCustomElement()` **automatically provides** `provideZonelessChangeDetection()` for the element's internal app
  config.
- Do not load `zone.js` on the page where your element runs.
- If you are composing multiple Angular apps on the same page, ensure they are all zoneless to avoid mixed modes.

---

## How it Works

The `createCustomElement()` function converts an Angular component into a class that can be registered as a custom
element.

```typescript
import { createCustomElement } from 'ng-elementum';
import { MyComponent } from './my.component';

const MyElement = createCustomElement(MyComponent, {
  applicationConfig: { providers: [] },
});

customElements.define('my-element', MyElement);
```

Once registered, the element can be used like any other HTML tag:

```html
<my-element message="Hello from ng-elementum!"></my-element>
```

---

## Key Features

### Inputs and Outputs

- Component **inputs** become element <u>dash-cased</u> attributes.
- Component **outputs** are dispatched as <u>dash-cased</u> [CustomEvents](https://developer.mozilla.org/docs/Web/API/CustomEvent). The
  event name matches the output name (or alias) and the payload is placed on `event.detail`.

```typescript
import { Component, input, output } from '@angular/core';

@Component({ standalone: true, template: `{{ message() }}` })
export class MyComponent {
  message = input<string>('');

  closed = output<void>();
}
```

```html
<my-element message="Hello"></my-element>
```

```typescript
const el = document.querySelector('my-element')!;
el.addEventListener('closed', () => console.log('Element closed'));
```

---

### Automatic exposure of signal inputs

In Angular, `@Input()` properties (and later `input()` signals) were proxied onto the custom element instance at runtime, but **TypeScript typings did not reflect them**.

With `ng-elementum`, all **signal inputs** defined with `input()` are **both**:

- Automatically proxied as runtime properties on the custom element instance
- Automatically reflected in the generated element type, with the correct TypeScript type

This removes the need for manual duplication between runtime behavior and typings.

- Each signal input maps to a writable property on the element
- The property has the correct TypeScript type inferred from the `input<T>()` definition
- Assigning to that property updates the underlying signal and triggers change detection

```ts
@Component({ standalone: true, template: `{{ count() }}` })
export class CounterComponent {
  count = input<number>(0);
}

const CounterElement = createCustomElement(CounterComponent, {
  applicationConfig: { providers: [] },
});

customElements.define('counter-element', CounterElement);

// Usage with correct typings
const el = document.querySelector('counter-element');
el.count = 42; // ✅ typed as number
el.count = 'hi'; // ❌ compile error
```

### Exposing Component Methods

`ng-elementum` lets you expose component methods directly on the custom element instance:

```typescript
const MyElement = createCustomElement(MyComponent, {
  applicationConfig: { providers: [] },
  exposedMethods: ['open', 'close'],
});

customElements.define('my-element', MyElement);

const el = document.querySelector('my-element');
await el.open(); // Calls MyComponent.open()
await el.close(); // Calls MyComponent.close()
```

✅ Preserves method context  
✅ Works across Angular and non-Angular hosts  
✅ Allows explicit public API definition

---

## Independent routing inside an element

To keep routing **scoped to the element** and avoid interfering with the host page or other Angular apps, you can provide the router for the element using `provideWebComponentRouter`, that use an in-memory location implementation so it does not bind to `window.location`.

```ts
import { createCustomElement } from 'ng-elementum';
import { provideWebComponentRouter } from 'ng-elementum/router';
import { Routes, RouterLink } from '@angular/router';
import { Component } from '@angular/core';

@Component({
  template: `
    <nav>
      <a routerLink="/home">Home</a>
      <a routerLink="/about">About</a>
    </nav>
    <router-outlet></router-outlet>
  `,
  imports: [RouterLink],
})
export class ShellComponent {}

@Component({ template: `Home works!` })
export class HomeCmp {}

@Component({ template: `About works!` })
export class AboutCmp {}

const routes: Routes = [
  { path: 'home', component: HomeCmp },
  { path: 'about', component: AboutCmp },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
];

const RouterElement = createCustomElement(ShellComponent, {
  applicationConfig: {
    providers: [provideWebComponentRouter(routes)],
  },
});

customElements.define('router-element', RouterElement);
```

This element owns its router and URL state, does not conflict with any other Angular app on the page, and supports programmatic navigation through its internal Router.

---

## Using HttpClient in `platform` level

By default, Angular does not allow `HttpClient` to be provided at the **platform** level.
The `provideHttpClient()` API can only be used in the application root (via `bootstrapApplication`), not in `platformBrowser` `StaticProvider`s.

To work around this limitation, `ng-elementum/http` exposes a helper function: `createHttpClient()`.
It allows you to instantiate a standalone `HttpClient` and register it at the platform level:

```ts
import { createHttpClient } from 'ng-elementum/http';
import { HttpClient } from '@angular/common/http';

const platform = platformBrowser([
  {
    provide: HttpClient,
    useFactory: () => createHttpClient(),
  },
]);
```

---

## Platform Effects Interop

`ng-elementum` introduces `providePlatformEffectInterop()` to allow running Angular effects at the **platform** level.

Normally, Angular effects are scoped to an application instance. But you can use `providePlatformEffectInterop()` to
run effects at the platform level:

```typescript
import { platformBrowser } from '@angular/platform-browser';
import { providePlatformEffectInterop } from 'ng-elementum';
import { Injectable } from '@angular/core';

const platform = platformBrowser([providePlatformEffectInterop()]);

@Injectable({
  providedIn: `platform`,
})
class SomeService {
  constructor() {
    effect(() => {
      console.log('Effect running at platform level');
    });
  }
}

platform.injector.get(SomeService);
```

---

## TypeScript Support

Declare typings to unlock IntelliSense and type safety:

```typescript
import { createCustomElement } from 'ng-elementum';

const MyElement = createCustomElement(/*...*/);

declare global {
  interface HTMLElementTagNameMap {
    'my-element': InstanceType<typeof MyElement>;
  }
}
```

Now TypeScript can infer correct types:

```typescript
const el = document.createElement('my-element');
await el.open(); // ✅ Type-safe
```

---

## Dependency Injection Architecture

`ng-elementum` introduces a clear **two-level DI architecture** for custom elements:

### Platform scope (providedIn: platform)

- The **platform injector** acts as the **global scope**.
- Dependencies registered here are shared across **all web elements** created on the same page.
- Typical use cases: core Angular providers, common services (e.g. global configuration, theming, analytics).
- There is only **one platform per browser page context**.

### Root scope (providedIn: root)

- Each element instance has its own **root injector**.
- Providers registered in `applicationConfig` when calling `createCustomElement()` live in this root scope.
- Dependencies in this scope are **isolated to the element instance**.
- Typical use cases: services that should not leak across elements, component-local state, per-element routing.

### Resolution order

1. Injector first looks in the element’s **root scope**.
2. If not found, it falls back to the **platform scope**.
3. If still not found, Angular throws an error.

### Example

```ts
const platform = platformBrowser([
  {
    provide: AuthService,
  },
]);

const MyElement = createCustomElement(MyComponent, {
  applicationConfig: {
    providers: [UserService],
  },
});

customElements.define('my-element', MyElement);
```

---

## Limitations

- Destroying and re-attaching custom elements may cause issues with lifecycle
  callbacks ([see issue](https://github.com/angular/angular/issues/38778)).
- Exposed methods must exist on the component class.
- Elements must be attached to the DOM before calling methods.
- Requires **zoneless mode** (no `zone.js`).

---

## Authors

| <a href="https://github.com/MillerSvt"><img src="https://github.com/MillerSvt.png?size=100" alt="Svyatoslav Zaytsev" width="100" style="border-radius:20%;" /></a> |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|                                                       [**Svyatoslav Zaytsev**](https://github.com/MillerSvt)                                                       |
|                                                          💻 [sviatsv@yandex.ru](mailto:sviatsv@yandex.ru)                                                          |

---

## License

MIT © 2025
