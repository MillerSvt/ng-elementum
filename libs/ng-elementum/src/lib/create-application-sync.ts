import {
  ApplicationConfig,
  ApplicationInitStatus,
  ApplicationRef,
  mergeApplicationConfig,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';

type Resolve<T> = (value: T | SyncPromise<T> | PromiseLike<T>) => void;
type Reject = (reason?: any) => void;

type State = 'pending' | 'fulfilled' | 'rejected';

export class SyncPromise<T = unknown> implements Promise<T> {
  [Symbol.toStringTag] = 'SyncPromise';
  private state: State = 'pending';
  private value!: T;
  private reason: any;

  private onFulfilledQueue: Array<(v: any) => void> = [];
  private onRejectedQueue: Array<(e: any) => void> = [];

  constructor(executor: (resolve: Resolve<T>, reject: Reject) => void) {
    const resolve: Resolve<T> = (x) => this.resolveWith(x);
    const reject: Reject = (e) => this.rejectWith(e);

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  // --- Public API ------------------------------------------------------------

  then<TResult1 = T, TResult2 = never>(
    onFulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1> | SyncPromise<TResult1>)
      | null,
    onRejected?:
      | ((
          reason: any
        ) => TResult2 | PromiseLike<TResult2> | SyncPromise<TResult2>)
      | null
  ): SyncPromise<TResult1 | TResult2> {
    return new SyncPromise<TResult1 | TResult2>((resolve, reject) => {
      const handleFulfilled = (v: T) => {
        if (!onFulfilled) return resolve(v as any);
        this.runHandler(() => onFulfilled(v), resolve, reject);
      };

      const handleRejected = (e: any) => {
        if (!onRejected) return reject(e);
        this.runHandler(() => onRejected(e), resolve, reject);
      };

      if (this.state === 'fulfilled') handleFulfilled(this.value);
      else if (this.state === 'rejected') handleRejected(this.reason);
      else {
        this.onFulfilledQueue.push(handleFulfilled as any);
        this.onRejectedQueue.push(handleRejected as any);
      }
    });
  }

  catch<TResult = never>(
    onRejected?:
      | ((reason: any) => TResult | PromiseLike<TResult> | SyncPromise<TResult>)
      | null
  ): SyncPromise<T | TResult> {
    return this.then(null, onRejected);
  }

  finally(onFinally?: (() => void) | null): SyncPromise<T> {
    return this.then(
      (v) => {
        if (onFinally) onFinally();
        return v;
      },
      (e) => {
        if (onFinally) onFinally();
        throw e;
      }
    );
  }

  // --- Static helpers (optional, but handy) ----------------------------------

  static resolve<T>(
    value: T | PromiseLike<T> | SyncPromise<T>
  ): SyncPromise<T> {
    return new SyncPromise<T>((res) => res(value));
  }

  static reject<T = never>(reason: any): SyncPromise<T> {
    return new SyncPromise<T>((_, rej) => rej(reason));
  }

  static all<T>(
    items: Array<T | PromiseLike<T> | SyncPromise<T>>
  ): SyncPromise<T[]> {
    return new SyncPromise<T[]>((resolve, reject) => {
      const out: T[] = new Array(items.length);
      let remaining = items.length;

      if (remaining === 0) return resolve([]);

      items.forEach((it, i) => {
        SyncPromise.resolve(it).then((v) => {
          out[i] = v;
          remaining -= 1;
          if (remaining === 0) resolve(out);
        }, reject);
      });
    });
  }

  static runWithSyncPromise<T>(fn: () => T): T {
    const originalPromise = globalThis.Promise;

    globalThis.Promise = SyncPromise as any;

    try {
      return fn();
    } finally {
      globalThis.Promise = originalPromise;
    }
  }

  // --- Internals -------------------------------------------------------------

  private fulfill(v: T) {
    if (this.state !== 'pending') return;
    this.state = 'fulfilled';
    this.value = v;

    const q = this.onFulfilledQueue;
    this.onFulfilledQueue = [];
    this.onRejectedQueue = [];
    for (const fn of q) fn(v);
  }

  private rejectWith(e: any) {
    if (this.state !== 'pending') return;
    this.state = 'rejected';
    this.reason = e;

    const q = this.onRejectedQueue;
    this.onFulfilledQueue = [];
    this.onRejectedQueue = [];
    for (const fn of q) fn(e);
  }

  private resolveWith(x: any) {
    if (this.state !== 'pending') return;

    // защита от self-resolution
    if (x === this)
      return this.rejectWith(
        new TypeError('Cannot resolve promise with itself')
      );

    // SyncPromise
    if (x instanceof SyncPromise) {
      return x.then(
        (v) => this.fulfill(v as any),
        (e) => this.rejectWith(e)
      );
    }

    // thenable / PromiseLike
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
      let then: any;
      try {
        then = (x as any).then;
      } catch (e) {
        return this.rejectWith(e);
      }

      if (typeof then === 'function') {
        let called = false;
        try {
          then.call(
            x,
            (y: any) => {
              if (called) return;
              called = true;
              this.resolveWith(y);
            },
            (e: any) => {
              if (called) return;
              called = true;
              this.rejectWith(e);
            }
          );
        } catch (e) {
          if (!called) this.rejectWith(e);
        }
        return;
      }
    }

    // обычное значение
    this.fulfill(x as T);
  }

  private runHandler<R>(
    fn: () => R | PromiseLike<R> | SyncPromise<R>,
    resolve: (v: any) => void,
    reject: (e: any) => void
  ) {
    try {
      const r = fn();
      resolve(r as any); // дальше resolveWith разрулит thenables
    } catch (e) {
      reject(e);
    }
  }
}

export function createApplicationSync(
  applicationConfig: ApplicationConfig
): ApplicationRef {
  let appRef: ApplicationRef | undefined;

  applicationConfig = mergeApplicationConfig(applicationConfig, {
    providers: [
      {
        provide: ApplicationInitStatus,
        useFactory: () =>
          SyncPromise.runWithSyncPromise(() => new ApplicationInitStatus()),
      },
    ],
  });

  createApplication(applicationConfig).then((ref) => {
    appRef = ref;
  });

  if (!appRef) {
    throw new Error('ApplicationRef is not initialized');
  }

  return appRef;
}
