/** @module Property */

import FloatProperty from './Float';
import Formatters from '../Util/Formatters';

/**
 * Class represents a Property that stores a percentage value.
 * @extends PercentProperty
 */
export default class PercentIntProperty extends FloatProperty {

	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			omitZeros: false, // Should we omit any .00 at the end?
		};

		_.merge(this, defaults, config);
	}
	
	getDisplayValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		return Formatters.FormatPercentInt(this.parsedValue, this.omitZeros);
	}

};

PercentIntProperty.className = 'PercentInt';
PercentIntProperty.type = 'percentint';
