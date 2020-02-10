/** @module Property */

import DateProperty from './Date';
import _ from 'lodash';

/**
 * Class represents a Property that stores a time of day.
 * @extends DateProperty
 */
export default class TimeProperty extends DateProperty {

	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			readFormat: 'HH:mm:ss',
			displayFormat: 'HH:mm:ss',
			submitFormat: 'HH:mm:ss',
		};

		_.merge(this, defaults, config);
	}
	
};

TimeProperty.className = 'Time';
TimeProperty.type = 'time';