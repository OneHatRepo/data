 /** @module Property */

import Base64Property from './Base64.js';
import _ from 'lodash';

/**
 * Class represents a Property that stores file data.
 * @extends Base64Property
 */
export default class FileProperty extends Base64Property {
 
	get urlencoded() {
		return encodeURIComponent(this.displayValue);
	}

};


FileProperty.className = 'File';
FileProperty.type = 'file';
