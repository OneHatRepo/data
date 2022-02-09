/** @module Property */

import Property from './Property';
import Parsers from '../Util/Parsers';
import _ from 'lodash';

let lastId = 0;

/**
 * Class represents a Property that stores an integer value.
 * @extends Property
 */
export default class IntegerProperty extends Property {

	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			// defaultValue: 0,
			idStartsAt: 100 * 1000 * 1000 * 1000, // 100 billion
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

	/**
	 * Generates a new id
	 * Mainly for temporary, in-memory usage
	 */
	newId = () => {
		let id,
			hasId = false;

		const entity = this.getEntity(),
			repository = entity && entity.repository;

		if (lastId < this.idStartsAt) {
			lastId = this.idStartsAt;
		}

		id = lastId++;
		hasId = repository ? repository.hasId(id) : false;

		while(hasId) {
			id = lastId++;
			hasId = repository.hasId(id);
		}
		return id;
	}
	
};

IntegerProperty.className = 'Integer';
IntegerProperty.type = 'int';
