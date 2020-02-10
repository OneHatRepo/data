/** @module Reader */

import _ from 'lodash';

/**
 * Base class representing a Reader of data.
 * The Reader's job is to take the supplied string and 
 * return an array of rawData objects
 * that can be used to create Entities.
 */
class Reader {
	
	constructor(config = {}) {
		_.merge(this, config);
	}

	/**
	 * Performs no conversion—just returns data as-is.
	 * @param {object} data
	 * @return {object} data
	 */
	read = (data) => {
		return data;
	}
};

Reader.className = 'Auto';
Reader.type = 'auto';

export default Reader;
