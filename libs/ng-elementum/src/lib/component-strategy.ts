import {
  APP_BOOTSTRAP_LISTENER,
  ApplicationRef,
  ComponentMirror,
  ComponentRef,
  createComponent,
  EventEmitter,
  isSignal,
  OutputRef,
  reflectComponentType,
  Type,
  ɵChangeDetectionScheduler as ChangeDetectionScheduler,
  ɵisViewDirty as isViewDirty,
  ɵmarkForRefresh as markForRefresh,
  ɵNotificationSource as NotificationSource,
  ɵViewRef as ViewRef,
} from '@angular/core';

import { extractProjectableNodes } from './extract-projectable-nodes';
import {
  camelToDashCase,
  isInputWithTransform,
  isWritableSignal,
} from './utils';

export const UNAVAILABLE = Symbol('UNAVAILABLE');

function pick<T>(value: T): T {
  return value;
}

/**
 * Creates and destroys a component ref using a component factory and handles change detection
 * in response to input changes.
 */
export class NgElementumStrategy {
  /** Reference to the component that was created on connect. */
  private componentRef: ComponentRef<any> | null = null;

  /** Callback function that when called will cancel a scheduled destruction on the component. */
  private scheduledDestroy: symbol | null = null;

  /** Initial input values that were set before the component was created. */
  private readonly initialInputValues = new Map<string, any>();

  /**
   * Angular's change detection scheduler, which works independently of zone.js.
   */
  private cdScheduler: ChangeDetectionScheduler;

  private readonly inputMap = new Map<string, string>();

  private readonly componentMirror: ComponentMirror<unknown>;

  constructor(private component: Type<any>, private appRef: ApplicationRef) {
    this.componentMirror = reflectComponentType(component)!;

    for (const input of this.componentMirror.inputs) {
      this.inputMap.set(input.propName, input.templateName);
    }

    this.cdScheduler = appRef.injector.get(ChangeDetectionScheduler);
  }

  /**
   * Initializes a new component if one has not yet been created and cancels any scheduled
   * destruction.
   */
  connect(element: HTMLElement) {
    // If the element is marked to be destroyed, cancel the task since the component was
    // reconnected
    if (this.scheduledDestroy !== null) {
      this.scheduledDestroy = null;
      return;
    }

    if (this.componentRef === null) {
      this.initializeComponent(element);
    }
  }

  /**
   * Schedules the component to be destroyed after some small delay in case the element is just
   * being moved across the DOM.
   */
  disconnect() {
    // Return if there is no componentRef or the component is already scheduled for destruction
    if (this.componentRef === null || this.scheduledDestroy !== null) {
      return;
    }

    // Schedule the component to be destroyed after a small timeout in case it is being
    // moved elsewhere in the DOM
    this.scheduledDestroy = Symbol();

    queueMicrotask(() => {
      if (this.scheduledDestroy === null) {
        return;
      }

      this.scheduledDestroy = null;

      if (this.componentRef !== null) {
        this.componentRef.destroy();
        this.appRef.components.splice(
          this.appRef.components.indexOf(this.componentRef),
          1
        );
        this.appRef.componentTypes.splice(
          this.appRef.componentTypes.indexOf(this.component),
          1
        );
        this.componentRef = null;
      }
    });
  }

  /**
   * Returns the component property value. If the component has not yet been created, the value is
   * retrieved from the cached initialization values.
   */
  getValue(property: string): any {
    const value = this.componentRef?.instance[property];

    if (isInputWithTransform(value)) {
      // We cannot read the value of an input with a transform function,
      // because it's type can be different from the type of the property.
      return UNAVAILABLE;
    }

    if (isSignal(value)) {
      return value();
    }

    return UNAVAILABLE;
  }

  /**
   * Sets the input value for the property. If the component has not yet been created, the value is
   * cached and set when the component is created.
   */
  setValue(property: string, value: any): void {
    if (this.componentRef === null) {
      return;
    }

    if (
      this.componentMirror.inputs.some((input) => input.propName === property)
    ) {
      this.componentRef.setInput(
        this.inputMap.get(property) ?? property,
        value
      );
    } else if (isWritableSignal(this.componentRef.instance[property])) {
      this.componentRef.instance[property].set(value);
    } else {
      return;
    }

    // `setInput` won't mark the view dirty if the input didn't change from its previous value.
    if (isViewDirty(this.componentRef!.hostView as ViewRef<unknown>)) {
      // `setInput` will have marked the view dirty already, but also mark it for refresh. This
      // guarantees the view will be checked even if the input is being set from within change
      // detection. This provides backwards compatibility, since we used to unconditionally
      // schedule change detection in addition to the current zone run.
      markForRefresh(this.componentRef!.changeDetectorRef as ViewRef<unknown>);

      // Notifying the scheduler with `NotificationSource.CustomElement` causes a `tick()` to be
      // scheduled unconditionally, even if the scheduler is otherwise disabled.
      this.cdScheduler.notify(pick<NotificationSource.CustomElement>(6));
    }
  }

  applyMethod(methodName: keyof any, args: any[]): any {
    if (!this.componentRef) {
      throw new Error('Component is detached from DOM');
    }

    return this.componentRef.instance[methodName](...args);
  }

  /**
   * Creates a new component through the component factory with the provided element host and
   * sets up its initial inputs, listens for outputs changes, and runs an initial change detection.
   */
  protected initializeComponent(element: HTMLElement) {
    const projectableNodes = extractProjectableNodes(
      element,
      this.componentMirror.ngContentSelectors
    );

    const componentRef = (this.componentRef = createComponent(this.component, {
      environmentInjector: this.appRef.injector,
      projectableNodes: projectableNodes,
      hostElement: element,
    }));

    this.initializeOutputs(element, componentRef);

    this.appRef.attachView(componentRef.hostView);
    componentRef.hostView.detectChanges();

    this.appRef.components.push(componentRef);
    this.appRef.componentTypes.push(this.component);

    const listeners = this.appRef.injector.get(APP_BOOTSTRAP_LISTENER, []);

    listeners.forEach((listener) => listener(componentRef));
  }

  /** Sets up listeners for the component's outputs so that the events stream emits the events. */
  protected initializeOutputs(
    element: HTMLElement,
    componentRef: ComponentRef<any>
  ): void {
    for (const { propName, templateName } of this.componentMirror.outputs) {
      const emitter: EventEmitter<any> | OutputRef<any> =
        componentRef.instance[propName];

      const subscription = emitter.subscribe((detail: any) => {
        element.dispatchEvent(
          new CustomEvent(camelToDashCase(templateName), { detail })
        );
      });

      componentRef.onDestroy(() => subscription.unsubscribe());
    }
  }
}
