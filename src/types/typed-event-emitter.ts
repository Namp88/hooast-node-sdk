import { EventEmitter } from 'events';

export interface TypedEventEmitter<TEvents extends Record<string, any>> {
  on<TEventName extends keyof TEvents & string>(eventName: TEventName, listener: (...args: TEvents[TEventName]) => void): this;

  once<TEventName extends keyof TEvents & string>(eventName: TEventName, listener: (...args: TEvents[TEventName]) => void): this;

  off<TEventName extends keyof TEvents & string>(eventName: TEventName, listener: (...args: TEvents[TEventName]) => void): this;

  emit<TEventName extends keyof TEvents & string>(eventName: TEventName, ...args: TEvents[TEventName]): boolean;

  removeListener<TEventName extends keyof TEvents & string>(eventName: TEventName, listener: (...args: TEvents[TEventName]) => void): this;

  removeAllListeners<TEventName extends keyof TEvents & string>(eventName?: TEventName): this;

  listeners<TEventName extends keyof TEvents & string>(eventName: TEventName): Function[];

  listenerCount<TEventName extends keyof TEvents & string>(eventName: TEventName): number;
}

export function createTypedEventEmitter<TEvents extends Record<string, any>>(): TypedEventEmitter<TEvents> {
  return new EventEmitter() as any;
}
