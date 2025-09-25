import {
  HttpFeature,
  HttpFeatureKind,
  withNoXsrfProtection,
} from '@angular/common/http';
import { XhrFactory } from '@angular/common';
import {
  HttpClient,
  HttpHandler,
  provideHttpClient,
  ɵHttpInterceptorHandler,
  ɵREQUESTS_CONTRIBUTE_TO_STABILITY,
} from '@angular/common/http';
import {
  assertInInjectionContext,
  createEnvironmentInjector,
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
  ɵHttpInterceptorHandler,
  {
    provide: HttpHandler,
    useExisting: ɵHttpInterceptorHandler,
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

  return injector.get(HttpClient);
}
