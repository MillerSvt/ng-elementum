import {
  inject,
  Injectable,
  StaticProvider,
  ɵChangeDetectionScheduler,
  ɵEffectScheduler,
} from '@angular/core';

type SchedulableEffect = {
  run(): void;
  dirty: boolean;
};

@Injectable()
class PlatformEffectScheduler extends ɵEffectScheduler {
  private dirtyEffectCount = 0;
  private readonly queue = new Set<SchedulableEffect>();

  public add(handle: SchedulableEffect): void {
    this.enqueue(handle);
    this.schedule(handle);
  }

  public schedule(handle: SchedulableEffect): void {
    if (!handle.dirty) {
      return;
    }

    this.dirtyEffectCount++;
  }

  public remove(handle: SchedulableEffect): void {
    this.queue.delete(handle);

    if (handle.dirty) {
      this.dirtyEffectCount--;
    }
  }

  public flush(): void {
    while (this.dirtyEffectCount > 0) {
      if (!this.flushQueue()) {
        this.dirtyEffectCount = 0;
      }
    }
  }

  private enqueue(handle: SchedulableEffect): void {
    this.queue.add(handle);
  }

  private flushQueue(): boolean {
    let ranOneEffect = false;

    for (const handle of this.queue) {
      if (!handle.dirty) {
        continue;
      }

      this.dirtyEffectCount--;
      ranOneEffect = true;

      handle.run();
    }

    return ranOneEffect;
  }
}

@Injectable()
class PlatformChangeDetectionScheduler extends ɵChangeDetectionScheduler {
  private readonly effectScheduler = inject(ɵEffectScheduler);
  private isChangeDetectionScheduled = false;
  public runningTick = false;

  public notify(): void {
    if (this.isChangeDetectionScheduled) {
      return;
    }

    this.isChangeDetectionScheduled = true;
    queueMicrotask(() => {
      this.tick();
    });
  }

  private tick(): void {
    this.isChangeDetectionScheduled = false;
    this.runningTick = true;
    this.effectScheduler.flush();
    this.runningTick = false;
  }
}

export function providePlatformEffectInterop(): StaticProvider[] {
  return [
    {
      provide: ɵChangeDetectionScheduler,
      useClass: PlatformChangeDetectionScheduler,
      deps: [],
    },
    {
      provide: ɵEffectScheduler,
      useClass: PlatformEffectScheduler,
      deps: [],
    },
  ];
}
