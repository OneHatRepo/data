/** @module Property */

import Property from './Property.js';
import {
	v4 as uuid,
	validate,
	NIL,
} from 'uuid';
import _ from 'lodash';

/**
 * Class represents a Property that stores a UUID.
 * This class contains helpful methods in dealing with UUIDs.
 * @extends Property
 */
export default class UuidProperty extends Property {
	
	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);
	}

	/**
	 * Gets default value.
	 * In this case, if a property is set to have a defaultValue of 'generate',
	 * it will default to a newly generated UUID.
	 * @return {any} defaultValue
	 */
	getDefaultValue() {
		if (this.defaultValue === 'generate') {
			return this.newId();
		}
		return super.getDefaultValue();
	}

	/**
	 * Generates a new UUID
	 */
	newId() {
		return uuid();
	}

	/**
	 * Validates a UUID
	 */
	isValid(value) {
		return validate(value);
	}

	/**
	 * Determines whether a given UUID is empty (i.e. all zeros)
	 */
	isEmpty(value) {
		if (_.isNil(value)) {
			value = this.submitValue;
		}
		return value === NIL;
	}

};

UuidProperty.className = 'Uuid';
UuidProperty.type = 'uuid';