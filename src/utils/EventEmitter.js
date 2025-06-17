/**
 * EventEmitter.js - Custom Event System
 * Provides a clean way for game components to communicate
 */

export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  /**
   * Register an event listener
   */
  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    this.events.get(eventName).push(callback);

    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  /**
   * Register a one-time event listener
   */
  once(eventName, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(eventName, onceCallback);
    };

    return this.on(eventName, onceCallback);
  }

  /**
   * Remove an event listener
   */
  off(eventName, callback) {
    const listeners = this.events.get(eventName);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }

    // Clean up empty event arrays
    if (listeners.length === 0) {
      this.events.delete(eventName);
    }
  }

  /**
   * Emit an event to all listeners
   */
  emit(eventName, ...args) {
    const listeners = this.events.get(eventName);
    if (!listeners) return;

    // Create a copy of listeners to avoid issues if listeners are modified during emission
    const listenersCopy = [...listeners];

    for (const callback of listenersCopy) {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event listener for '${eventName}':`, error);
      }
    }
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified
   */
  removeAllListeners(eventName = null) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(eventName) {
    const listeners = this.events.get(eventName);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(eventName) {
    return this.events.has(eventName) && this.events.get(eventName).length > 0;
  }
}
