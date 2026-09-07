import {
  HttpFeature,
  HttpFeatureKind,
  withNoXsrfProtection,
  ɵHTTP_FETCH_MAX_RESPONSE_SIZE,
} from '@angular/common/http';
import {
  HttpClient,
  HttpHandler,
  provideHttpClient,
  ɵHttpInterceptingHandler,
  ɵREQUESTS_CONTRIBUTE_TO_STABILITY,
} from '@angular/common/http';
import {
  assertInInjectionContext,
  createEnvironmentInjector,
  DestroyRef,
  inject,
  Injector,
  NgZone,
  PendingTasks,
} from '@angular/core';
import { ɵINJECTOR_SCOPE } from '@angular/core';

class NoopPendingTasks implements Pick<PendingTasks, keyof PendingTasks> {
  add(): () => void {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  run(): void {}
}

const platformProviders = [
  ɵHttpInterceptingHandler,
  {
    provide: HttpHandler,
    useExisting: ɵHttpInterceptingHandler,
  },
  {
    // Angular 22 `FetchBackend` injects `HTTP_FETCH_MAX_RESPONSE_SIZE`, which is
    // not reachable from a platform-scoped environment injector. Provide it
    // explicitly with its default: no limit in the browser.
    provide: ɵHTTP_FETCH_MAX_RESPONSE_SIZE,
    useValue: null,
  },
  {
    provide: PendingTasks,
    useClass: NoopPendingTasks,
  },
  {
    provide: ɵREQUESTS_CONTRIBUTE_TO_STABILITY,
    useValue: false,
  },
  {
    provide: NgZone,
    useValue: {
      runOutsideAngular: (fn: () => void) => fn(),
    },
  },
];

export function createHttpClient(
  ...features: Array<HttpFeature<HttpFeatureKind>>
): HttpClient {
  assertInInjectionContext(createHttpClient);

  const scope = inject(ɵINJECTOR_SCOPE);

  if (
    scope === 'platform' &&
    !features.find((f) => f.ɵkind === HttpFeatureKind.CustomXsrfConfiguration)
  ) {
    features.push(withNoXsrfProtection());
  }

  const injector = createEnvironmentInjector(
    [
      provideHttpClient(...features),
      scope === 'platform' ? platformProviders : [],
    ],
    inject(Injector) as any
  );

  // TODO Angular bug https://github.com/angular/angular/issues/68818
  inject(DestroyRef).onDestroy(() => {
    injector.destroy();
  });

  return injector.get(HttpClient);
}
