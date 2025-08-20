import { LocationChangeListener, LocationStrategy } from '@angular/common';
import { Injectable } from '@angular/core';

type HistoryItem = {
  state: any;
  title: string;
  url: string;
  queryParams: string;
};

@Injectable({
  providedIn: `root`,
})
export class MemoryLocationStrategy extends LocationStrategy {
  private readonly locationChangeListeners: LocationChangeListener[] = [];
  protected readonly history: HistoryItem[] = [];

  protected historyIndex = 0;

  protected currentPath = `/`;

  public path(): string {
    return this.currentPath;
  }

  public prepareExternalUrl(): string {
    return ``;
  }

  public getState(): unknown {
    return this.history[this.historyIndex]?.state ?? {};
  }

  public pushState(
    state: any,
    title: string,
    url: string,
    queryParams: string
  ): void {
    this.historyIndex += 1;
    this.history[this.historyIndex] = { state, title, url, queryParams };
  }

  public replaceState(
    state: any,
    title: string,
    url: string,
    queryParams: string
  ): void {
    this.historyIndex = Math.max(0, this.historyIndex);
    this.history[this.historyIndex] = { state, title, url, queryParams };
  }

  public forward(): void {
    const originHistoryIndex = this.historyIndex;

    this.historyIndex = Math.min(
      this.history.length - 1,
      this.historyIndex + 1
    );

    if (this.historyIndex === originHistoryIndex) {
      return;
    }

    this.triggerPopstate();
  }

  public back(): void {
    const originHistoryIndex = this.historyIndex;

    this.historyIndex = Math.max(0, this.historyIndex - 1);

    if (this.historyIndex === originHistoryIndex) {
      return;
    }

    this.triggerPopstate();
  }

  public onPopState(fn: LocationChangeListener): void {
    this.locationChangeListeners.push(fn);
  }

  public getBaseHref(): string {
    return `/`;
  }

  private triggerPopstate(): void {
    const item = this.history[this.historyIndex];

    if (!item) {
      return;
    }

    this.locationChangeListeners.forEach((fn) =>
      fn({
        type: `popstate`,
        state: item.state,
      })
    );
  }
}
