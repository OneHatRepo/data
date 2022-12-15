/** @module Property */

import PercentIntProperty from './PercentInt.js';
import Formatters from '../Util/Formatters.js';
import Parsers from '../Util/Parsers.js';

/**
 * Class represents a Property that stores a percentage value.
 * @extends FloatProperty
 */
export default class PercentProperty extends PercentIntProperty {

	parse = (value) => {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		
		if (_.isNil(value)) {
			return null;
		}

		// BEGIN MOD
		let parsed = Parsers.ParseFloat(value, this.precision +2); // +2 because we are multiplying by 100 and want to retain the proper # of decimal places
		// END MOD
		if (this.submitAsString) {
			return String(parsed);
		}
		return parsed;
	}
	
	getDisplayValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		
		return Formatters.FormatPercent(this.parsedValue, this.precision);
	}

};

PercentProperty.className = 'Percent';
PercentProperty.type = 'percent';
