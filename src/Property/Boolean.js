/** @module Property */

import Property from './Property';
import Formatters from '../Util/Formatters';
import Parsers from '../Util/Parsers';
import _ from 'lodash';

/**
 * Class represents a Property that stores boolean data.
 * @extends Property
 */
export default class BooleanProperty extends Property {

	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			submitAsString: false,
			submitAsInt: false,
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
		return Parsers.ParseBool(value);
	}

	getDisplayValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		return Formatters.FormatBoolAsYesNo(this.parsedValue);
	}

	getSubmitValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValue is no longer valid. Property has been destroyed.');
		}
		if (this.submitAsString) {
			return Formatters.FormatBoolAsString(this.parsedValue); // submit as string like 'true' or 'false'
		}
		if (this.submitAsInt) {
			return Formatters.FormatBoolAsInt(this.parsedValue); // submit as string like 'true' or 'false'
		}
		return Parsers.ParseBool(this.parsedValue); // Use a Parser instead of a Formatter to make sure we submit it as an actual boolean primitive value
	}

};

BooleanProperty.className = 'Boolean';
BooleanProperty.type = 'bool';
