import { getTestBed } from '@angular/core/testing';
import { resource, runInInjectionContext, signal } from '@angular/core';
import { vi } from 'vitest';
import { platformElementum } from '../lib/platform';

it('should load a resource on the platform', async () => {
  getTestBed().platform.destroy();

  const platform = platformElementum();

  const request = signal(1);
  const loader = vi.fn(({ params }: { params: number }) =>
    Promise.resolve(params * 2)
  );

  const res = runInInjectionContext(platform.injector, () =>
    resource({ params: () => request(), loader })
  );

  await vi.waitFor(() => {
    expect(res.value()).toBe(2);
  });

  expect(loader).toHaveBeenCalledWith(
    expect.objectContaining({ params: 1 })
  );

  platform.destroy();
});