/** @module Property */

import DateProperty from './Date.js';
import _ from 'lodash';

/**
 * Class represents a Property that stores a calendar date and time.
 * @extends DateProperty
 */
export default class DateTimeProperty extends DateProperty {

	static defaults = {
		readFormat: 'YYYY-MM-DDTHH:mm:ss', // ISO 8601
		displayFormat: 'MMM DD, YYYY - HH:mm:ss',
		submitFormat: 'YYYY-MM-DD HH:mm:ss',
	};

	constructor(config = {}, entity) {
		config = _.merge({}, DateTimeProperty.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, DateTimeProperty.defaults, defaults);
	}

};

DateTimeProperty.className = 'DateTime';
DateTimeProperty.type = 'datetime';
