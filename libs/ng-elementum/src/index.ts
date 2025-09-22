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
  WithProperties,
} from './lib/create-custom-element';
export {
  NgElementumStrategy,
  NgElementStrategyEvent,
  NgElementumStrategyFactory,
} from './lib/element-strategy';
export { providePlatformEffectInterop } from './lib/provide-platform-effect-interop';

// This file only reexports content of the `src` folder. Keep it that way.
