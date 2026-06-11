import { effect, ErrorHandler, runInInjectionContext, signal } from '@angular/core';
import { vi } from 'vitest';
import { getTestBed } from '@angular/core/testing';
import { platformElementum } from '../lib/platform';

it('platform effects', async () => {
  getTestBed().platform.destroy();

  const platform = platformElementum();

  const source = signal(1);
  const onEffect = vi.fn();

  runInInjectionContext(platform.injector, () => {
    effect(() => {
      onEffect(source());
    });
  });

  expect(onEffect).not.toHaveBeenCalled();

  await Promise.resolve();

  expect(onEffect).toHaveBeenCalledTimes(1);
  expect(onEffect).toHaveBeenCalledWith(1);

  source.set(2);

  expect(onEffect).toHaveBeenCalledTimes(1);
  expect(onEffect).toHaveBeenCalledWith(1);

  await Promise.resolve();

  expect(onEffect).toHaveBeenCalledTimes(2);
  expect(onEffect).toHaveBeenCalledWith(2);

  await Promise.resolve();

  expect(onEffect).toHaveBeenCalledTimes(2);
  expect(onEffect).toHaveBeenCalledWith(2);
});

it('should route effect errors to platform ErrorHandler', async () => {
  getTestBed().platform.destroy();

  const handleError = vi.fn();
  const errorHandler: ErrorHandler = { handleError };

  const platform = platformElementum([
    { provide: ErrorHandler, useValue: errorHandler },
  ]);

  const source = signal(1);
  const error = new Error('Test effect error');

  const windowErrors: Error[] = [];
  const onWindowError = (event: ErrorEvent) => {
    windowErrors.push(event.error as Error);
  };

  window.addEventListener('error', onWindowError);

  runInInjectionContext(platform.injector, () => {
    effect(() => {
      if (source() === 2) {
        throw error;
      }
    });
  });

  await Promise.resolve();

  expect(handleError).not.toHaveBeenCalled();

  source.set(2);

  await Promise.resolve();

  expect(handleError).toHaveBeenCalledTimes(1);
  expect(handleError).toHaveBeenCalledWith(error);
  expect(windowErrors).toHaveLength(0);

  window.removeEventListener('error', onWindowError);
});

it('should throw uncaught error if no ErrorHandler is provided', async () => {
  getTestBed().platform.destroy();

  const platform = platformElementum();

  const source = signal(1);
  const error = new Error('Test effect error without handler');

  const windowErrors: Error[] = [];
  const onWindowError = (event: ErrorEvent) => {
    windowErrors.push(event.error as Error);
  };

  window.addEventListener('error', onWindowError);

  runInInjectionContext(platform.injector, () => {
    effect(() => {
      if (source() === 2) {
        throw error;
      }
    });
  });

  await Promise.resolve();

  source.set(2);

  await vi.waitFor(() => {
    expect(windowErrors).toHaveLength(1);
  });

  expect(windowErrors[0]).toBe(error);

  window.removeEventListener('error', onWindowError);
});
