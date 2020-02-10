/** @module Writer */

import _ from 'lodash';

/**
 * Base class representing a Writer of data.
 * The Writer's job is to take the supplied Entities and 
 * return a string that can be written to a storage medium
 */
class Writer {
	
	constructor(config = {}) {
		_.merge(this, config);
	}

	/**
	 * Performs no conversion—just returns as-is.
	 * @param {object} data
	 * @return {string} data
	 */
	write = (data) => {
		return data;
	}
};

Writer.className = 'Auto';
Writer.type = 'auto';

export default Writer;
