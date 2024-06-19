/** @module Property */

import Property from './Property.js';
import Parsers from '../Util/Parsers.js';
import _ from 'lodash';

let lastId = 0;

/**
 * Class represents a Property that stores an integer value.
 * @extends Property
 */
export default class IntegerProperty extends Property {

	static defaults = {
		// defaultValue: 0,
		idStartsAt: 100 * 1000 * 1000 * 1000, // 100 billion
	};

	constructor(config = {}, entity) {
		config = _.merge({}, IntegerProperty.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, IntegerProperty.defaults, defaults);
	}

	parse(value) {
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
	newId() {
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
