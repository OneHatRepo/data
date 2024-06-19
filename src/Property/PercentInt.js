/** @module Property */

import FloatProperty from './Float.js';
import Formatters from '../Util/Formatters.js';
import _ from 'lodash';

/**
 * Class represents a Property that stores a percentage value.
 * @extends PercentProperty
 */
export default class PercentIntProperty extends FloatProperty {

	static defaults = {
		omitZeros: false, // Should we omit any .00 at the end?
	};

	constructor(config = {}, entity) {
		config = _.merge({}, PercentIntProperty.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, PercentIntProperty.defaults, defaults);
	}
	
	getDisplayValue() {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		return Formatters.FormatPercentInt(this.parsedValue, this.omitZeros);
	}

};

PercentIntProperty.className = 'PercentInt';
PercentIntProperty.type = 'percentint';
