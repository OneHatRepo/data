/** @module Reader */

import Reader from './Reader.js';
import parser from 'fast-xml-parser';
import he from 'he';
import _ from 'lodash';

/**
 * Takes an XML string and converts it to JSON.
 * @extends Reader
 */
class XmlReader extends Reader {
	
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			attributeNamePrefix: "@_",
			attrNodeName: false,
			textNodeName: "#text",
			ignoreAttributes: true,
			ignoreNameSpace: false,
			allowBooleanAttributes: false,
			parseNodeValue: true,
			parseAttributeValue: false,
			trimValues: true,
			cdataTagName: false,
			cdataPositionChar: "\\c",
			localeRange: "", //To support non english character in tag/attribute values.
			parseTrueNumberOnly: false,
			arrayMode: 'strict',
			attrValueProcessor: (val, attrName) => he.decode(val, { isAttributeValue: true, }),//default is a=>a
			tagValueProcessor: (val, tagName) => he.decode(val), //default is a=>a
			stopNodes: ["parse-me-as-string"],
		};

		_.merge(this, defaults, config);
	}

	/**
	 * Converts XML-encoded string to JSON object.
	 * Uses "reviver" property from config supplied to the constructor
	 * @param {string} xmlData - XML-encoded data string
	 * @return {object} parsed - JSON object
	 */
	read = (xmlData) => {
		const isValid = parser.validate(xmlData);
		if (isValid !== true) { // will be 'true' if it's valid, an error object if invalid
			const {
				code,
				msg,
				line
			} = isValid.err;
			throw new Error(`Could not parse XML. Error ${code}: ${msg} on line ${line}`);
		}

		return parser.parse(xmlData, this);
	}
	
}

XmlReader.className = 'Xml';
XmlReader.type = 'xml';

export default XmlReader;
