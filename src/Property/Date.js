/** @module Property */

import Property from './Property';
import Formatters from '../Util/Formatters';
import Parsers from '../Util/Parsers';
import _ from 'lodash';

/**
 * Class represents a Property that stores a calendar date.
 * @extends Property
 */
export default class DateProperty extends Property {
	
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			readFormat: 'YYYY-MM-DD',
			displayFormat: 'MMM DD, YYYY',
			submitFormat: 'YYYY-MM-DD',
		};

		_.merge(this, defaults, config);
	}

	/**
	 * Gets default value.
	 * In this case, if a property is set to have a defaultValue of 'now',
	 * it will default to the current Date.
	 * @return {any} defaultValue
	 */
	getDefaultValue() {
		if (this.defaultValue === 'now') {
			return Parsers.ParseDate();
		}
		return super.getDefaultValue();
	}

	/**
	 * Parses value to moment object
	 * @param {any} value
	 * @return {moment} parsedValue
	 */
	parse = (value) => {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		
		if (!_.isNil(value) && Parsers.nullDates.indexOf(value) !== -1) {
			value = null;
		}
		
		if (_.isNil(value)) {
			return null;
		}

		let result = Parsers.ParseDate(value, this.readFormat);
		if (!result.isValid()) {
			throw new Error(this.name + ' ' + result.toString());
		}
		return result;
	}

	getDisplayValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		return Formatters.FormatDate(this.parsedValue, this.displayFormat);
	}

	getSubmitValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValue is no longer valid. Property has been destroyed.');
		}
		return Formatters.FormatDate(this.parsedValue, this.submitFormat);
	}
};

DateProperty.className = 'Date';
DateProperty.type = 'date';
