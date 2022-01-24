/** @module Property */

import Property from './Property';
import accounting from 'accounting-js';
import _ from 'lodash';

/**
 * Class represents a Property that stores currency data.
 * @extends Property
 */
export default class CurrencyProperty extends Property {
	
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
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

		_.merge(this, defaults, config);
	}

	parse = (value) => {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		if (_.isNil(value)) {
			return null;
		}
		return accounting.unformat(value);
	}

	getDisplayValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}

		let ret = accounting.formatMoney(this.parsedValue, this.displayOptions)
		if (this.omitZeros && ret.match(/\.00$/)) {
			ret = ret.replace(/\.00$/, '');
		}
		return ret;
	}

	getSubmitValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValue is no longer valid. Property has been destroyed.');
		}
		if (this.submitAsString) {
			return accounting.toFixed(this.parsedValue, 2);
		}
		return this.parsedValue;
	}

};

CurrencyProperty.className = 'Currency';
CurrencyProperty.type = 'currency';
