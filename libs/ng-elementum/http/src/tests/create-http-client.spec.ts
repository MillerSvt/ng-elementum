import { InjectionToken } from '@angular/core';
import { createHttpClient } from '../lib/create-http-client';
import { TestBed } from '@angular/core/testing';
import { HttpClient, withFetch } from '@angular/common/http';

it('createHttpClient with xhr in platform', () => {
  const httpClientToken = new InjectionToken('httpClientToken', {
    providedIn: 'platform',
    factory: () => createHttpClient(),
  });

  expect(TestBed.inject(httpClientToken)).toBeInstanceOf(HttpClient);
});

it('createHttpClient with xhr in root', () => {
  const httpClientToken = new InjectionToken('httpClientToken', {
    providedIn: 'root',
    factory: () => createHttpClient(),
  });

  expect(TestBed.inject(httpClientToken)).toBeInstanceOf(HttpClient);
});

it('createHttpClient with fetch in platform', () => {
  const httpClientToken = new InjectionToken('httpClientToken', {
    providedIn: 'platform',
    factory: () => createHttpClient(withFetch()),
  });

  expect(TestBed.inject(httpClientToken)).toBeInstanceOf(HttpClient);
});

it('createHttpClient with fetch in root', () => {
  const httpClientToken = new InjectionToken('httpClientToken', {
    providedIn: 'root',
    factory: () => createHttpClient(withFetch()),
  });

  expect(TestBed.inject(httpClientToken)).toBeInstanceOf(HttpClient);
});
