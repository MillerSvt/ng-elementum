import {
  createPlatformFactory,
  getPlatform,
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
    }),
    providePlatformEffectInterop(),
    providePlatformResourceInterop(),
  ]
);
