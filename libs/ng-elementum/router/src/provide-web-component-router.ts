import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideRouter, RouterFeatures, Routes } from '@angular/router';
import { LocationStrategy } from '@angular/common';
import { MemoryLocationStrategy } from './location-strategy';

export function provideWebComponentRouter(
  routes: Routes,
  ...features: RouterFeatures[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideRouter(routes, ...features),
    { provide: LocationStrategy, useClass: MemoryLocationStrategy },
  ]);
}
