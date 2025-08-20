import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideRouter, Router, RouterFeatures } from '@angular/router';
import { Routes } from '@angular/router';
import { LocationStrategy } from '@angular/common';
import { MemoryLocationStrategy } from './location-strategy';

export function provideWebComponentRouter(
  routes: Routes,
  ...features: RouterFeatures[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideRouter(routes, ...features),
    provideEnvironmentInitializer(() => {
      inject(Router).initialNavigation();
    }),
    { provide: LocationStrategy, useClass: MemoryLocationStrategy },
  ]);
}
