/** @module Writer */

import JsonWriter from './JsonWriter.js';
import XmlWriter from './XmlWriter.js';

const WriterTypes = {
	[JsonWriter.type]: JsonWriter,
	[XmlWriter.type]: XmlWriter,
};
export default WriterTypes;
