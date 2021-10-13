/** @module Property */

import Property from './Property';
import Parsers from '../Util/Parsers';
import _ from 'lodash';

/**
 * Class represents a Property that stores a float value.
 * @extends Property
 */
export default class FloatProperty extends Property {
	
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			precision: 2,
			// defaultValue: 0.00,
		};

		_.merge(this, defaults, config);
	}

	setPrecision = (precision) => {
		this.precision = precision;
		this.parsedValue = this.parse(this.rawValue);
	}

	/**
	 * Parses value to float
	 * @param {any} value
	 * @return {string} parsedValue
	 */
	parse = (value) => {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		
		if (_.isNil(value)) {
			return null;
		}

		let parsed = Parsers.ParseFloat(value, this.precision);
		if (this.submitAsString) {
			return String(parsed);
		}
		return parsed;
	}
};

FloatProperty.className = 'Float';
FloatProperty.type = 'float';
