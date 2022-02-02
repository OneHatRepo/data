/** @module Property */

import Property from './Property';
import Parsers from '../Util/Parsers';
import _ from 'lodash';

const TEMP_PREFIX = 'TEMP-';

/**
 * Class represents a Property that stores string data.
 * @extends Property
 */
export default class StringProperty extends Property {

	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);
	}

	/**
	 * Parses value to string.
	 * - Strings will pass through unaltered.
	 * - Numbers and Booleans will be converted to strings.
	 * - Other types will return null.
	 * @param {any} value
	 * @return {string} parsedValue
	 */
	parse = (value) => {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		return Parsers.ParseString(value);
	}

	newId = () => {
		let id,
			hasId = false;

		const entity = this.getEntity(),
			repository = entity && entity.repository;

		id = _.uniqueId(TEMP_PREFIX);
		hasId = repository ? repository.hasId(id) : false;

		while(hasId) {
			id = _.uniqueId(TEMP_PREFIX);
			hasId = repository.hasId(id);
		}
		return id;
	}
};

StringProperty.className = 'String';
StringProperty.type = 'string';