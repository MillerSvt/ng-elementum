import { PendingTasks, StaticProvider } from '@angular/core';

class NoopPendingTasks implements Pick<PendingTasks, keyof PendingTasks> {
  add(): () => void {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  run(): void {}
}

export function providePlatformResourceInterop(): StaticProvider[] {
  return [
    {
      provide: PendingTasks,
      useClass: NoopPendingTasks,
    },
  ];
}
