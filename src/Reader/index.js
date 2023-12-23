/** @module Reader */

import JsonReader from './JsonReader.js';
import XmlReader from './XmlReader.js';

const ReaderTypes = {
	[JsonReader.type]: JsonReader,
	[XmlReader.type]: XmlReader,
};
export default ReaderTypes;