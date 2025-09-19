import '@angular/compiler';

import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';
import { NgModule, provideZonelessChangeDetection } from '@angular/core';

const provideZonelessConfig = () => {
  @NgModule({
    providers: [provideZonelessChangeDetection()],
  })
  class TestModule {}

  return TestModule;
};

getTestBed().initTestEnvironment(
  [BrowserTestingModule, provideZonelessConfig()],
  platformBrowserTesting()
);
