/** @module Property */

import Property from './Property';
import Parsers from '../Util/Parsers';
import _ from 'lodash';

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
};

StringProperty.className = 'String';
StringProperty.type = 'string';