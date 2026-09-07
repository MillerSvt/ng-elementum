import {
  HttpFeature,
  HttpFeatureKind,
  withNoXsrfProtection,
} from '@angular/common/http';
import { XhrFactory } from '@angular/common';
import {
  HttpClient,
  HttpHandler,
  HttpXhrBackend,
  provideHttpClient,
  ɵHttpInterceptingHandler,
  ɵREQUESTS_CONTRIBUTE_TO_STABILITY,
} from '@angular/common/http';
import {
  assertInInjectionContext,
  createEnvironmentInjector,
  DestroyRef,
  inject,
  Injectable,
  Injector,
  NgZone,
  PendingTasks,
} from '@angular/core';
import { ɵINJECTOR_SCOPE } from '@angular/core';

@Injectable()
export class BrowserXhr implements XhrFactory {
  build(): XMLHttpRequest {
    return new XMLHttpRequest();
  }
}

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
    // In Angular 21 `HttpXhrBackend` is `providedIn: 'root'`, so it is not
    // reachable from a platform-scoped environment injector. Provide it
    // locally so the default XHR backend resolves in platform scope.
    provide: HttpXhrBackend,
    useClass: HttpXhrBackend,
  },
  {
    provide: XhrFactory,
    useClass: BrowserXhr,
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
