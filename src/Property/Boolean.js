/** @module Property */

import Property from './Property.js';
import Formatters from '../Util/Formatters.js';
import Parsers from '../Util/Parsers.js';
import _ from 'lodash';

/**
 * Class represents a Property that stores boolean data.
 * @extends Property
 */
export default class BooleanProperty extends Property {

	static defaults = {
		submitAsInt: false,
		defaultValue: false,
	};

	constructor(config = {}, entity) {
		config = _.merge({}, BooleanProperty.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, BooleanProperty.defaults, defaults);
	}

	parse(value) {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		if (_.isNil(value)) {
			return null;
		}
		return Parsers.ParseBool(value);
	}

	getDisplayValue() {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		return Formatters.FormatBoolAsYesNo(this.parsedValue);
	}

	getSubmitValue() {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValue is no longer valid. Property has been destroyed.');
		}
		if (this.submitAsString) {
			return Formatters.FormatBoolAsString(this.parsedValue); // submit as string like 'true' or 'false'
		}
		if (this.submitAsInt) {
			return Formatters.FormatBoolAsInt(this.parsedValue); // submit as string like 'true' or 'false'
		}
		return Parsers.ParseBool(this.parsedValue); // Use a Parser instead of a Formatter to make sure we submit it as an actual boolean primitive value
	}

	toggle() {
		if (this.isDestroyed) {
			throw Error('this.toggle is no longer valid. Property has been destroyed.');
		}
		this.parsedValue = !this.parsedValue;
	}

};

BooleanProperty.className = 'Boolean';
BooleanProperty.type = 'bool';
