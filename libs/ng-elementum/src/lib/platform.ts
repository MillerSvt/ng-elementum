import {
  createPlatformFactory,
  DestroyRef,
  inject,
  PlatformRef,
  providePlatformInitializer,
} from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';
import { providePlatformEffectInterop } from './provide-platform-effect-interop';
import { providePlatformResourceInterop } from './provide-platform-resource-interop';

const onCreatePlatformListeners = new Set<() => void>();

export function onCreatePlatform(cb: () => void): void {
  onCreatePlatformListeners.add(cb);
}

export function offCreatePlatform(cb: () => void): void {
  onCreatePlatformListeners.delete(cb);
}

export const platformElementum = createPlatformFactory(
  platformBrowser,
  'ng-elementum',
  [
    // @ts-expect-error Angular typing issue
    providePlatformInitializer(() => {
      onCreatePlatformListeners.forEach((cb) => cb());

      // TODO remove after resolving issue https://github.com/angular/angular/issues/67095
      const platform = inject(PlatformRef);
      const destroyRef = inject(DestroyRef);

      platform.onDestroy(() => {
        queueMicrotask(() => {
          if (!destroyRef.destroyed) {
            // @ts-expect-error typing issue
            destroyRef.destroy();
          }
        });
      });
    }),
    providePlatformEffectInterop(),
    providePlatformResourceInterop(),
  ]
);
