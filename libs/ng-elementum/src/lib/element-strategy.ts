import { ApplicationRef } from '@angular/core';

/**
 * Interface for the events emitted through the NgElementStrategy.
 *
 * @publicApi
 */
export interface NgElementStrategyEvent {
  name: string;
  value: any;
}

/**
 * Underlying strategy used by the NgElement to create/destroy the component and react to input
 * changes.
 *
 * @publicApi
 */
export interface NgElementumStrategy {
  connect(element: HTMLElement): void;
  disconnect(): void;
  getInputValue(propName: string): any;
  setInputValue(
    propName: string,
    value: string,
    transform?: (value: any) => any
  ): void;
  applyMethod(methodName: keyof any, args: any[]): any;
}

/**
 * Factory used to create new strategies for each NgElement instance.
 *
 * @publicApi
 */
export interface NgElementumStrategyFactory {
  /** Creates a new instance to be used for an NgElement. */
  create(applicationRef: ApplicationRef): NgElementumStrategy;
}
