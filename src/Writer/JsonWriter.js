/** @module Writer */

import Writer from './Writer'
import _ from 'lodash';

/**
 * Takes an object and converts it to JSON-encoded string.
 * @extends Writer
 */
class JsonWriter extends Writer {
	
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			/**
			 * @member {string} root - Root property to start retrieving data
			 */
			root: null,

			/**
			 * @member {function} reviver - A function that alters the behavior of the stringification process, or an array of String and Number objects that serve as a whitelist for selecting/filtering the properties of the value object to be included in the JSON string. If this value is null or not provided, all properties of the object are included in the resulting JSON string.
			 * For more info, see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
			 */
			reviver: null, 
		
		};

		_.merge(this, defaults, config);
	}

	/**
	 * Converts object to JSON-encoded string.
	 * Uses "replacer" property from config supplied to the constructor
	 * @param {object} data - object
	 * @return {string} parsed - JSON-encoded data string
	 */
	write = (data) => {
		if (this.root) {
			data = {
				[this.root]: data,
			};
		}
		return JSON.stringify(data, this.replacer);
	}
	
}

JsonWriter.className = 'Json';
JsonWriter.type = 'json';

export default JsonWriter;
