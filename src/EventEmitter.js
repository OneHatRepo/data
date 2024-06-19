import { EventEmitter as EE } from 'events';
import _ from 'lodash';

/**
 * This takes the node.js 'events' package and adds the following functionality:
 * - Registration/unregistration of events. Events cannot be emitted until registered.
 * - Pausing / Resuming event emission. Paused events will be added to a queue, and
 * can be optionally emitted at resumption of events.
 * - Relaying of events from one object to another. A relayed event will appear to be emitted
 * from the relaying object, not from the origin object.
 */
export default class EventEmitter extends EE {
	
	constructor() {
		super(...arguments);

		this._registeredEvents = [];
		this._eventQueue = [];
		this.checkReturnValues = false;
	}

	static get CANCEL_EVENT() {
		return -1;
	}

	/**
	 * Decorates the standard emit() with the following functionality:
	 * - Checks that event has been registered
	 * - Checks that events are not currently paused. If so, adds the event to a queue
	 * - Checks if it should actually use the event handler return values (see emitAlt)
	 * @param {array} name - Event name
	 * @param {...params} - Variable number of additional params
	 */
	emit(name) { // NOTE: Purposefully do not use an arrow-function, so we have access to arguments
		if (_.indexOf(this._registeredEvents, name) === -1) {
			throw new Error('Event "' + name + '" is not registered.');
		}
console.log('emit(name)', name);
		if (this.eventsPaused) {
			// Add to _eventQueue
			this._eventQueue.push(arguments);
			return;
		}

		if (name !== 'error' && this.checkReturnValues) {
			return this._emitAlt.apply(this, [...arguments]);
		}

		return super.emit(...arguments);
	}

	/**
	 * Replaces the standard emit() with a custom function, so we can utilize the return values of handlers.
	 * @return {boolean} result - false if any of the handlers return false, otherwise true.
	 * @private
	 */
	_emitAlt(name) { // NOTE: Purposefully do not use an arrow-function, so we have access to arguments
		const handlers = this._events[name],
			args = _.slice(arguments, 1);
		let results = true,
			isCancel = false;

		if (_.isFunction(handlers)) {
			results = handlers.apply(this, args);
		} else {
			_.each(handlers, (handler) => {
				let ret = handler.apply(this, args);
				if (ret === this.CANCEL_EVENT) {
					isCancel = true;
					return false;
				}
				if (!ret) {
					results = false;
				}
			});
		}

		if (isCancel) {
			return false;
		}

		return results;
	}

	/**
	 * Replacement for the standard emit() function with a custom async function, 
	 * so we can utilize the return values of handlers in an async fashion.
	 * @return {boolean} result - false if any of the handlers return false, otherwise true.
	 */
	 async emitAsync(name) {
		const handlers = this._events[name],
			args = _.slice(arguments, 1);
		let results = true,
			isCancel = false;

		if (_.isFunction(handlers)) {
			results = await handlers.apply(this, args);
		} else {
			await _.each(handlers, async (handler) => {
				let ret = await handler.apply(this, args);
				if (ret === this.CANCEL_EVENT) {
					isCancel = true;
					return false;
				}
				if (!ret) {
					results = false;
				}
			});
		}

		if (isCancel) {
			return false;
		}

		return results;
	}

	/**
	 * Sets checkReturnValues, so we can utilize the return values of handlers.
	 */
	setCheckReturnValues = (bool = true) => {
		this.checkReturnValues = bool;
	}

	/**
	 * Registers a single event type to be used by this Class.
	 * Events must be registered before they can be emitted.
	 * @param {string} name - Event name
	 * @return {boolean} isChanged - Whether event was successfully added
	 */
	registerEvent = (name) => {
		return this.registerEvents([name]);
	}

	/**
	 * Registers multiple event types to be used by this Class.
	 * Events must be registered before they can be emitted.
	 * @param {array} names - Event names
	 * @return {boolean} isChanged - Whether (any) events were successfully added
	 */
	registerEvents = (names) => {
		const count = this._registeredEvents.length;
		this._registeredEvents = _.uniq(_.concat(this._registeredEvents, names));
		return this._registeredEvents.length !== count;
	}

	/**
	 * Unregisters a single event type from use in this Class.
	 * @param {string} name - Event name
	 * @return {boolean} isChanged - Whether event was successfully removed
	 */
	unregisterEvent = (name) => {
		return this.unregisterEvents([name]);
	}

	/**
	 * Unregisters multiple event types from use in this Class.
	 * Events must be registered before they can be emitted.
	 * @param {array} names - Event names
	 * @return {boolean} isChanged - Whether (any) events were successfully removed
	 */
	unregisterEvents = (names) => {
		const count = this._registeredEvents.length;
		_.pullAll(this._registeredEvents, names);
		return this._registeredEvents.length !== count;
	}

	/**
	 * Determines whether or not an event with supplied name is registered
	 * @return {bool} isRegisteredEvent
	 */
	isRegisteredEvent = (name) => {
		if (_.indexOf(this._registeredEvents, name) === -1) {
			return false;
		}
		return true;
	}

	/**
	 * Gets array of names of all registered event types.
	 * @return {array} _registeredEvents - Event names
	 */
	getRegisteredEvents = () => {
		return this._registeredEvents;
	}

	/**
	 * Pauses all events.
	 * Chainable.
	 * Any events emitted while paused will be added to a queue.
	 * @return this
	 */
	pauseEvents = () => {
		this.eventsPaused = true;
		return this;
	}

	/**
	 * Resumes all events.
	 * Chainable.
	 * @param {boolean} emitQueuedEvents - Emit the events in queue? 
	 * If false, then queued events will be discarded. Defaults to false. 
	 * @return this
	 */
	resumeEvents = (emitQueuedEvents = false) => {
		this.eventsPaused = false;
		if (emitQueuedEvents) {
			_.forEach(this._eventQueue, (args) => {
				this.emit(...args);
			})
		}
		this._eventQueue = [];
		return this;
	}

	/**
	 * Relays events from one object to another. A relayed event will appear to be emitted
	 * from the relaying object (this), not from the origin object.
	 */
	relayEventsFrom = (origin, events, prefix = '') => {
		if (_.isString(events)) {
			events = [events];
		}
		_.each(events, (event) => {
			const fullEventName = prefix + event,
				oThis = this;

			// Register the event in this object, so it can be fired
			this.registerEvent(fullEventName);

			// Add a listener to the origin
			origin.on(event, function() { // NOTE: Purposefully do not use an arrow-function, so we have access to arguments

				// Emit the event from this object, passing on any arguments
				return oThis.emit(fullEventName, ...arguments);
			});
		});
	}


	/**
	 * Adds the same listener to multiple events.
	 * 
	 * Usage:
	 * 
	 * - const events = ['foo', 'bar'];
	 * - const listener = () => {};
	 * - emitter.addListeners(events, listener);
	 */
	addListeners = (events, listener) => {
		_.each(events, (event) => {
			this.on(event, listener);
		});
	}

	/**
	 * Alias for addListeners
	 */
	ons = (events, listener) => {
		return this.addListeners(events, listener);
	}


	/**
	 * Removes the same listener to multiple events.
	 * 
	 * Usage:
	 * 
	 * - const events = ['foo', 'bar'];
	 * - const listener = () => {};
	 * - emitter.addListeners(events, listener);
	 */
	removeListeners = (events, listener) => {
		_.each(events, (event) => {
			this.off(event, listener);
		});
	}

	/**
	 * Alias for removeListeners
	 */
	offs = (events, listener) => {
		return this.removeListeners(events, listener);
	}

}