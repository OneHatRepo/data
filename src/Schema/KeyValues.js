/** @module Schema */

import Schema from './Schema.js';

const KeyValues = new Schema({
	name: 'KeyValues',
	model: {
		idProperty: 'key',
		displayProperty: 'value',
		properties: [
			{ name: 'key', },
			{ name: 'value', },
		],
	},
});

export default KeyValues;