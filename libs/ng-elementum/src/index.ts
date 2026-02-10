/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @module
 * @description
 * Entry point for all public APIs of the `elements` package.
 */
export {
  createCustomElement,
  NgElementum,
  NgElementumConfig,
  NgElementumConstructor,
} from './lib/create-custom-element';
export { platformElementum } from './lib/platform';
export { createApplicationSync as ɵcreateApplicationSync } from './lib/create-application-sync';
export { providePlatformEffectInterop as ɵprovidePlatformEffectInterop } from './lib/provide-platform-effect-interop';
export { providePlatformResourceInterop as ɵprovidePlatformResourceInterop } from './lib/provide-platform-resource-interop';

// This file only reexports content of the `src` folder. Keep it that way.
