/** @module Property */

import DateProperty from './Date.js';
import _ from 'lodash';

/**
 * Class represents a Property that stores a calendar date and time.
 * @extends DateProperty
 */
export default class DateTimeProperty extends DateProperty {

	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			readFormat: 'YYYY-MM-DDTHH:mm:ss', // ISO 8601
			displayFormat: 'MMM DD, YYYY - HH:mm:ss',
			submitFormat: 'YYYY-MM-DD HH:mm:ss',
		};

		_.merge(this, defaults, config);
	}
	
};

DateTimeProperty.className = 'DateTime';
DateTimeProperty.type = 'datetime';
