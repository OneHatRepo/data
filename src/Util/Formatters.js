import numeral from 'numeral';
import moment from 'moment';
import accounting from 'accounting-js';
import _ from 'lodash';

class Formatters {

	static FormatPrice = (value, hideHtml = false) => {
		let abbr, ret;
		
		if (Math.abs(value) >= 1000000) {
			abbr = value / 1000000;
			ret = '$' + numeral(abbr).format('0.00') + (hideHtml ? 'm' : '<span class="units">m</span>'); // return $1.26M
		} else if (Math.abs(value) >= 100000) {
			abbr = value / 1000;
			ret = '$' + numeral(abbr).format('0.0') + (hideHtml ? 'k' : '<span class="units">k</span>'); // return $143.3K
		} else if (Math.abs(value) >= 1000) {
			ret = '$' + numeral(value).format('0,000'); // return $12,456
		} else {
			ret = accounting.formatMoney(value); // return $245.43
		}
		return ret;
	}

	static FormatPriceFullNoCents = (value) => {
		return accounting.formatMoney(value, '$', 0);
	}

	static FormatInt = (value) => {
		return numeral(value).format('0,000');
	}

	static FormatBoolAsYesNo = (value) => {
		let ret;
		if (_.isNil(value)) {
			return 'No';
		} else if (_.isBoolean(value)) {
			ret = value ? 'Yes' : 'No';
		} else {
			ret = parseInt(value, 10) ? 'Yes' : 'No';
		}
		return ret;
	}

	static FormatBoolAsInt = (value) => {
		return value ? 1 : 0;
	}

	static FormatBoolAsString = (value) => {
		return value ? 'true' : 'false';
	}

	static FormatBoolCompleted = (value) => {
		return parseInt(value, 10) ? 'Completed' : 'Not Completed';
	}

	static FormatDate = (value, format = 'MMM DD, YYYY') => {
		if (value === '0000-00-00') {
			return 'N/A';
		}
		if (moment.isMoment(value)) {
			return value.format(format);
		}
		if (_.isDate(value)) {
			return moment(value).format(format);
		}
		if (!_.isNil(value)) {
			// NOTE: Javascript has an ambiguity / bug which can cause dates to be slightly off.
			// See http://stackoverflow.com/questions/2587345/javascript-date-parse?rq=1
			// If accuracy is absolutely needed and format is known, use a regex to 
			// manually parse, then pass in arguments to new Date().
			let date = moment(value, 'YYYY-MM-DD');
			if (!date) {
				date = moment(value, 'YYYY-MM-DD HH:mm:ss');
			}
			if (typeof date !== 'undefined' && date !== null) {
				date = new Date(date);
				return moment(date).format(format);
			}
		}
		return '';
	}

	static FormatDateTime = (value, format = 'MMM DD, YYYY HH:mm:ss') => {
		if (moment.isMoment(value)) {
			return value.format(format);
		}
		if (_.isDate(value)) {
			return moment(value).format(format);
		}
		if (!_.isNil(value)) {
			const date = moment(value, 'YYYY-MM-DD HH:mm:ss');
			if (!_.isNil(date)) {
				return moment(date).format(format);
			}
		}
		return '';
	}

	static FormatTime = (value) => {
		const format = 'HH:mm:ss';
		if (moment.isMoment(value)) {
			return value.format(format);
		}
		if (_.isDate(value)) {
			return moment(value).format(format);
		}
		if (!_.isNil(value)) {
			const date = moment(value, 'HH:mm:ss');
			if (!_.isNil(date)) {
				return moment(date).format(format);
			}
		}
		return '';
	}

	static FormatHours = (value) => {
		if (!value) {
			value = 0;
		}
		return numeral(value).format('0,000') + ' hrs';
	}

	static FormatDistance = (value) => {
		if (!value) {
			value = 0;
		}
		return numeral(value).format('0,000') + ' Km';
	}

	static FormatVolume = (value) => {
		if (!value) {
			value = 0;
		}
		return numeral(value).format('0,000') + ' L';
	}

	static FormatWeight = (value) => {
		if (!value) {
			value = 0;
		}
		return numeral(value).format('0,000') + ' Kg';
	}

	static FormatSpeed = (value) => {
		if (!value) {
			value = 0;
		}
		return numeral(value).format('0,000') + ' KPH';
	}

	static FormatFloat = (value) => {
		const f = parseFloat(value);
		return isNaN(f) ? 0 : parseFloat(f.toFixed(2));
	}

	static FormatFloatUseNull = (value) => {
		const f = parseFloat(value);
		return isNaN(f) ? null : parseFloat(f.toFixed(2));
	}

	static FormatPercent = (str, precision = 4) => {
		if (_.isNil(str)) {
			return str;
		}
		const f = parseFloat(str);
		let value = isNaN(f) ? 0 : f * 100;
		return value.toFixed(precision) + '%';
	}

	static FormatPercentInt = (str) => {
		if (_.isNil(str)) {
			return str;
		}
		return '' + str + '%';
	}

	static FormatTag = (value, metaData, entity, rowIndex, colIndex, store, view) => {
		let decoded,
			values = [];
		try {
			if (value) {
				decoded = JSON.parse(value);
			}
		} catch(e) {
			// JSON string was invalid. Ignore.
		}
		
		if (!_.isEmpty(decoded)) {
			values = _.map(decoded, (item) => {
				return item.text;
			});
		}
		return values.join(', ');
	}
	
}

export default Formatters;
