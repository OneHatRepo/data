/** @module Property */

import Property from './Property';
import Parsers from '../Util/Parsers';
import _ from 'lodash';

/**
 * Class represents a Property that stores an integer value.
 * @extends Property
 */
export default class IntegerProperty extends Property {

	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			// defaultValue: 0,
		};
		
		_.merge(this, defaults, config);
	}

	parse = (value) => {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		if (_.isNil(value)) {
			return null;
		}
		return Parsers.ParseInt(value);
	}
	
};

IntegerProperty.className = 'Integer';
IntegerProperty.type = 'int';
