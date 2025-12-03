/** @module Property */

import EventEmitter from '@onehat/events';
import Base64Property from './Base64.js';
import BooleanProperty from './Boolean.js';
import CurrencyProperty from './Currency.js';
import DateProperty from './Date.js';
import DateTimeProperty from './DateTime.js';
import FileProperty from './File.js';
import FloatProperty from './Float.js';
import IntegerProperty from './Integer.js';
import JsonProperty, { TagProperty } from './Json.js';
import PercentProperty from './Percent.js';
import PercentIntProperty from './PercentInt.js';
import StringProperty from './String.js';
import TimeProperty from './Time.js';
import UuidProperty from './Uuid.js';
import _ from 'lodash';

/**
 * Class represents a Property that can store values of multiple types.
 * The actual type is determined dynamically based on the value being set.
 * 
 * Usage: { name: 'date', title: 'Date', type: 'mixed', types: ['date', 'string'], },
 * This is primarily used to allow a field that's normally one PropertyType
 * to also accept string values (e.g. values like '2025-01-01' or 'N/A').
 * 
 * @extends Property
 */
export default class MixedProperty extends EventEmitter {

	constructor(config = {}, entity) {
		config = _.merge({}, MixedProperty.defaults, config);

		if (!config.types || !Array.isArray(config.types) || config.types.length < 2) {
			throw Error('MixedProperty requires a types array with at least two types in its configuration.');
		}

		super(config, entity);

		this.registerEvents([
			'change',
			'changeValidity',
			'destroy',
		]);

		this.types = config.types;
		this.currentType = this.types[0].type || this.types[0];
		this.internalProperties = new Map();

		this._createInternalProperties();
		
		this.currentProperty = this.internalProperties.get(this.currentType);

		this._proxy = new Proxy(this, {
			get(mixedProperty, prop, receiver) {
				if (prop in mixedProperty) {
					const value = mixedProperty[prop];
					if (typeof value === 'function') {
						return value.bind(mixedProperty);
					}
					return value;
				}
				if (mixedProperty.currentProperty && prop in mixedProperty.currentProperty) {
					const value = mixedProperty.currentProperty[prop];
					if (typeof value === 'function') {
						return value.bind(mixedProperty.currentProperty);
					}
					return value;
				}
				return undefined;
			},
			has(mixedProperty, prop) {
				if (prop in mixedProperty) {
					return true;
				}
				return mixedProperty.currentProperty ? prop in mixedProperty.currentProperty : false;
			}
		});
	
		return this._proxy;
	}

	/**
	 * Creates internal Property instances for each configured type
	 * @private
	 */
	_createInternalProperties() {
		_.each(this.types, (typeConfig) => {
			let typeName,
				propertyConfig;
			if (typeof typeConfig === 'string') {
				typeName = typeConfig;
				propertyConfig = {};
			} else {
				typeName = typeConfig.type;
				propertyConfig = _.omit(typeConfig, 'type');
			}
			
			const
				PropertyClass = this._getPropertyClass(typeName),

				// Create a clean config for this internal property
				baseConfig = _.omit(this.config, ['types', 'defaultType']), // Start with base config but exclude Mixed-specific settings
				mergedConfig = _.merge({}, baseConfig, propertyConfig, { // Merge with type-specific config, giving precedence to type-specific settings
					name: this.name,
				}),
				property = new PropertyClass(mergedConfig, this.entity);
			
			this._setupEventForwarding(property);

			this.internalProperties.set(typeName, property);
		});
	}

	/**
	 * Gets the Property class for a given type name
	 * @param {string} typeName - Name of the property type
	 * @returns {Class} Property class
	 * @private
	 */
	_getPropertyClass(typeName) {
		const
			typeMap = {
				base64: Base64Property,
				bool: BooleanProperty,
				currency: CurrencyProperty,
				date: DateProperty,
				datetime: DateTimeProperty,
				file: FileProperty,
				float: FloatProperty,
				int: IntegerProperty,
				json: JsonProperty,
				percent: PercentProperty,
				percentint: PercentIntProperty,
				string: StringProperty,
				tag: TagProperty,
				time: TimeProperty,
				uuid: UuidProperty,
			},
			PropertyClass = typeMap[typeName.toLowerCase()];
		
		if (!PropertyClass) {
			const availableTypes = Object.keys(typeMap).join(', ');
			throw new Error(`Unknown property type: '${typeName}'. Available types are: ${availableTypes}`);
		}

		return typeMap[typeName.toLowerCase()];
	}

	/**
	 * Sets up event forwarding from an internal property to this MixedProperty
	 * @param {Property} property - Internal property to forward events from
	 * @private
	 */
	_setupEventForwarding(property) {
		// Forward all events from internal property to MixedProperty
		const forwardEvent = (eventName, ...args) => {
			if (property === this.currentProperty) {
				// Replace the property reference in args with this MixedProperty
				const modifiedArgs = args.map(arg => arg === property ? this : arg);
				this.emit(eventName, ...modifiedArgs);
			}
		};

		// Listen to all registered events on the internal property
		property.getRegisteredEvents().forEach((eventName) => {
			property.on(eventName, (...args) => forwardEvent(eventName, ...args));
		});
	}

	/**
	 * Detects the appropriate property type for a given value
	 * @param {any} value - Value to analyze
	 * @returns {string} Detected type name
	 * @private
	 */
	_detectType(value) {
		if (_.isNil(value)) {
			return this.currentType || this.defaultType || (typeof this.types[0] === 'string' ? this.types[0] : this.types[0].type);
		}

		// Get available type names from config
		const availableTypes = this.types.map(typeConfig => 
			typeof typeConfig === 'string' ? typeConfig : typeConfig.type
		);

		// Define precedence order - more specific types first
		const precedenceOrder = [
			'bool',      // Most specific - only true/false/1/0
			'int',       // Integers
			'float',     // Floating point numbers
			'currency',  // Currency values
			'percent',   // Percentage values
			'percentint',// Integer percentages
			'date',      // Date values
			'datetime',  // DateTime values  
			'time',      // Time values
			'uuid',      // UUID format
			'base64',    // Base64 encoded data
			'json',      // JSON objects/arrays
			'tag',       // Tag format
			'file',      // File data
			'string'     // Most general - accepts anything
		];

		// Try types in precedence order, but only if they're in the available types
		let typeName;
		for(typeName of precedenceOrder) {
			if (availableTypes.includes(typeName)) {
				const property = this.internalProperties.get(typeName);
				if (property && this._canParseValue(property, value)) {
					return typeName;
				}
			}
		}

		throw new Error(`No configured property type could handle value: ${value}. Available types: ${availableTypes.join(', ')}`);
	}

	/**
	 * Tests if a property can successfully parse a value
	 * @param {Property} property - Property to test
	 * @param {any} value - Value to test
	 * @returns {boolean} Whether the property can parse the value
	 * @private
	 */
	_canParseValue(property, value) {
		try {
			switch(property.constructor.type) {
				case 'bool':
					return this._isBooleanValue(value);
				case 'int':
					return this._isIntegerValue(value);
				case 'float':
					return this._isFloatValue(value);
			}
			
			property.parse(value);
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Checks if a value represents a boolean
	 * @param {any} value - Value to check
	 * @returns {boolean} Whether the value is boolean-like
	 * @private
	 */
	_isBooleanValue(value) {
		switch(typeof value) {
			case 'boolean':
				return true;
			case 'number':
				return value === 0 || value === 1;
			case 'string':
				const lower = value.toLowerCase().trim();
				return ['true', 'false', '1', '0'].includes(lower);
			default:
				return false;
		}
	}

	/**
	 * Checks if a value represents an integer
	 * @param {any} value - Value to check
	 * @returns {boolean} Whether the value is integer-like
	 * @private
	 */
	_isIntegerValue(value) {
		switch(typeof value) {
			case 'bigint':
				return true;
			case 'number':
				return Number.isInteger(value);
			case 'string':
				const trimmed = value.trim();
				if (trimmed === '') {
					return false;
				}
				const num = Number(trimmed);
				return !isNaN(num) && Number.isInteger(num) && String(num) === trimmed;
		}
		return false;
	}

	/**
	 * Checks if a value represents a float
	 * @param {any} value - Value to check
	 * @returns {boolean} Whether the value is float-like
	 * @private
	 */
	_isFloatValue(value) {
		switch(typeof value) {
			case 'number':
				return !Number.isInteger(value) && isFinite(value);
			case 'string':
				const trimmed = value.trim();
				if (trimmed === '') return false;
				const num = Number(trimmed);
				return !isNaN(num) && isFinite(num) && !Number.isInteger(num);
		}
		return false;
	}

	/**
	 * Sets the value and determines the appropriate type
	 * @param {any} value - Value to set
	 */
	setValue(value) {
		const detectedType = this._detectType(value);
		if (this.currentType !== detectedType) {
			this.currentType = detectedType;
			this.currentProperty = this.internalProperties.get(this.currentType);
		}
		this.currentProperty.setValue(value);
	}

	/**
	 * Gets the current type name
	 * @returns {string} Current type name
	 */
	getCurrentType() {
		return this.currentProperty.constructor.type;
	}

	/**
	 * Gets the className of this Property type.
	 * @return {string} className
	 */
	getClassName() {
		return this.constructor.className;
	}

	/**
	 * Gets the internal property for a specific type
	 * @param {string} typeName - Type name
	 * @returns {Property} Internal property
	 */
	getInternalProperty(typeName) {
		return this.internalProperties.get(typeName);
	}

	//     ______                 __
	//    / ____/   _____  ____  / /______
	//   / __/ | | / / _ \/ __ \/ __/ ___/
	//  / /___ | |/ /  __/ / / / /_(__  )
	// /_____/ |___/\___/_/ /_/\__/____/
	//
	// (Override the EventEmitter methods to forward listener management to internal properties)


	/**
	 * Add event listener to MixedProperty only
	 * Events from internal properties are forwarded via _setupEventForwarding
	 */
	on(eventName, listener) {
		return super.on(eventName, listener);
	}

	/**
	 * Add one-time event listener to MixedProperty only
	 */
	once(eventName, listener) {
		return super.once(eventName, listener);
	}

	/**
	 * Remove event listener from MixedProperty only
	 */
	off(eventName, listener) {
		return super.off(eventName, listener);
	}

	/**
	 * Remove all event listeners from MixedProperty and all internal properties
	 */
	removeAllListeners(eventName) {
		// Remove all listeners from this MixedProperty
		super.removeAllListeners(eventName);
		
		// Remove all listeners from internal properties
		this.internalProperties.forEach(property => {
			property.removeAllListeners(eventName);
		});
		
		return this;
	}

	/**
	 * Destroys all internal properties
	 */
	destroy() {
		// Clean up listener mappings
		if (this._listenerMappings) {
			this._listenerMappings.clear();
			this._listenerMappings = null;
		}

		this.internalProperties.forEach((property) => property.destroy());
		this.internalProperties.clear();
	}

	/**
	 * Returns the default configuration for this PropertyType.
	 * For MixedProperty, this delegates to the first configured type's defaults.
	 * @param {Object} defaults - The default configuration to merge with (should include 'types' array)
	 * @returns {Object} The default configuration
	 */
	static getStaticDefaults(defaults = {}) {
		const mixedPropertyDefaults = {
			name: null,
			allowNull: true,
			depends: null,
			mapping: null,
			submitAsString: false,
			isSortable: true,
			isTempId: false,
			isVirtual: false,
			title: null,
			tooltip: null,
			fieldGroup: null,
			isForeignModel: false,
			filterType: null,
			isFilteringDisabled: false,
			viewerType: null,
			editorType: null,
			isEditingDisabled: false,
			defaultValue: null,
			formatter: null,
		};
		
		// If types are configured, use the first type's default value
		if (defaults.types && Array.isArray(defaults.types) && defaults.types.length > 0) {
			const
				firstTypeConfig = defaults.types[0],
				firstTypeName = typeof firstTypeConfig === 'string' ? firstTypeConfig : firstTypeConfig.type;
			if (firstTypeName) {
				try {
					const PropertyClass = MixedProperty.prototype._getPropertyClass(firstTypeName);
					const typeDefaults = PropertyClass.getStaticDefaults ? PropertyClass.getStaticDefaults() : {};
					if (typeDefaults.defaultValue !== undefined) {
						mixedPropertyDefaults.defaultValue = typeDefaults.defaultValue;
					}
				} catch (e) {
					// If we can't get the property class, just use null default
				}
			}
		}
		
		return _.merge({}, mixedPropertyDefaults, defaults);
	}
}

MixedProperty.className = 'Mixed';
MixedProperty.type = 'mixed';