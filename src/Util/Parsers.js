import moment from 'moment';
import momentAlt from 'relative-time-parser'; // Notice this version of moment is imported from 'relative-time-parser', and may be out of sync with our general 'moment' package
import accounting from 'accounting-js';
// import * as chrono from 'chrono-node'; // Doesn't yet work in React Native ("SyntaxError: Invalid RegExp: Quantifier has nothing to repeat, js engine: hermes")  Github ticket: https://github.com/facebook/hermes/blob/main/doc/RegExp.md
import _ from 'lodash';

class Parsers {

	static ParseCurrency(value) {
		return accounting.unformat(value);
	}

	static ParsePrice = (value) => {
		return Parsers.ParseFloat(value);
	}

	static ParsePriceFullNoCents = (value) => {
		return Parsers.ParsePrice(value);
	}

	static ParseInt = (value, useNull = false) => {
		if (_.isString(value)) {
			// remove non-numeric characters
			value = Parsers.stripNonNumeric(value);
		}
		let f = parseInt(value);
		if (_.isNaN(f)) {
			return useNull ? null : 0;
		}
		return f;
	}

	static ParseIntUseNull = (value) => {
		return Parsers.ParseInt(value, true);
	}

	static ParseBool = (value) => {
		if (_.isBoolean(value)) {
			return value;
		}
		if (_.isNumber(value)) {
			if (_.isInteger(value)) {
				return value === 1;
			}
			return value === 1.0;
		}
		if (_.isString(value)) {
			let str = _.toLower(value);
			if (Parsers.inArray(str, ['1', 'true', 't', 'y', 'yes'])) {
				return true;
			}
			if (Parsers.inArray(str, ['0', 'false', 'f', 'n', 'no'])) {
				return false;
			}
		}
		return null;
	}

	static ParseBoolCompleted = (value) => {
		return _.toLower(value) === 'completed';
	}

	/**
	 * Parses a date that is in "relative" format, like
	 * '-1 hour' or '+2 weeks'
	 * @param {string} value - A relative date string
	 * @return {object} moment - A moment object
	 */
	static ParseDateRelative = (value) => {
		let result;
		try {
			result = momentAlt().relativeTime(value);
		} catch(err) {}
		return result;
	}

	/**
	 * Parses a date that is in "absolute" format,
	 * like "2020-01-01" or "Nov 5, 1955".
	 * If that fails, it falls back to the "chrono"
	 * parser which can handle natural-language dates
	 * like "Friday at 2 pm CST" or "Saturday"
	 * @param {string} value - Date string
	 * @param {string} format - Format string for moment library
	 * @return {object} moment - A moment object
	 */
	static ParseDate = (value, format = null) => {
		if (moment.isMoment(value)) {
			return value;
		}
		let result;
		try {
			result = moment(value, format);
		} catch(err) {}
		
		if ((!result || !result.isValid() && chrono)) {
			// try using chrono
			const parsed = chrono.parse(value);
			if (parsed && parsed[0] && parsed[0].date) {
				const dateString = parsed[0].date();
				try {
					result = moment(dateString);
				} catch(err) {}
			}
		}
		return result;
	}

	static ParseDateTime = (value, format = "YYYY-MM-DDTHH:mm:ss") => {
		return Parsers.ParseDate(value, format);
	}

	static ParseTime = (value, format = null) => {
		return Parsers.ParseDate(value, format);
	}

	static ParseHours = (value, precision) => {
		return Parsers.ParseFloat(value, precision);
	}

	static ParseDistance = (value, precision) => {
		return Parsers.ParseFloat(value, precision);
	}

	static ParseVolume = (value, precision) => {
		return Parsers.ParseFloat(value, precision);
	}

	static ParseWeight = (value, precision) => {
		return Parsers.ParseFloat(value, precision);
	}

	static ParseSpeed = (value, precision) => {
		return Parsers.ParseFloat(value, precision);
	}

	static ParseFloat = (value, precision = null, useNull = false) => {
		if (_.isString(value)) {
			// remove non-numeric characters
			value = Parsers.stripNonNumeric(value);
		}
		let f = parseFloat(value);
		if (_.isNaN(f)) {
			if (useNull) {
				return null;
			}
			f = 0.0;
		}
		if (precision || precision === 0) {
			return f.toFixed(precision);
		}
		return f;
	}

	static ParseFloatUseNull = (value, precision) => {
		return Parsers.ParseFloat(value, precision, true);
	}

	static ParsePercent = (value, precision) => {
		return Parsers.ParseFloat(value, precision);
	}

	static ParsePercentInt = (value, precision) => {
		return Parsers.ParseFloat(value, precision);
	}

	static ParseString = (value) => {
		if (_.isString(value)) {
			return value;
		}
		if (_.isNumber(value) || _.isBoolean(value)) {
			return String(value);
		}
		return null;
	}

	static stripNonNumeric(value) {
		return value.replace(/[^0-9\.]+/gm, '');
	}

	static inArray(value, arr) {
		if (!_.isArray(arr)) {
			return null;
		}
		return arr.indexOf(value) !== -1;
	}

	// These are possible responses from the server for a Date/DateTime/Time
	// that doesn't exist. We can check against it using indexOf
	static nullDates = [
		'0000-00-00 00:00:00',
		'0000-00-00',
		'00:00:00',
		'0',
		'',
		0,
		null,
	];
	
}

export default Parsers;
