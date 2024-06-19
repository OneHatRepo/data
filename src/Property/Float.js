/** @module Property */

import Property from './Property.js';
import Parsers from '../Util/Parsers.js';
import _ from 'lodash';

/**
 * Class represents a Property that stores a float value.
 * @extends Property
 */
export default class FloatProperty extends Property {
	
	static defaults = {
		precision: 2,
		// defaultValue: 0.00,
	};

	constructor(config = {}, entity) {
		config = _.merge({}, FloatProperty.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, FloatProperty.defaults, defaults);
	}

	setPrecision(precision) {
		this.precision = precision;
		this.parsedValue = this.parse(this.rawValue);
	}

	/**
	 * Parses value to float
	 * @param {any} value
	 * @return {string} parsedValue
	 */
	parse(value) {
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
