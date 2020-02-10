/** @module Writer */

import JsonWriter from './JsonWriter';
import XmlWriter from './XmlWriter';

const WriterTypes = {
	[JsonWriter.type]: JsonWriter,
	[XmlWriter.type]: XmlWriter,
};
export default WriterTypes;
