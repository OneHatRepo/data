/** @module Repository */

import EventEmitter from '@onehat/events';
import _ from 'lodash';

/**
 * Base class representing a Command
 * @extends EventEmitter
 * @fires ['handleServerResponse', 'destroy']
 */
export default class Command extends EventEmitter {

	/**
	 * @constructor
	 * @param {object} config - Object with key/value pairs that define this Command
	 */
	constructor(name) {
		super(...arguments);

		this.registerEvents([
			'handleServerResponse',
			'destroy',
		]);
		
		/**
		 * @member {boolean} isDestroyed - Whether this object has been destroyed
		 * @private
		 */
		this.isDestroyed = false;

		this.setCheckReturnValues();
	}

	useDefaultHandler() {
		this.on('handleServerResponse', defaultHandler);
	}

	defaultHandler(entity) {
		
		const response = entity.prop.response.parsedValue;

		if (!response || !response.status) {
			entity.isError = true;
			entity.errorMsg = 'No discernable response from server.';
			entity.handled = true;
			return;
		}

		if (response.status !== 'OK') {
			entity.isError = true;
			entity.errorMsg = 'Encountered server error(s): ' + response.message;
			entity.handled = true;
			return;
		}
			
		// Success!
		entity.handled = true;
	}

	/**
	 * Register a handler for this command.
	 * @param {function} handler - The event handler
	 */
	registerHandler(handler) {
		this.on('handleServerResponse', handler);
	}

	/**
	 * Register a handler for this command.
	 * @param {function} handler - The event handler
	 */
	unregisterHandler(handler) {
		this.off('handleServerResponse', handler);
	}

	/**
	 * Detect whether this command has any handlers.
	 * @return {int} count - Number of handlers this command has
	 */
	hasHandlers() {
		return this.listenerCount('handleServerResponse');
	}

	/**
	 * Convenience function to invoke handlers
	 * @return {boolean} results - Results of running all handlers
	 */
	async processResponse(entity) {
		return await this.emitAsync('handleServerResponse', entity);
	}

	/**
	 * Destroy this object.
	 * - Removes event listeners
	 * @fires destroy
	 */
	destroy() {
		this.emit('destroy');
		this.isDestroyed = true;
		
		// listeners
		this.removeAllListeners();
	}
};
