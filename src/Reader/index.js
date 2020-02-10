/** @module Reader */

import JsonReader from './JsonReader';
import XmlReader from './XmlReader';

const ReaderTypes = {
	[JsonReader.type]: JsonReader,
	[XmlReader.type]: XmlReader,
};
export default ReaderTypes;