/** @module Property */

import DateProperty from './Date.js';
import _ from 'lodash';

/**
 * Class represents a Property that stores a time of day.
 * @extends DateProperty
 */
export default class TimeProperty extends DateProperty {

	static defaults = {
		readFormat: 'HH:mm:ss',
		displayFormat: 'HH:mm:ss',
		submitFormat: 'HH:mm:ss',
	};

	constructor(config = {}, entity) {
		config = _.merge({}, TimeProperty.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, TimeProperty.defaults, defaults);
	}
	
};

TimeProperty.className = 'Time';
TimeProperty.type = 'time';