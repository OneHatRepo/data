/** @module Repository */

import EventEmitter from '@onehat/events';
import _ from 'lodash';

/**
 * Base class representing a Command
 * @extends EventEmitter
 * @fires ['change', 'destroy']
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

		this.setCheckReturnValues(true);
	}

	registerHandler = (handler) => {
		this.on('handleServerResponse', handler);
	}

	hasHandlers = () => {
		return this.listenerCount('handleServerResponse') > 0;
	}

	processResponse = (entity) => {
		return this.emit('handleServerResponse', entity);
	}


	/**
	 * Destroy this object.
	 * - Removes event listeners
	 * @fires destroy
	 */
	destroy = () => {

		this.emit('destroy');
		this.isDestroyed = true;
		
		// listeners
		this.removeAllListeners();
	}

	toString = () => {
		return 'Command {' + this.name + '}';
	}
};
