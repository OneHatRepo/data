/** @module Reader */

import Reader from './Reader';
import _ from 'lodash';

/**
 * Takes a string and converts it to JSON.
 * @extends Reader
 */
class JsonReader extends Reader {
	
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			/**
			 * @member {string} root - Root property to start retrieving data
			 */
			root: 'data',

			/**
			 * @member {function} reviver - Prescribes how the value originally produced by parsing is transformed, before being returned.
			 * For more info, see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
			 */
			reviver: null, 
		
		};

		_.merge(this, defaults, config);
	}

	/**
	 * Converts JSON-encoded string to actual JSON object.
	 * Uses "reviver" property from config supplied to the constructor
	 * @param {string} data - JSON-encoded data string
	 * @return {object} parsed - JSON object
	 */
	read = (data) => {
		return JSON.parse(data, this.reviver);

		// if (this.root) {
		// 	return parsed[this.root];
		// }
		// return parsed;
	}
	
}

JsonReader.className = 'Json';
JsonReader.type = 'json';

export default JsonReader;
