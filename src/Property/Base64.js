 /** @module Property */

import Property from './Property.js';
import { Base64 } from 'js-base64';
import _ from 'lodash';

/**
 * Class represents a Property that stores Base64 data.
 * This class contains helpful methods in dealing with Base64 data.
 * @extends Property
 */
export default class Base64Property extends Property {

	static defaults = {
		isSortable: false,
	};

	constructor(config = {}, entity) {
		config = _.merge({}, Base64Property.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, Base64Property.defaults, defaults);
	}

	encode(value) {
		return Base64.encode(value);
	}

	/**
	 * Decodes to UTF-8 string
	 */
	decode(value) {
		return Base64.decode(value);
	}

	/**
	 * Decodes to bytes, which is compatible with browser's built-in atob()
	 * (Which is absent in node)
	 */
	atob(value) {
		return Base64.atob(value);
	}

	btoa(value) {
		return Base64.btoa(value);
	}

};

Base64Property.className = 'Base64';
Base64Property.type = 'base64';
