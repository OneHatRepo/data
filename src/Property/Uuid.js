/** @module Property */

import Property from './Property';
import {
	// uuid,
	isUuid,
	empty
} from 'uuidv4';
import uuid from 'uuid-random'; // TEMP, until Expo supports cypto.getRandomValues() - https://github.com/uuidjs/uuid/issues/375 and https://github.com/expo/expo/issues/7209
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
	newId = () => {
		return uuid();
	}

	/**
	 * Validates a UUID
	 */
	isValid = (value) => {
		return isUuid(value);
	}

	/**
	 * Determines whether a given UUID is empty (i.e. all zeros)
	 */
	isEmpty = (value) => {
		if (_.isNil(value)) {
			value = this.submitValue;
		}
		return value === empty();
	}

};

UuidProperty.className = 'Uuid';
UuidProperty.type = 'uuid';