/** @module Writer */

import Writer from './Writer.js'
import { j2xParser as Parser } from 'fast-xml-parser';
import he from 'he'; 

/**
 * Takes an object and converts it to XML-encoded string.
 * @extends Writer
 */
class XmlWriter extends Writer {
	
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			attributeNamePrefix : "@_",
			attrNodeName: false,
			textNodeName : "#text",
			ignoreAttributes : true,
			cdataTagName: false,
			cdataPositionChar: "\\c",
			format: false,
			indentBy: "  ",
			supressEmptyNode: false,
			tagValueProcessor: (a) => he.encode(a, { useNamedReferences: true, }), // default is a=>a
			attrValueProcessor: (a) => he.encode(a, { useNamedReferences: true, }), // default is a=>a
		};

		_.merge(this, defaults, config);
	}
	/**
	 * Converts object to XML-encoded string.
	 * Uses "replacer" property from config supplied to the constructor
	 * @param {object} data - object
	 * @return {string} parsed - XML-encoded data string
	 */
	write = (data) => {
		const parser = new Parser(this);
		return parser.parse(data);
	}
	
};

XmlWriter.className = 'Xml';
XmlWriter.type = 'xml';

export default XmlWriter;
