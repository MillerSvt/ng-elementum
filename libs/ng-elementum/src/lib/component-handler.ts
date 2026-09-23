import {
  afterNextRender,
  assertInInjectionContext,
  inject,
  Injector,
  Directive,
  ProviderToken,
} from '@angular/core';

/**
 * A callback that is invoked when a custom element is connected or
 * disconnected from the DOM.
 *
 * @publicApi
 */
export type NgElementumLifecycleCallback = () => void;

/**
 * Per-element handler that collects lifecycle callbacks registered via
 * {@link afterConnected} and {@link afterDisconnected}.
 *
 * A separate instance is created for each custom element and provided in its
 * application injector. It is resolved with `{ host: true }` so that lookup
 * always targets the shadow host element rather than any descendant.
 *
 * @internal
 */
export class NgElementumComponentHandler {
  readonly #connected = new Set<NgElementumLifecycleCallback>();
  readonly #disconnected = new Set<NgElementumLifecycleCallback>();
  readonly #nextConnected = new Set<NgElementumLifecycleCallback>();
  readonly #nextDisconnected = new Set<NgElementumLifecycleCallback>();
  readonly #injector = inject(Injector);

  /**
   * Registers a callback to be invoked each time the element is connected to
   * the DOM.
   */
  afterConnected(callback: NgElementumLifecycleCallback): void {
    this.#connected.add(callback);
  }

  /**
   * Registers a callback to be invoked each time the element is disconnected
   * from the DOM.
   */
  afterDisconnected(callback: NgElementumLifecycleCallback): void {
    this.#disconnected.add(callback);
  }

  /**
   * Registers a callback to be invoked only the next time the element is
   * connected to the DOM.
   */
  afterNextConnected(callback: NgElementumLifecycleCallback): void {
    this.#nextConnected.add(callback);
  }

  /**
   * Registers a callback to be invoked only the next time the element is
   * disconnected from the DOM.
   */
  afterNextDisconnected(callback: NgElementumLifecycleCallback): void {
    this.#nextDisconnected.add(callback);
  }

  /**
   * Schedules the connected callbacks to run via `afterNextRender`, so the
   * component is rendered and its inputs are available. Because
   * `afterNextRender` callbacks run outside an injection context, they have no
   * access to DI.
   *
   * @returns `true` if any callback was scheduled.
   */
  runConnected(): boolean {
    let scheduled = false;

    for (const callback of this.#connected) {
      afterNextRender(callback, { injector: this.#injector });
      scheduled = true;
    }

    if (this.#nextConnected.size > 0) {
      for (const callback of this.#nextConnected) {
        afterNextRender(callback, { injector: this.#injector });
        scheduled = true;
      }

      this.#nextConnected.clear();
    }

    return scheduled;
  }

  /**
   * Runs the disconnected callbacks synchronously, mirroring the custom
   * element's `disconnectedCallback`.
   */
  runDisconnected(): void {
    for (const callback of this.#disconnected) {
      callback();
    }

    for (const callback of this.#nextDisconnected) {
      callback();
    }

    this.#nextDisconnected.clear();
  }
}

/**
 * Internal token resolving to the {@link NgElementumComponentHandler} of the
 * shadow host.
 *
 * @internal
 */
export const ɵNgElementumComponentHandler: ProviderToken<NgElementumComponentHandler> =
  NgElementumComponentHandler;

/**
 * Registers a callback that is invoked each time the custom element is
 * connected to the DOM. The callback runs inside `afterNextRender`, so the
 * component is rendered and its inputs are available; it has no access to DI.
 * Must be called within an injection context (e.g. the component constructor).
 *
 * @param callback The callback to invoke when the element is connected.
 *
 * @publicApi
 */
export function afterConnected(callback: NgElementumLifecycleCallback): void {
  assertInInjectionContext(afterConnected);
  inject(ɵNgElementumComponentHandler, { host: true }).afterConnected(callback);
}

/**
 * Registers a callback that is invoked each time the custom element is
 * disconnected from the DOM. Must be called within an injection context (e.g.
 * the component constructor).
 *
 * @param callback The callback to invoke when the element is disconnected.
 *
 * @publicApi
 */
export function afterDisconnected(
  callback: NgElementumLifecycleCallback
): void {
  assertInInjectionContext(afterDisconnected);
  inject(ɵNgElementumComponentHandler, { host: true }).afterDisconnected(
    callback
  );
}

/**
 * Registers a callback that is invoked only the next time the custom element
 * is connected to the DOM. The callback runs inside `afterNextRender`, so the
 * component is rendered and its inputs are available; it has no access to DI.
 * Must be called within an injection context (e.g. the component constructor).
 *
 * @param callback The callback to invoke the next time the element is connected.
 *
 * @publicApi
 */
export function afterNextConnected(
  callback: NgElementumLifecycleCallback
): void {
  assertInInjectionContext(afterNextConnected);
  inject(ɵNgElementumComponentHandler, { host: true }).afterNextConnected(
    callback
  );
}

/**
 * Registers a callback that is invoked only the next time the custom element
 * is disconnected from the DOM. Must be called within an injection context
 * (e.g. the component constructor).
 *
 * @param callback The callback to invoke the next time the element is disconnected.
 *
 * @publicApi
 */
export function afterNextDisconnected(
  callback: NgElementumLifecycleCallback
): void {
  assertInInjectionContext(afterNextDisconnected);
  inject(ɵNgElementumComponentHandler, { host: true }).afterNextDisconnected(
    callback
  );
}

@Directive({
  providers: [NgElementumComponentHandler],
})
export class ɵNgElementumComponentHandlerProvider {}
