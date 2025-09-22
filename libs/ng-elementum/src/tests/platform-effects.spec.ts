import { platformBrowser } from '@angular/platform-browser';
import { providePlatformEffectInterop } from '../lib/provide-platform-effect-interop';
import { effect, runInInjectionContext, signal } from '@angular/core';
import { vi } from 'vitest';
import { getTestBed } from '@angular/core/testing';

it('platform effects', async () => {
  getTestBed().platform.destroy();

  const platform = platformBrowser([...providePlatformEffectInterop()]);

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
