import {
  DestroyRef,
  Injector,
  inject,
  assertInInjectionContext,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { first } from 'rxjs';

/**
 * Registers a callback that is invoked each time the component is attached to
 * an ancestor router outlet, including its initial activation.
 *
 * Must be called within an injection context (e.g. the component constructor);
 * calling it outside throws an error.
 *
 * @param callback The callback to invoke when the component is attached.
 *
 * @publicApi
 */
export function afterAttach(callback: () => void): void {
  assertInInjectionContext(afterAttach);
  observeAncestorRouterOutlets({
    attach: callback,
  });
}

/**
 * Registers a callback that is invoked when the component is detached from an
 * ancestor router outlet.
 *
 * Must be called within an injection context (e.g. the component constructor);
 * calling it outside throws an error.
 *
 * @param callback The callback to invoke when the component is detached.
 *
 * @publicApi
 */
export function afterDetach(callback: () => void): void {
  assertInInjectionContext(afterDetach);
  observeAncestorRouterOutlets({
    detach: callback,
  });
}

/**
 * Registers a callback that is invoked just before the component is detached
 * from an ancestor router outlet, while its view is still attached to the DOM.
 *
 * This is implemented by patching the `detach` method of every ancestor
 * `RouterOutlet`, so the callback can safely read layout-dependent state (e.g.
 * `scrollTop`) that becomes unavailable once the view is removed.
 *
 * If several ancestor outlets detach during a single navigation, the callback
 * fires only once, and it does not fire again while the component is still
 * detached.
 *
 * Must be called within an injection context (e.g. the component constructor);
 * calling it outside throws an error.
 *
 * @param callback The callback to invoke before the component is detached.
 *
 * @publicApi
 */
export function beforeDetach(callback: () => void): void {
  assertInInjectionContext(beforeDetach);

  const destroyRef = inject(DestroyRef);
  const outlets = getAncestorRouterOutlets();

  if (!outlets.length) {
    return;
  }

  let detached:
    | {
        outlet: RouterOutlet;
        component: unknown;
      }
    | undefined;

  for (const outlet of outlets) {
    patchDetach(
      outlet,
      () => {
        if (detached) {
          return;
        }

        detached = {
          outlet,
          component: outlet.component,
        };

        callback();
      },
      destroyRef
    );

    outlet.attachEvents
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((component) => {
        if (detached?.outlet !== outlet || detached.component !== component) {
          return;
        }

        detached = undefined;
      });
  }
}

/**
 * Registers a callback that is invoked only the next time the component is
 * detached from an ancestor router outlet, just before its view is removed
 * from the DOM. The callback is discarded after it fires.
 *
 * Must be called within an injection context (e.g. the component constructor);
 * calling it outside throws an error.
 *
 * @param callback The callback to invoke the next time the component is
 * detached.
 *
 * @publicApi
 */
export function beforeNextDetach(callback: () => void): void {
  assertInInjectionContext(beforeNextDetach);

  const destroyRef = inject(DestroyRef);
  const outlets = getAncestorRouterOutlets();

  if (!outlets.length) {
    return;
  }

  let called = false;

  for (const outlet of outlets) {
    patchDetach(
      outlet,
      () => {
        if (called) {
          return;
        }

        called = true;
        callback();
      },
      destroyRef
    );
  }
}

/**
 * Registers a callback that is invoked only the next time the component is
 * attached to an ancestor router outlet, including its initial activation.
 * The callback is discarded after it fires.
 *
 * Must be called within an injection context (e.g. the component constructor);
 * calling it outside throws an error.
 *
 * @param callback The callback to invoke the next time the component is
 * attached.
 *
 * @publicApi
 */
export function afterNextAttach(callback: () => void): void {
  assertInInjectionContext(afterNextAttach);
  let called = false;

  observeAncestorRouterOutlets({
    attach: () => {
      if (called) {
        return;
      }

      called = true;
      callback();
    },
  });
}

/**
 * Registers a callback that is invoked only the next time the component is
 * detached from an ancestor router outlet. The callback is discarded after it
 * fires.
 *
 * Must be called within an injection context (e.g. the component constructor);
 * calling it outside throws an error.
 *
 * @param callback The callback to invoke the next time the component is
 * detached.
 *
 * @publicApi
 */
export function afterNextDetach(callback: () => void): void {
  assertInInjectionContext(afterNextDetach);
  let called = false;

  observeAncestorRouterOutlets({
    detach: () => {
      if (called) {
        return;
      }

      called = true;
      callback();
    },
  });
}
interface RouterOutletCallbacks {
  attach?: () => void;
  detach?: () => void;
}

function observeAncestorRouterOutlets({
  attach,
  detach,
}: RouterOutletCallbacks): void {
  const destroyRef = inject(DestroyRef);
  const outlets = getAncestorRouterOutlets();

  if (!outlets.length) {
    return;
  }

  let detached:
    | {
        outlet: RouterOutlet;
        component: unknown;
      }
    | undefined;

  // Initial creation of THIS component.
  outlets[0].activateEvents
    .pipe(first(), takeUntilDestroyed(destroyRef))
    .subscribe(() => attach?.());

  for (const outlet of outlets) {
    outlet.detachEvents
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((component) => {
        // First detach is the nearest one.
        if (detached) {
          return;
        }

        detached = {
          outlet,
          component,
        };

        detach?.();
      });

    outlet.attachEvents
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((component) => {
        if (detached?.outlet !== outlet || detached.component !== component) {
          return;
        }

        detached = undefined;
        attach?.();
      });
  }
}

function getAncestorRouterOutlets(): RouterOutlet[] {
  let injector: Injector | null = inject(Injector);

  const result: RouterOutlet[] = [];
  const seen = new Set<RouterOutlet>();

  while (injector) {
    const outlet = injector.get(RouterOutlet, null, {
      self: true,
    });

    if (outlet && !seen.has(outlet)) {
      seen.add(outlet);
      result.push(outlet);
    }

    const parent: Injector | null = injector.get(Injector, null, {
      skipSelf: true,
    });

    if (!parent || parent === injector) {
      break;
    }

    injector = parent;
  }

  return result;
}

/**
 * Wraps `RouterOutlet.detach` so the callback runs before the view is removed
 * from the DOM (the original method detaches the view and only then emits
 * `detachEvents`). The patch is left in place after destroy so chained patches
 * from other observers keep working; only this observer stops firing.
 */
function patchDetach(
  outlet: RouterOutlet,
  callback: () => void,
  destroyRef: DestroyRef
): void {
  const original = outlet.detach;

  outlet.detach = function (this: RouterOutlet, ...args: [any?]) {
    callback();
    return original.apply(this, ...args);
  };

  destroyRef.onDestroy(() => {
    outlet.detach = original;
  });
}
