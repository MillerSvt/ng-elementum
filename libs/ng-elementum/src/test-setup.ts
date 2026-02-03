import '@angular/compiler';

import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';
import {
  enableProdMode,
  NgModule,
  provideZonelessChangeDetection,
} from '@angular/core';

const provideZonelessConfig = () => {
  @NgModule({
    providers: [provideZonelessChangeDetection()],
  })
  class TestModule {}

  return TestModule;
};

enableProdMode();

beforeEach(() => {
  getTestBed().initTestEnvironment(
    [BrowserTestingModule, provideZonelessConfig()],
    platformBrowserTesting()
  );
});

afterEach(() => {
  getTestBed().resetTestEnvironment();
});
