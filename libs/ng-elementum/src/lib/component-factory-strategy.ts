import {
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

import {
  NgElementumStrategy,
  NgElementumStrategyFactory,
} from './element-strategy';
import { extractProjectableNodes } from './extract-projectable-nodes';
import { camelToDashCase } from './utils';

/**
 * Factory that creates new ComponentNgElementStrategy instance. Gets the component factory with the
 * constructor's injector's factory resolver and passes that factory to each strategy.
 */
export class ComponentNgElementumStrategyFactory
  implements NgElementumStrategyFactory
{
  constructor(private readonly component: Type<any>) {}

  create(applicationRef: ApplicationRef) {
    return new ComponentNgElementumStrategy(this.component, applicationRef);
  }
}

/**
 * Creates and destroys a component ref using a component factory and handles change detection
 * in response to input changes.
 */
export class ComponentNgElementumStrategy implements NgElementumStrategy {
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
  getInputValue(property: string): any {
    if (this.componentRef === null) {
      return this.initialInputValues.get(property);
    }

    const value = this.componentRef.instance[property];

    if (isSignal(value)) {
      return value();
    }

    return value;
  }

  /**
   * Sets the input value for the property. If the component has not yet been created, the value is
   * cached and set when the component is created.
   */
  setInputValue(property: string, value: any): void {
    if (this.componentRef === null) {
      this.initialInputValues.set(property, value);
      return;
    }

    this.componentRef!.setInput(this.inputMap.get(property) ?? property, value);

    // `setInput` won't mark the view dirty if the input didn't change from its previous value.
    if (isViewDirty(this.componentRef!.hostView as ViewRef<unknown>)) {
      // `setInput` will have marked the view dirty already, but also mark it for refresh. This
      // guarantees the view will be checked even if the input is being set from within change
      // detection. This provides backwards compatibility, since we used to unconditionally
      // schedule change detection in addition to the current zone run.
      markForRefresh(this.componentRef!.changeDetectorRef as ViewRef<unknown>);

      // Notifying the scheduler with `NotificationSource.CustomElement` causes a `tick()` to be
      // scheduled unconditionally, even if the scheduler is otherwise disabled.
      this.cdScheduler.notify(NotificationSource.CustomElement);
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

    this.componentRef = createComponent(this.component, {
      environmentInjector: this.appRef.injector,
      projectableNodes: projectableNodes,
      hostElement: element,
    });

    this.initializeInputs();
    this.initializeOutputs(element, this.componentRef);

    this.appRef.attachView(this.componentRef.hostView);
    this.componentRef.hostView.detectChanges();

    this.appRef.components.push(this.componentRef);
    this.appRef.componentTypes.push(this.component);
  }

  /** Set any stored initial inputs on the component's properties. */
  protected initializeInputs(): void {
    for (const [propName, value] of this.initialInputValues) {
      this.setInputValue(propName, value);
    }

    this.initialInputValues.clear();
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
