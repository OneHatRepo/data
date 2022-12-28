/** @module Schema */

import Schema from './Schema.js';

const KeyValues = new Schema({
	name: 'KeyValues',
	model: {
		idProperty: 'key',
		displayProperty: 'value',
		sorters: [
			{
				name: 'value',
				direction: 'ASC',
				fn: 'natsort',
			}
		],
		properties: [
			{ name: 'key', },
			{ name: 'value', },
		],
	},
});

export default KeyValues;