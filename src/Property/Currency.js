/** @module Property */

import Property from './Property.js';
import * as accounting from 'accounting-js';
import _ from 'lodash';

/**
 * Class represents a Property that stores currency data.
 * @extends Property
 */
export default class CurrencyProperty extends Property {
	
	static defaults = {
		displayOptions: {
			symbol: "$",
			format: '%s%v',
			decimal: '.' ,
			thousand: ',',
			precision: 2,
			grouping: 3,
			stripZeros: false,
			fallback: 0,
		},
		submitAsString: true, // NOTE, we want to use the accounting.toFixed() method by default
		defaultValue: 0.00,
		omitZeros: false, // Should we omit any .00 at the end?
	};

	constructor(config = {}, entity) {
		config = _.merge({}, CurrencyProperty.defaults, config);
		super(config, entity);
	}

	/**
	 * Returns the default configuration for this PropertyType, going up the hierarchy.
	 * @param {Object} defaults - The default configuration to merge with
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const superDefaults = super.getStaticDefaults();
		return _.merge({}, superDefaults, CurrencyProperty.defaults, defaults);
	}

	parse(value) {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		if (_.isNil(value)) {
			return null;
		}
		return accounting.unformat(value);
	}

	getDisplayValue() {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}

		let ret = accounting.formatMoney(this.parsedValue, this.displayOptions)
		if (this.omitZeros && ret.match(/\.00$/)) {
			ret = ret.replace(/\.00$/, '');
		}
		return ret;
	}

	getSubmitValue() {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValue is no longer valid. Property has been destroyed.');
		}
		if (this.submitAsString) {
			return accounting.toFixed(this.parsedValue, 2);
		}
		return this.parsedValue;
	}

	/**
	 * Determines if a currency is equal to 0.00
	 * Returns false if no value set.
	 */
	get isZero() {
		if (this.isDestroyed) {
			throw Error('this.isZero is no longer valid. Property has been destroyed.');
		}
		return this.parsedValue === 0;
	}

	/**
	 * Determines if a currency has a non-null value
	 */
	get hasValue() {
		if (this.isDestroyed) {
			throw Error('this.hasValue is no longer valid. Property has been destroyed.');
		}
		console.log(this.parsedValue);
		return !_.isNil(this.parsedValue);
	}

};

CurrencyProperty.className = 'Currency';
CurrencyProperty.type = 'currency';
