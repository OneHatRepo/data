/** @module Schema */

import Schema from './Schema.js';
import KeyValues from './KeyValues.js';

const CoreSchemas = {
	[KeyValues.name]: KeyValues,
};

export default Schema;
export {
	CoreSchemas,
};
