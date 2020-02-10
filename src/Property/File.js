 /** @module Property */

import Base64Property from './Base64';
import _ from 'lodash';

/**
 * Class represents a Property that stores file data.
 * @extends Base64Property
 */
export default class FileProperty extends Base64Property {
	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);
	}
};


FileProperty.className = 'File';
FileProperty.type = 'file';
