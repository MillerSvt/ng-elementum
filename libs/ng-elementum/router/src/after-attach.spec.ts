import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  provideRouter,
  RouteReuseStrategy,
  Router,
  RouterOutlet,
} from '@angular/router';
import {
  afterAttach,
  afterDetach,
  afterNextAttach,
  afterNextDetach,
} from './after-attach';

class DetachingRouteReuseStrategy implements RouteReuseStrategy {
  private readonly stored = new Map<string, DetachedRouteHandle>();

  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return true;
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.stored.has(this.key(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.stored.get(this.key(route)) ?? null;
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    this.stored.set(this.key(route), handle);
  }

  private key(route: ActivatedRouteSnapshot): string {
    return route.routeConfig?.path ?? '';
  }
}

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
class App {}

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
class ShellA {}

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
class ShellB {}

@Component({ standalone: true, template: 'a2' })
class A2 {}

@Component({ standalone: true, template: 'b1' })
class B1 {}

@Component({ standalone: true, template: 'b2' })
class B2 {}

function createRoutes(a1: Type<unknown>) {
  return [
    {
      path: 'a',
      component: ShellA,
      children: [
        { path: 'a1', component: a1 },
        { path: 'a2', component: A2 },
      ],
    },
    {
      path: 'b',
      component: ShellB,
      children: [
        { path: 'b1', component: B1 },
        { path: 'b2', component: B2 },
      ],
    },
  ];
}

async function setup(a1: Type<unknown>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(createRoutes(a1)),
      { provide: RouteReuseStrategy, useClass: DetachingRouteReuseStrategy },
    ],
  });

  const fixture = TestBed.createComponent(App);
  const router = TestBed.inject(Router);

  fixture.detectChanges();

  return { fixture, router };
}

describe('afterAttach / afterDetach', () => {
  it('should fire when navigating between sibling routes inside a branch', async () => {
    const attached = vi.fn();
    const detached = vi.fn();
    const nextAttached = vi.fn();
    const nextDetached = vi.fn();

    @Component({ standalone: true, template: 'a1' })
    class A1 {
      constructor() {
        afterAttach(attached);
        afterDetach(detached);
        afterNextAttach(nextAttached);
        afterNextDetach(nextDetached);
      }
    }

    const { router, fixture } = await setup(A1);

    await router.navigate(['a', 'a1']);
    fixture.detectChanges();

    expect(attached).toHaveBeenCalledTimes(1);
    expect(nextAttached).toHaveBeenCalledTimes(1);
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['a', 'a2']);
    fixture.detectChanges();

    expect(attached).not.toHaveBeenCalled();
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).toHaveBeenCalledTimes(1);
    expect(nextDetached).toHaveBeenCalledTimes(1);

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['a', 'a1']);
    fixture.detectChanges();

    expect(attached).toHaveBeenCalledTimes(1);
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();

    // Repeated callbacks keep firing on every detach/attach cycle, while the
    // one-shot variants have already been consumed.
    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['a', 'a2']);
    fixture.detectChanges();

    expect(attached).not.toHaveBeenCalled();
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).toHaveBeenCalledTimes(1);
    expect(nextDetached).not.toHaveBeenCalled();
  });

  it('should fire when switching between branches from the root', async () => {
    const attached = vi.fn();
    const detached = vi.fn();
    const nextAttached = vi.fn();
    const nextDetached = vi.fn();

    @Component({ standalone: true, template: 'a1' })
    class A1 {
      constructor() {
        afterAttach(attached);
        afterDetach(detached);
        afterNextAttach(nextAttached);
        afterNextDetach(nextDetached);
      }
    }

    const { router, fixture } = await setup(A1);

    await router.navigate(['a', 'a1']);
    fixture.detectChanges();

    expect(attached).toHaveBeenCalledTimes(1);
    expect(nextAttached).toHaveBeenCalledTimes(1);
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['b', 'b1']);
    fixture.detectChanges();

    expect(attached).not.toHaveBeenCalled();
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).toHaveBeenCalledTimes(1);
    expect(nextDetached).toHaveBeenCalledTimes(1);

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['a', 'a1']);
    fixture.detectChanges();

    expect(attached).toHaveBeenCalledTimes(1);
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['b', 'b1']);
    fixture.detectChanges();

    expect(attached).not.toHaveBeenCalled();
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).toHaveBeenCalledTimes(1);
    expect(nextDetached).not.toHaveBeenCalled();
  });

  it('should not re-fire detach while the component is already detached', async () => {
    const attached = vi.fn();
    const detached = vi.fn();
    const nextAttached = vi.fn();
    const nextDetached = vi.fn();

    @Component({ standalone: true, template: 'a1' })
    class A1 {
      constructor() {
        afterAttach(attached);
        afterDetach(detached);
        afterNextAttach(nextAttached);
        afterNextDetach(nextDetached);
      }
    }

    const { router, fixture } = await setup(A1);

    await router.navigate(['a', 'a1']);
    fixture.detectChanges();

    expect(attached).toHaveBeenCalledTimes(1);
    expect(nextAttached).toHaveBeenCalledTimes(1);
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['a', 'a2']);
    fixture.detectChanges();

    expect(attached).not.toHaveBeenCalled();
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).toHaveBeenCalledTimes(1);
    expect(nextDetached).toHaveBeenCalledTimes(1);

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['b', 'b1']);
    fixture.detectChanges();

    expect(attached).not.toHaveBeenCalled();
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();
  });

  it('should fire attach when re-mounted after detaching on multiple levels', async () => {
    const attached = vi.fn();
    const detached = vi.fn();
    const nextAttached = vi.fn();
    const nextDetached = vi.fn();

    @Component({ standalone: true, template: 'a1' })
    class A1 {
      constructor() {
        afterAttach(attached);
        afterDetach(detached);
        afterNextAttach(nextAttached);
        afterNextDetach(nextDetached);
      }
    }

    const { router, fixture } = await setup(A1);

    await router.navigate(['a', 'a1']);
    fixture.detectChanges();

    expect(attached).toHaveBeenCalledTimes(1);
    expect(nextAttached).toHaveBeenCalledTimes(1);
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['a', 'a2']);
    fixture.detectChanges();

    expect(attached).not.toHaveBeenCalled();
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).toHaveBeenCalledTimes(1);
    expect(nextDetached).toHaveBeenCalledTimes(1);

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['b', 'b1']);
    fixture.detectChanges();

    expect(attached).not.toHaveBeenCalled();
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();

    detached.mockReset();
    nextDetached.mockReset();
    attached.mockReset();
    nextAttached.mockReset();
    await router.navigate(['a', 'a1']);
    fixture.detectChanges();

    expect(attached).toHaveBeenCalledTimes(1);
    expect(nextAttached).not.toHaveBeenCalled();
    expect(detached).not.toHaveBeenCalled();
    expect(nextDetached).not.toHaveBeenCalled();
  });
});
