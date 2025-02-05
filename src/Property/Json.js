/** @module Property */

import Property from './Property.js';
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
	
	static defaults = {
		submitAsString: true,
		isSortable: false,
	};

	constructor(config = {}, entity) {
		config = _.merge({}, JsonProperty.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, JsonProperty.defaults, defaults);
	}

	/**
	 * Validates a JSON string
	 */
	isValid(value) {
		try {
			JSON.parse(value);
		} catch (e) {
			return false;
		}
		return true;
	}

	parse(value) {
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

	getDisplayValue() {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		if (_.isNil(this.parsedValue)) {
			return null;
		}
		return JSON.stringify(this.parsedValue);
	}

	get json() {
		if (this.isDestroyed) {
			throw Error('this.json is no longer valid. Property has been destroyed.');
		}
		return this.parsedValue;
	}

	getSubmitValue() {
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
	getAsHtmlSafe() {
		const str = JSON.stringify(this.parsedValue);
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
};

JsonProperty.className = 'Json';
JsonProperty.type = 'json';


// For the sake of OneBuild backwards compatibility, create an alias of Json, that's Tag
export class TagProperty extends JsonProperty {}
TagProperty.className = 'Tag';
TagProperty.type = 'tag';
