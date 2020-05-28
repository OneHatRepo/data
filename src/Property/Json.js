/** @module Property */

import Property from './Property';
import _ from 'lodash';

/**
 * Class represents a Property that stores JSON data.
 * 
 * JsonProperty may be a little unpredictable in what its various methods
 * will give you. Say you set the value to: '{"test":true}'.
 * The property parses this and converts it to an actual JS object internally.
 * There will then be two possible representations of this value:
 * - A string ('{"test":true}') and 
 * - An object ({ test: true }).
 * 
 * This is what the various methods will give you:
 * - getParsedValue: object
 * - getDisplayValue: string
 * - getRawValue: string
 * - getSubmitValue (default): string
 * - getSubmitValue when !submitAsString: object
 * 
 * The submitValue is where things get weird. By default, this property
 * will submit as a string.
 * @extends Property
 */
export default class JsonProperty extends Property {
	
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			submitAsString: true,
			isSortable: false,
		};

		_.merge(this, defaults, config);
	}

	/**
	 * Validates a JSON string
	 */
	isValid = (value) => {
		try {
			JSON.parse(value);
		} catch (e) {
			return false;
		}
		return true;
	}

	parse = (value) => {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}

		if (_.isNil(value)) {
			return null;
		}

		let ret;
		if (_.isString(value)) {
			try {
				ret = JSON.parse(value);
			} catch (e) {
				return null;
			}
		} else if (_.isObject(value)) {
			ret = value;
		}
		return ret;
	}

	getDisplayValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		if (_.isNil(this.parsedValue)) {
			return null;
		}
		return this.parsedValue;
	}

	get json() {
		if (this.isDestroyed) {
			throw Error('this.json is no longer valid. Property has been destroyed.');
		}
		return this.parsedValue;
	}

	getSubmitValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValue is no longer valid. Property has been destroyed.');
		}

		if (_.isNil(this.parsedValue)) {
			return null;
		}

		if (this.submitAsString) {
			return JSON.stringify(this.parsedValue);
		}
		return this.parsedValue;
	}

	/**
	 * Utility function - gets the JSON string in a way that is safe to display in HTML.
	 * i.e. It enables us to show a JSON string in HTML *without its contents being interpreted as HTML*
	 */
	getAsHtmlSafe = () => {
		const str = JSON.stringify(this.parsedValue);
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
};

JsonProperty.className = 'Json';
JsonProperty.type = 'json';
