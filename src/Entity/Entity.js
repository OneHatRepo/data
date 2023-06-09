/** @module Entity */

import EventEmitter from '@onehat/events';
import PropertyTypes from '../Property/index.js';
import moment from 'moment';
import _ from 'lodash';

/**
 * Class represents a single Entity (i.e. a record)
 * which is a collection of Properties with current values.
 * 
 * Usage:
 * Setting data options:
 * - entity.users__last_name = 'Smith';
 * - entity.setValue('users__last_name', 'Smith');
 * - entity.setValues({
 * 		users__last_name: 'Smith',
 * });
 * 
 * Getting data options:
 * - entity.data; // Gets all property values as single JSON object
 * - entity.users__last_name;
 * - entity.getPropertySubmitValue('users__last_name');
 * 
 * @extends EventEmitter
 * @fires ['change', 'changeValidity', 'reset', 'reload', 'save', 'delete', 'undelete', 'destroy']
 */
class Entity extends EventEmitter {

	/**
	 * @constructor
	 * @param {Schema} schema - Schema object
	 * @param {object} rawData - Raw data object. Keys are Property names, Values are Property values.
	 * @param {Repository} repository
	 * @param {boolean} originalIsMapped - Has data already been mapped according to schema?
	 * @param {boolean} isDelayedSave - Should the repository skip autosave when immediately adding the record?
	 */
	constructor(schema, rawData = {}, repository = null, originalIsMapped = false, isDelayedSave = false, isRemotePhantomMode = false) {
		super(...arguments);

		if (!schema) {
			throw new Error('schema cannot be empty');
		}
		if (!schema.model) {
			throw new Error('model cannot be empty');
		}
		if (_.isNil(rawData)) {
			throw new Error('rawData cannot be null');
		}
		
		this.registerEvents([
			'change',
			'changeValidity',
			'reset',
			'reload',
			'save',
			'delete',
			'undelete',
			'destroy',
		]);
		

		/**
		 * @member {string} name
		 * @readonly
		 */
		this.name = schema.name;
		
		/**
		 * @member {Schema} schema
		 * @private
		 */
		this.schema = schema;
		
		/**
		 * @member {Schema} schema
		 * @private
		 */
		this.repository = repository;

		/**
		 * @member {object} _originalData - Original data object, *prior to* mapping or parsing.
		 * @private
		 */
		this._originalData = _.cloneDeep(rawData); // cloneDeep because we want the internal _originalData object to be separate from anything outside the entity.

		/**
		 * @member {object} _originalDataParsed - Original data object, *after* mapping and parsing.
		 * @private
		 */
		this._originalDataParsed = null;

		/**
		 * @member {boolean} originalIsMapped - Has the original data already been mapped according to schema?
		 * @private
		 */
		this.originalIsMapped = originalIsMapped;

		/**
		 * @member {Object} properties - Object of all Properties, keyed by id (for quick access)
		 * These properties are actually created in the initialize() function.
		 * @public
		 */
		this.properties = [];

		/**
		 * @member {boolean} isTree - Whether this Entity is a TreeNode
		 */
		this.isTree = schema.model.isTree || false;

		if (this.isTree && !schema.model.parentIdProperty) {
			throw new Error('parentIdProperty cannot be empty for a TreeNode');
		}
		if (this.isTree && this.repository?.isClosureTable && !schema.model.depthProperty) {
			throw new Error('depthProperty cannot be empty for a Closure Table TreeNode');
		}
		if (this.isTree && !schema.model.hasChildrenProperty) {
			throw new Error('hasChildrenProperty cannot be empty for a TreeNode');
		}

		/**
		 * @member {TreeNode} parent - The parent TreeNode for this TreeNode
		 * For trees only
		 */
		this.parent = null;

		/**
		 * @member {array} children - Contains any children of this TreeNode
		 * For trees only
		 */
		this.children = this._originalData.children && !_.isEmpty(this._originalData.children) ? this._originalData.children : [];

		/**
		 * @member {boolean} isChildrenLoaded - Whether child TreeNodes have loaded for this TreeNode
		 * For trees only
		 */
		this.isChildrenLoaded = this._originalData.isChildrenLoaded || false;

		/**
		 * @member {boolean} isPersisted - Whether this object has been persisted in a storage medium
		 * @public
		 */
		this.isPersisted = false;
		
		/**
		 * @member {Boolean} isInitialized - State: whether or not this entity has been completely initialized
		 * @public
		 */
		this.isInitialized = false;

		/**
		 * @member {boolean} isDeleted - Whether this object has been marked for deletion
		 * @public
		 */
		this.isDeleted = false;

		/**
		 * @member {boolean} isStaged - Whether this object has been marked for saving
		 * @public
		 */
		this.isStaged = false;

		/**
		 * @member {boolean} isSaving - Whether this object is in the process of saving
		 * @public
		 */
		this.isSaving = false;

		/**
		 * @member {boolean} isDestroyed - Whether this object has been destroyed
		 * @public
		 */
		this.isDestroyed = false;

		/**
		 * @member {boolean} isFrozen - Prevent the entity from being autoSaved on add, so an editor can change it before it gets saved to remote storage.
		 * @public
		 */
		this.isDelayedSave = isDelayedSave;

		/**
		 * @member {boolean} isRemotePhantomMode - Whether this Entity uses the "alternate" CRUD mode, with tempIds from server (see OneBuild repository)
		 * On a Repository, this mode overrides repository.isAutoSave, entity.isPersisted, && entity.isDelayedSave.
		 * On an Entity, this mode affects the isPhantom getter.
		 * @public
		 * @readonly
		 */
		this.isRemotePhantomMode = isRemotePhantomMode;

		/**
		 * @member {boolean} isRemotePhantom - Whether this entity is actually phantom on server; used only when this.isRemotePhantomMode.
		 * If this.isRemotePhantomMode, isRemotePhantom defaults to true for all new Entities.
		 * @public
		 */
		this.isRemotePhantom = this.isRemotePhantomMode;

		/**
		 * @member {boolean} lastModified - Last time this entity was modified
		 * @public
		 */
		this.lastModified = null;

		/**
		 * @member {boolean} isFrozen - Prevent the entity from being destroyed, but don't let it be changed either.
		 * @public
		 */
		this.isFrozen = false;

		/**
		 * @member {boolean} isValid - Whether this Entity passes validation
		 * @public
		 */
		this.isValid = null;

		/**
		 * @member {object} validationError - Any error in last validation.
		 * @public
		 */
		this.validationError = null;
		

		// This ES6 Proxy allows us to create magic getters and setters for all property values.
		// However, these getters and setters are *not* available within the Entity itself.
		this._proxy = new Proxy(this, {
			get (target, name, receiver) {
				if (name === 'then') { // special case, otherwise Promises break
					return Reflect.get(target, name, receiver);
				}
				if (!Reflect.has(target, name)) {
					if (!target.hasProperty(name)) {
						return null;
					}
					return target.getPropertySubmitValue(name);
				}
				return Reflect.get(target, name, receiver);
			},
			set (target, name, value, receiver) {
				if (this.isFrozen) {
					throw Error('Entity is frozen.');
				}
				if (!Reflect.has(target, name)) {
					target.setValue(name, value);
				} else {
					Reflect.set(target, name, value, receiver);
				}
				return true; // Return true, or else we sometimes get a proxy trap type error. https://developer.mozilla.org/en-US/docs/web/javascript/reference/global_objects/proxy/proxy/set
			},
		});

		return this._proxy; // Return the Proxy, not 'this'
	}

	initialize() {
		this.properties = this._createProperties();
		this._createMethods();
		this._createStatics();
		this.reset();
		this.isInitialized = true;
	}

	/**
	 * Creates the methods for this Entity, based on Schema.
	 * @private
	 */
	_createMethods = () => {
		if (this.isDestroyed) {
			throw Error('this._createMethods is no longer valid. Entity has been destroyed.');
		}
		const methodsDefinitions = this.schema.entity.methods;
		if (!_.isEmpty(methodsDefinitions)) {
			_.each(methodsDefinitions, (method, name) => {
				this[name] = method; // NOTE: Methods must be defined in schema as "function() {}", not as "() => {}" so "this" will be assigned correctly
			});
		}
	}

	/**
	 * Creates the static properties for this Entity, based on Schema.
	 * @private
	 */
	 _createStatics = () => {
		if (this.isDestroyed) {
			throw Error('this._createStatics is no longer valid. Entity has been destroyed.');
		}
		const staticsDefinitions = this.schema.entity.statics;
		if (!_.isEmpty(staticsDefinitions)) {
			_.each(staticsDefinitions, (value, key) => {
				this[key] = value;
			});
		}
	}

	/**
	 * Generates a new unique id and assigns it to this entity.
	 */
	createTempId = () => {
		if (this.isDestroyed) {
			throw Error('this.createTempId is no longer valid. Entity has been destroyed.');
		}
		if (!_.isNil(this.id)) {
			throw new Error('Entity id already exists.');
		}

		const idProperty = this.getIdProperty();
		
		if (!idProperty.newId) {
			throw new Error('idProperty.newId() does not exist');
		}

		this.setId(idProperty.newId());

		idProperty.isTempId = true;
	}

	/**
	 * Creates the Properties for this Entity,
	 * based on Schema propertyDefinitions.
	 * These properties do not yet have any values set.
	 * Assigns event handler for property's 'change' event.
	 * @private
	 */
	_createProperties = () => {
		if (this.isDestroyed) {
			throw Error('this._createProperties is no longer valid. Entity has been destroyed.');
		}
		const propertyDefinitions = this.schema.model.properties;
		let properties = {};
		_.each(propertyDefinitions, (definition) => {
			if (!definition.name) {
				throw new Error('Property definition must have "name".');
			}
			let type = definition.type;
			if (!type) {
				type = 'string';
			}

			const PT = PropertyTypes; // Was having ES6 import issues. This fixed it.
			if (!PT[type]) {
				throw new Error('PropertyType ' + type + ' does not exist.');
			}

			if (this.originalIsMapped) {
				// Data has already been mapped according to schema, so alter definition
				definition = _.clone(definition); // Clone it so you don't alter original in schema
				definition.mapping = definition.name;
			}
			const
				Property = PropertyTypes[type],
				property = new Property(definition, this._proxy);
			property.on('change', this._onPropertyChange);
			
			properties[definition.name] = property;
		});
		return properties;
	}

	/**
	 * Handler for Property's 'change' event.
	 * (Someone has directly called property.setValue)
	 * Recalculate any dependent properties, 
	 * then tell this Entity to fire its own 'change' event.
	 * @fires change
	 * @private
	 */
	_onPropertyChange = () => {
		this._recalculateDependentProperties();
		this.isValid = null;
		this.emit('change', this._proxy);
	}

	/**
	 * Manually load originalData into this Entity,
	 * *after* the entity has already been created.
	 * This resets the Entity, so it's 'as new'.
	 * This is mainly for updating Entity with new data 
	 * from remote storage medium.
	 * Assumes (and sets) isPersisted === true.
	 * Assumes (and sets) isTempId === false.
	 * @param {array} originalData - Raw data to load into entity.
	 */
	loadOriginalData = (originalData, assembleTreeNodes = true) => {
		if (this.isDestroyed) {
			throw Error('this.loadOriginalData is no longer valid. Entity has been destroyed.');
		}
		this.isPersisted = true;
		this._originalData = originalData || {};
		this.reset();
		this.getIdProperty().isTempId = false;

		if (this.isTree && this.repository && assembleTreeNodes) {
			this.repository.assembleTreeNodes(); // rebuilds them all
		}
	}

	/**
	 * Creates an exact copy of this Entity in its current state.
	 * @return {object} Entity - The clone
	 * @memberOf Entity
	 */
	clone = () => {
		const clone = new Entity(this.schema, this._originalData, this.repository);
		clone.initialize();
		if (this.isDirty) {
			clone.setValues( this.getRawValues() );
		}
		clone.isPersisted = this.isPersisted;
		clone.isDeleted = this.isDeleted;

		return clone;
	}

	/**
	 * Resets the Entity to a state as if it had just been created,
	 * Gets data to restore from _originalData.
	 */
	reset = () => {
		if (this.isDestroyed) {
			throw Error('this.reset is no longer valid. Entity has been destroyed.');
		}
		
		// Set property values from this._originalData
		this._resetPropertyValues();
		this._originalDataParsed = this.getParsedValues();

		if (this.isDeleted) {
			this.undelete();
		}
		this.markStaged(false);
		this.setLastModified();

		this.emit('reset', this._proxy);
	}

	/**
	 * Helper for reset.
	 * Resets all Property values for this Entity,
	 * based on this._originalData.
	 * @private
	 */
	_resetPropertyValues = () => {
		// We need to partition the properties into those which depend on other properties
		// for their local "parse" functions, and those which do not.
		const [dependentProperties, nonDependentProperties] = _.partition(this.properties, (property) => {
			return property.hasDepends;
		});
		
		// Do the non-dependent properties first
		_.each(nonDependentProperties, this._resetPropertyValue);

		// Notes: This will work for dependent properties which do not depend *on other dependent properties*
		// In order to make dependencies multi-layered, we'd have to sort the dependent properties
		// so that earlier ones do not depend on later ones.
		// TODO: Sort dependentProperties based on dependencies

		// Now do the dependent properties
		_.each(dependentProperties, this._resetPropertyValue);
	}

	/**
	 * Helper for _resetPropertyValues
	 * @private
	 */
	_resetPropertyValue = (property) => {
		let rawValue;
		if (property.hasMapping) {
			rawValue = Entity.getMappedValue(property.mapping, this._originalData);
		} else {
			rawValue = this._originalData[property.name];
		}
		if (_.isNil(rawValue)) {
			rawValue = property.getDefaultValue();
		}
		property.pauseEvents();
		property.setValue(rawValue);
		property.resumeEvents();
	}

	/**
	 * Helper for _resetPropertyValue.
	 * Walks the root object through the path provided by property.mapping
	 * 
	 * Example:
	 * Given the root object of:
	 * root = { a: { b: { c: true } } };
	 * and a mapping of 'a.b.c'
	 * this function will return true.
	 * 
	 * @param {Property} property
	 * @private
	 * @static
	 */
	static getMappedValue(mapping, root) {
		const mapStack = mapping.split('.');
		let value = root;
		try {
			_.each(mapStack, (path) => {
				value = value[path]; // walk the path
			});
		} catch(err) {
			value = null; // dead-end in path. i.e. invalid mapping
		}
		return value;
	}
	
	setLastModified = () => {
		this.lastModified = moment(new Date()).format('YYYY-MM-DD HH:mm:ss.SSSS');
	}


	//    ______     __  __
	//   / ____/__  / /_/ /____  __________
	//  / / __/ _ \/ __/ __/ _ \/ ___/ ___/
	// / /_/ /  __/ /_/ /_/  __/ /  (__  )
	// \____/\___/\__/\__/\___/_/  /____/

	/**
	 * Checks to see if a property exists
	 * @param {string} propertyName - Name of the Property to check
	 * @return {boolean} hasProperty
	 */
	hasProperty = (propertyName) => {
		return this.properties && this.properties.hasOwnProperty(propertyName);
	}

	/**
	 * Gets the Schema object
	 * @return {Schema} schema
	 */
	getSchema = () => {
		if (this.isDestroyed) {
			throw Error('this.getSchema is no longer valid. Entity has been destroyed.');
		}
		return this.schema;
	}

	/**
	 * Gets the Repository object
	 * @return {Repository} repository
	 */
	getRepository = () => {
		if (this.isDestroyed) {
			throw Error('this.getRepository is no longer valid. Entity has been destroyed.');
		}
		return this.repository;
	}

	/**
	 * Alias for this.properties
	 */
	get prop() {
		return this.properties;
	}

	/**
	 * Gets a single Property by name,
	 * @param {string} propertyName - Name of the Property to retrieve
	 * @return {object} property - The named Property
	 */
	getProperty = (propertyName) => {
		if (this.isDestroyed) {
			throw Error('this.getProperty is no longer valid. Entity has been destroyed.');
		}
		const property = this.properties[propertyName];
		if (!property) {
			throw new Error('Property ' + propertyName + ' not found. Are you sure you initialized this Entity?');
		}
		return property;
	}

	/**
	 * Gets the "submit" value of one Property,
	 * @param {string} propertyName - Name of the Property to query
	 * @return {any} submitValue
	 */
	getPropertySubmitValue = (propertyName) => {
		return this.getProperty(propertyName).getSubmitValue();
	}

	/**
	 * Gets the "display" value of one Property,
	 * @param {string} propertyName - Name of the Property to query
	 * @return {any} submitValue
	 */
	getPropertyDisplayValue = (propertyName) => {
		return this.getProperty(propertyName).getDisplayValue();
	}

	/**
	 * Gets an object of properties/values for this Entity,
	 * Values are the "submit" values, not the "raw" or "parsed" or "display" values.
	 * @return {object} propertyValues
	 */
	getSubmitValues = () => {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValues is no longer valid. Entity has been destroyed.');
		}
		let propertyValues = {};
		_.forOwn(this.properties, (property) => {
			propertyValues[property.name] = property.getSubmitValue();
		});
		return propertyValues;
	}

	/**
	 * Gets "submit" values for this Entity.
	 * @return {object} values
	 */
	get submitValues() {
		if (this.isDestroyed) {
			throw Error('this.submitValues is no longer valid. Entity has been destroyed.');
		}
		return this.getSubmitValues();
	}

	/**
	 * Gets an object of properties/values for this Entity,
	 * and returns them with the mapped names
	 * Values are the "submit" values, not the "raw" or "parsed" or "display" values.
	 * @return {object} propertyValues
	 */
	getSubmitValuesMapped = () => {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValuesMapped is no longer valid. Entity has been destroyed.');
		}
		
		let propertyValues = {};
		_.forOwn(this.properties, (property) => {
			const name = property.hasMapping ? property.getMapping() : property.name;
			propertyValues[name] = property.getSubmitValue();
		});
		return propertyValues;
	}

	/**
	 * Gets "submit" values for this Entity, and returns them with the mapped names
	 * @return {object} values
	 */
	get submitValuesMapped() {
		if (this.isDestroyed) {
			throw Error('this.submitValuesMapped is no longer valid. Entity has been destroyed.');
		}
		return this.getSubmitValuesMapped();
	}

	/**
	 * Gets an object of values for this Entity,
	 * Values are the "display" values, not the "raw" or "parsed" or "submit" values.
	 * @return {object} propertyValues
	 */
	getDisplayValues = () => {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValues is no longer valid. Entity has been destroyed.');
		}
		let propertyValues = {};
		_.forOwn(this.properties, (property) => {
			propertyValues[property.name] = property.getDisplayValue();
		});
		return propertyValues;
	}

	/**
	 * Gets "display" values for this Entity.
	 * @return {object} values
	 */
	get displayValues() {
		if (this.isDestroyed) {
			throw Error('this.displayValues is no longer valid. Entity has been destroyed.');
		}
		return this.getDisplayValues();
	}

	/**
	 * Gets an object of values for this Entity,
	 * Values are the "raw" values, not the "parsed" or "submit" or "display" values.
	 * @return {object} propertyValues
	 */
	getRawValues = () => {
		if (this.isDestroyed) {
			throw Error('this.getRawValues is no longer valid. Entity has been destroyed.');
		}
		let propertyValues = {};
		_.forOwn(this.properties, (property) => {
			propertyValues[property.name] = property.getRawValue();
		});
		return propertyValues;
	}

	/**
	 * Gets "raw" values for this Entity.
	 * @return {object} values
	 */
	get rawValues() {
		if (this.isDestroyed) {
			throw Error('this.rawValues is no longer valid. Entity has been destroyed.');
		}
		return this.getRawValues();
	}

	/**
	 * Gets an object of values for this Entity,
	 * Values are the "raw" values in their parsed form, not the "parsed" or "submit" or "display" values.
	 * @return {object} propertyValues
	 */
	getParsedRawValues = () => {
		if (this.isDestroyed) {
			throw Error('this.getParsedRawValues is no longer valid. Entity has been destroyed.');
		}
		let propertyValues = {};
		_.forOwn(this.properties, (property) => {
			propertyValues[property.name] = property.getParsedRawValue();
		});
		return propertyValues;
	}

	/**
	 * Gets "raw" values in their parsed form for this Entity.
	 * @return {object} values
	 */
	get parsedRawValues() {
		if (this.isDestroyed) {
			throw Error('this.parsedRawValues is no longer valid. Entity has been destroyed.');
		}
		return this.getParsedRawValues();
	}

	/**
	 * Gets an object of values for this Entity,
	 * Values are the "parsed" values, not the "raw" or "submit" or "display" values.
	 * @return {object} propertyValues
	 */
	getParsedValues = () => {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValues is no longer valid. Entity has been destroyed.');
		}
		let propertyValues = {};
		_.forOwn(this.properties, (property) => {
			propertyValues[property.name] = property.getParsedValue();
		});
		return propertyValues;
	}

	/**
	 * Gets "parsed" values for this Entity.
	 * @return {object} values
	 */
	get parsedValues() {
		if (this.isDestroyed) {
			throw Error('this.parsedValues is no longer valid. Entity has been destroyed.');
		}
		return this.getParsedValues();
	}

	/**
	 * Reconstructs _originalData from current rawValues of properties.
	 * @return {object} originalData
	 * @private
	 */
	_getReconstructedOriginalData = () => {
		if (this.isDestroyed) {
			throw Error('this._getReconstructedOriginalData is no longer valid. Entity has been destroyed.');
		}
		let originalData = {};
		_.forOwn(this.properties, (property) => {
			if (property.hasMapping) {
				const result = Entity.getReverseMappedRawValue(property);
				_.merge(originalData, result);
			} else {
				originalData[property.name] = property.getRawValue();
			}
		});
		return originalData;
	}

	/**
	 * Helper for _getReconstructedOriginalData
	 * @param {object} property - The property to get reverseMappedRawValue for
	 * @return {object} value - An object representing the 'path' to the raw value.
	 * e.g. With a mapping of 'a.b.c' and a property rawValue of '47', the 
	 * following object will be returned:{ a: { b: { c: '47' }, }, }
	 * @private
	 * @static
	 */
	static getReverseMappedRawValue(property) {
		if (!property.hasMapping) {
			const obj = {};
			obj[property.name] = property.rawValue;
			return obj;
		}
		const
			mapStack = property.mapping.split('.'),
			rawValue = property.getRawValue();

		// Build up the hierarchy
		let value = {},
			current = value,
			i,
			total = mapStack.length;
		for (i = 0; i < total; i++) {
			let path = mapStack[i];
			if (current && !current.hasOwnProperty(path)) {
				current[path] = {}; // walk the path
			}
			if (i < total -1) {
				current = current[path];
			} else {
				current[path] = rawValue; // Last one, so set the value
			}
		}
		return value;
	}

	/**
	 * Builds up an object of original values for this entity, from which another entity could be easily created
	 * @return {object} value - An object representing the 'path' to the raw value.
	 * e.g. With a mapping of 'a.b.c' and a property rawValue of '47', the 
	 * following object will be returned:{ a: { b: { c: '47' }, }, }
	 */
	getReverseMappedRawValues = () => {
		if (this.isDestroyed) {
			throw Error('this.getReverseMappedRawValues is no longer valid. Entity has been destroyed.');
		}
		
		let propertyValues = {};
		_.forOwn(this.properties, (property) => {
			const reverseMapped = Entity.getReverseMappedRawValue(property);
			_.merge(propertyValues, reverseMapped);
		});
		return propertyValues;
	}

	/**
	 * Convenience function
	 * Build a new entity with this data
	 */
	getDataForNewEntity = () => {
		if (this.isDestroyed) {
			throw Error('this.getDataForNewEntity is no longer valid. Entity has been destroyed.');
		}
		
		return this.getReverseMappedRawValues();
	}

	/**
	 * Gets the values that have changed since last time saved
	 * @return {array|boolean} diff - Array of property names that have changed, or false
	 */
	getChanged = () => {
		const
			original = this._originalDataParsed,
			current = this.getParsedRawValues(),
			diff = Object.keys(original).reduce((result, key) => { // from https://stackoverflow.com/a/40610459/9163076
				if (current && !current.hasOwnProperty(key)) {
					result.push(key);
				} else if (_.isEqual(original[key], current[key])) {
					const resultKeyIndex = result.indexOf(key);
					result.splice(resultKeyIndex, 1);
				}
				return result;
			}, Object.keys(current));
	
		return !_.isEmpty(diff) ? diff : false;
	}

	/**
	 * Gets a comprehensive analysis of what has changed since the last save
	 * @return {object} changedPropertyValues - Object representing each changed field and both its original and current value
	 */
	getChangedValues = () => {
		const
			original = this._originalDataParsed,
			current = this.getRawValues(),
			names = this.getChanged();
		const changedPropertyValues = {};
		_.each(names, (name) => {
			changedPropertyValues[name] = {
				original: original[name],
				current: current[name],
			};
		});
		return changedPropertyValues;
	}

	/**
	 * Alias for this.submitValues
	 */
	get data() {
		if (this.isDestroyed) {
			throw Error('this.data is no longer valid. Entity has been destroyed.');
		}
		return this.submitValues;
	}

	/**
	 * Get all Property objects that pass a supplied filter.
	 * @param {function} filter - Filter function
	 * @return {array} properties - Array of Property objects
	 */
	getPropertiesBy = (filter) => {
		if (this.isDestroyed) {
			throw Error('this.getPropertiesBy is no longer valid. Entity has been destroyed.');
		}
		return _.filter(this.properties, filter);
	}

	/**
	 * Gets the "id" Property object for this Entity.
	 * This is the Property whose value represents the id for the whole Entity itself.
	 * @return {Property} id Property
	 */
	getIdProperty = () => {
		if (this.isDestroyed) {
			throw Error('this.getIdProperty is no longer valid. Entity has been destroyed.');
		}
		const idProperty = this.getSchema().model?.idProperty || null;
		if (!idProperty) {
			throw new Error('No idProperty found for ' + schema.name);
		}
		return this.getProperty(idProperty);
	}

	/**
	 * Gets the id for this Entity.
	 * @return {any} id - The id
	 */
	getId = () => {
		if (this.isDestroyed) {
			return this._id;
		}
		return this.getIdProperty().getSubmitValue();
	}

	/**
	 * Getter of the id for this Entity.
	 * @return {any} id - The id
	 */
	get id() {
		if (this.isDestroyed) {
			return this._id;
		}
		return this.getId();
	}

	/**
	 * Is this Entity's idProperty using a temporary ID?
	 * @return {boolean} isTempId
	 */
	get isTempId() {
		return this.getIdProperty().isTempId;
	}

	/**
	 * Marks this Entity's idProperty's isTempId field
	 * @return {boolean} isTempId
	 */
	set isTempId(bool) {
		this.getIdProperty().isTempId = bool;
	}

	/**
	 * Gets the "Display" Property object for this Entity.
	 * This is the Property whose value can easily identify the whole Entity itself.
	 * @return {Property} Display Property
	 */
	getDisplayProperty = () => {
		if (this.isDestroyed) {
			throw Error('this.getDisplayProperty is no longer valid. Entity has been destroyed.');
		}
		const
			schema = this.getSchema(),
			model = schema.model,
			displayProperty = model && model.displayProperty ? model.displayProperty : null;
		if (!displayProperty) {
			throw new Error('No displayProperty found for ' + schema.name);
		}
		return this.getProperty(displayProperty);
	}

	/**
	 * Gets the "Display" value for this Entity.
	 * This value should easily identify the whole Entity itself.
	 * @return {Property} Display Property
	 */
	getDisplayValue = () => {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Entity has been destroyed.');
		}
		return this.getDisplayProperty().getDisplayValue();
	}

	/**
	 * Getter of the "Display" value for this Entity.
	 * This value should easily identify the whole Entity itself.
	 * @return {any} displayValue
	 */
	get displayValue() {
		if (this.isDestroyed) {
			throw Error('this.displayValue is no longer valid. Entity has been destroyed.');
		}
		return this.getDisplayValue();
	}

	/**
	 * Getter of isPhantom for this Entity.
	 * Entity is phantom if it has either no id or a temp id.
	 * @return {boolean} isPhantom
	 */
	get isPhantom() {
		if (this.isDestroyed) {
			throw Error('this.isPhantom is no longer valid. Entity has been destroyed.');
		}

		if (this.isRemotePhantomMode) {
			return this.isRemotePhantom;
		}
		
		const
			idProperty = this.getIdProperty(),
			id = idProperty.getSubmitValue();
		
		// No ID
		if (_.isNil(id)) {
			return true;
		}

		// ID is temporary
		if (idProperty.isTempId) {
			return true;
		}

		return false;
	}

	/**
	 * Getter of isDirty for this Entity.
	 * Entity is dirty if it has any Property changes
	 * that have not been persisted to storage medium.
	 * Practically, this means it has any values that are different from this._originalData.
	 * @return {boolean} isDirty
	 */
	get isDirty() {
		if (this.isDestroyed) {
			throw Error('this.isDirty is no longer valid. Entity has been destroyed.');
		}
		return !_.isEqualWith(this._originalDataParsed, this.getParsedValues());
	}

	/**
	 * Gets the a hash of the current submitValues.
	 * This allows easy detection of changes in data.
	 * @return {integer} hash
	 */
	getHash = () => {
		if (this.isDestroyed) {
			throw Error('this.getHash is no longer valid. Entity has been destroyed.');
		}

		const str = JSON.stringify(_.merge({}, this.submitValues, {
			// include Entity state in hash
			isDestroyed: this.isDestroyed,
			isPhantom: this.isPhantom,
			isDirty: this.isDirty,
			isTempId: this.isTempId,
		}));

		// from https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
		const seed = 0;
		let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
		for (let i = 0, ch; i < str.length; i++) {
			ch = str.charCodeAt(i);
			h1 = Math.imul(h1 ^ ch, 2654435761);
			h2 = Math.imul(h2 ^ ch, 1597334677);
		}
		h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
		h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
		const hash = 4294967296 * (2097151 & h2) + (h1>>>0);

		return hash;
	}

	/**
	 * Getter of the hash for this Entity.
	 * @return {integer} hash
	 */
	get hash() {
		return this.getHash();
	}

	/**
	 * Gets the original data object for this Entity.
	 * This is either what was persisted to storage medium, or what was
	 * loaded in at initialization.
	 * @return {object} _originalData
	 * @private
	 */
	getOriginalData = () => {
		if (this.isDestroyed) {
			throw Error('this.getOriginalData is no longer valid. Entity has been destroyed.');
		}
		return this._originalData;
	}

	/**
	 * Gets the associated Repository
	 * @param {string} repositoryName - Name of the Repository to retrieve
	 * @return {boolean} hasProperty
	 */
	getAssociatedRepository = (repositoryName) => {
		if (this.isDestroyed) {
			throw Error('this.getAssociatedRepository is no longer valid. Entity has been destroyed.');
		}

		const schema = this.getSchema();
		if (!schema.model.associations.hasOne.includes(repositoryName) &&
			!schema.model.associations.hasMany.includes(repositoryName) &&
			!schema.model.associations.belongsTo.includes(repositoryName) &&
			!schema.model.associations.belongsToMany.includes(repositoryName)
			) {
			throw Error(repositoryName + ' is not associated with this schema');
		}

		const repository = this.getRepository();
		if (!repository) {
			throw Error('No repository on this entity');
		}

		const oneHatData = repository.oneHatData;
		if (!oneHatData) {
			throw Error('No global oneHatData object');
		}

		const associatedRepository = oneHatData.getRepository(repositoryName);
		if (!associatedRepository) {
			throw Error('Repository ' + repositoryName + ' cannot be found');
		}
		
		return associatedRepository;
	}



	//    _____      __  __
	//   / ___/___  / /_/ /____  __________
	//   \__ \/ _ \/ __/ __/ _ \/ ___/ ___/
	//  ___/ /  __/ /_/ /_/  __/ /  (__  )
	// /____/\___/\__/\__/\___/_/  /____/

	/**
	 * Sets the id for this entity.
	 * Note: Does *not* fire any change events.
	 * @param {any} id - The new id of this entity
	 * @param {boolean} force - Force the change to _originalData
	 * @return {boolean} isChanged - Whether id was actually changed
	 */
	setId = (id, force = false) => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		let isChanged = false;
		const idProperty = this.getIdProperty();

		idProperty.pauseEvents(); // We don't need property_change to fire
		if (idProperty.setValue(id)) {
			isChanged = true;
		}
		idProperty.resumeEvents();

		if (isChanged || force) {
			// Set this id on the _originalData* objects
			if (idProperty.hasMapping) {
				_.merge(this._originalData, Entity.getReverseMappedRawValue(idProperty));
			} else {
				this._originalData[idProperty.name] = idProperty.getRawValue();
			}
			this._originalDataParsed[idProperty.name] = idProperty.getParsedValue();
		}
		
		idProperty.isTempId = false;
		this.setLastModified();

		return isChanged;
	}

	/**
	 * Sets a single Property value
	 * @param {string} propertyName - Name of the Property to alter
	 * @param {any} rawValue - The raw, unparsed value to assign to the Property.
	 * What if this property hasMapping?
	 * 
	 * @return {boolean} isChanged - Whether any values were actually changed
	 */
	setValue = (propertyName, rawValue) => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.setValue is no longer valid. Entity has been destroyed.');
		}
		let propertyValues = {};
		propertyValues[propertyName] = rawValue;
		return this.setValues(propertyValues);
	}
	
	/**
	 * Sets Property values
	 * @param {object} rawData - Raw data object. These are prior to mapping, 
	 * similar to what you'd use to create a brand new Entity. Make sure *all*
	 * values are here, not just a few.
	 * @return {boolean} isChanged - Whether any values were actually changed
	 */
	 setRawValues = (rawData) => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.setRawValues is no longer valid. Entity has been destroyed.');
		}

		const [dependentProperties, nonDependentProperties] = _.partition(this.properties, (property) => {
			return property.hasDepends;
		});
		const mappedData = {};
		function setMappedValue(property) {
			let rawValue;
			if (property.hasMapping) {
				rawValue = Entity.getMappedValue(property.mapping, rawData);
			} else {
				rawValue = rawData[property.name];
			}
			if (_.isNil(rawValue)) {
				rawValue = property.getDefaultValue();
			}
			mappedData[property.name] = rawValue;
		}
		
		_.each(nonDependentProperties, setMappedValue);
		_.each(dependentProperties, setMappedValue);

		return this.setValues(mappedData);
	}

	/**
	 * Sets Property values
	 * @param {object} data - Raw data object. Keys are Property names, Values are Property values.
	 * @return {boolean} isChanged - Whether any values were actually changed
	 * @fires change
	 */
	setValues = (data) => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.setValues is no longer valid. Entity has been destroyed.');
		}
		if (_.indexOf(data, this.getIdProperty().name) !== -1) {
			throw new Error('Cannot change id via entity.setValues(). Must use entity.setId() first.');
		}

		let isChanged = false;
		_.each(data, (value, propertyName) => {
			const property = this.getProperty(propertyName);
			property.pauseEvents(); // We don't need property_change to fire
			if (property.setValue(value)) {
				isChanged = true;
			}
			property.resumeEvents();
		});
		this.setLastModified();

		if (isChanged) {
			this._recalculateDependentProperties();
			this.isValid = null;
			this.emit('change', this._proxy);
		}
		return isChanged;
	}

	/**
	 * Helper for _setValues and _onPropertyChange
	 * @private
	 */
	_recalculateDependentProperties = () => {
		const dependentProperties = this.getPropertiesBy((property) => {
			return property.hasDepends;
		});
		_.each(dependentProperties, (property) => {
			property.pauseEvents(); // We don't want property_change to fire
			property.setValue( property.getRawValue() ); // Force the property to re-parse the raw value originally submitted to it
			property.resumeEvents();
		});
	}

	/**
	 * Tells the Repository to reload just this one entity from the storage medium.
	 * @fires reload
	 */
	reload = () => {
		if (this.isDestroyed) {
			throw Error('this.reload is no longer valid. Entity has been destroyed.');
		}
		
		if (this.repository) {
			return this.repository.reloadEntity(this._proxy);
		}

		this.emit('reload', this._proxy);
	}

	/**
	 * Tells the Repository to save this entity to the storage medium.
	 * @fires save
	 */
	save = () => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.save is no longer valid. Entity has been destroyed.');
		}
		this.emit('save', this._proxy);
		if (this.repository) {
			return this.repository.save(this._proxy);
		}
	}

	/**
	 * Marks an entity as having been saved to storage medium.
	 */
	markSaved = () => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.markSaved is no longer valid. Entity has been destroyed.');
		}
		this.isPersisted = true;
		this.getIdProperty().isTempId = false;
		this._originalData = this._getReconstructedOriginalData();
		this._originalDataParsed = this.getParsedValues();
		this.markStaged(false);
	}

	/**
	 * Marks an entity for deletion.
	 * @param {boolean} bool - How it should be marked. Defaults to true.
	 */
	markDeleted = (bool = true) => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.markDeleted is no longer valid. Entity has been destroyed.');
		}
		this.isDeleted = bool;
	}

	/**
	 * Tells the Repository to delete this entity from the storage medium.
	 * @fires delete
	 */
	delete = () => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.delete is no longer valid. Entity has been destroyed.');
		}
		this.markDeleted();
		this.emit('delete', this._proxy);
		if (this.repository) {
			return this.repository.save(this._proxy);
		}
	}

	/**
	 * Marks a deleted entity as undeleted.
	 * Only works when isAutoSave is off for the containing repository
	 * @fires delete
	 */
	undelete = () => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.undelete is no longer valid. Entity has been destroyed.');
		}
		const repository = this.getRepository();
		if (repository && repository.isAutoSave) {
			throw Error('Cannot undelete entities on an isAutoSave repository.');
		}
		this.markDeleted(false);
		this.emit('undelete', this._proxy);
	}

	/**
	 * Marks an entity as having been staged for saving.
	 * @param {boolean} bool - How it should be marked. Defaults to true.
	 */
	markStaged = (bool = true) => {
		if (this.isFrozen) {
			throw Error('Entity is frozen.');
		}
		if (this.isDestroyed) {
			throw Error('this.markStaged is no longer valid. Entity has been destroyed.');
		}
		this.isStaged = bool;
	}

	/**
	 * Convenience function.
	 */
	stage = () => {
		this.markStaged(true);
	}

	/**
	 * Prevent the entity from being destroyed, but don't let it be changed either.
	 */
	freeze = () => {
		this.isFrozen = true;
	}


	//  _    __      ___     __      __  _
	// | |  / /___ _/ (_)___/ /___ _/ /_(_)___  ____
	// | | / / __ `/ / / __  / __ `/ __/ / __ \/ __ \
	// | |/ / /_/ / / / /_/ / /_/ / /_/ / /_/ / / / /
	// |___/\__,_/_/_/\__,_/\__,_/\__/_/\____/_/ /_/

	/**
	 * Gets whether or not the Entity validates according to schema's validation rules
	 * @return {boolean} isValid
	 */
	validate = async () => {
		if (this.isDestroyed) {
			throw Error('this.validate is no longer valid. Entity has been destroyed.');
		}

		const submitValues = this.submitValues;
		let isValid = null,
			validationResult,
			error;

		if (this.schema.model.validator) {
			const validator = this.schema.model.validator;
			try {
				validationResult = await validator.validate(submitValues);
				error = validationResult.error; // Joi would populate 'error' if validation error. Yup would throw Error
				isValid = !error; // 'error' would be truthy if Joi error occurs, would never *get* here if an error with Yup
			} catch(e) {
				error = e; // yup error only
				isValid = false;
			}
			if (this.validationError !== error) {
				this.validationError = error;
			}
		}

		if (this.isValid !== isValid) {
			this.emit('changeValidity', this._proxy, isValid);
			this.isValid = isValid;
		}

		return isValid;
	}



	//   ______
	//  /_  __/_______  ___  _____
	//   / / / ___/ _ \/ _ \/ ___/
	//  / / / /  /  __/  __(__  )
	// /_/ /_/   \___/\___/____/

	/**
	 * Gets the "parentId" Property object for this TreeNode.
	 * This is the Property whose value represents the id for the parent TreeNode.
	 * @return {Property} parentId Property
	 */
	getParentIdProperty = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getParentIdProperty is no longer valid. TreeNode has been destroyed.');
		}

		const parentIdProperty = this.getSchema().model.parentIdProperty;
		return this.getProperty(parentIdProperty);
	}

	/**
	 * Gets the parentId for this TreeNode.
	 * It does this by getting the parentId property's submitValue.
	 * It doesn't look at some value created by client on the TreeNode.
	 * @return {any} parentId - The parentId
	 */
	getParentId = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getParentId is no longer valid. TreeNode has been destroyed.');
		}
		
		return this.getParentIdProperty().getSubmitValue();
	}

	/**
	 * Getter of parentId for this TreeNode.
	 * @return {any} parentId - The parentId
	 */
	get parentId() {
		return this.getParentId();
	}

	/**
	 * Getter of hasParent
	 * Returns true if this node has a parentId
	 * @return {boolean} hasParent
	 */
	get hasParent() {
		this.ensureTree();

		return !!this.parentId;
	}

	/**
	 * Getter of isRoot
	 * Returns true if this node has no parent
	 * @return {boolean} hasParent
	 */
	get isRoot() {
		this.ensureTree();

		return !this.hasParent;
	}

	/**
	 * Gets the "depth" Property object for this TreeNode.
	 * This is the Property whose value represents the depth of the TreeNode.
	 * @return {Property} parentId Property
	 */
	getDepthProperty = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getDepthProperty is no longer valid. TreeNode has been destroyed.');
		}

		const depthProperty = this.getSchema().model.depthProperty;
		return this.getProperty(depthProperty);
	}

	/**
	 * Gets the depth for this TreeNode.
	 * It does this by getting the depth property's submitValue.
	 * @return {any} depth - The depth
	 */
	getDepth = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getDepth is no longer valid. TreeNode has been destroyed.');
		}
		
		return this.getDepthProperty().getSubmitValue();
	}

	/**
	 * Getter of depth for this TreeNode.
	 * @return {any} depth - The depth
	 */
	get depth() {
		return this.getDepth();
	}

	/**
	 * Gets the "hasChildren" Property object for this TreeNode.
	 * This is the Property whose value represents whether this TreeNode has any children.
	 * @return {Property} parentId Property
	 */
	getHasChildrenProperty = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getHasChildrenProperty is no longer valid. TreeNode has been destroyed.');
		}

		const hasChildrenProperty = this.getSchema().model.hasChildrenProperty;
		return this.getProperty(hasChildrenProperty);
	}

	/**
	 * Gets the hasChildren value for this TreeNode.
	 * It does this by getting the hasChildren property's submitValue.
	 * It doesn't look at some value created by client on the TreeNode.
	 * @return {any} parentId - The parentId
	 */
	getHasChildren = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getHasChildren is no longer valid. TreeNode has been destroyed.');
		}

		return this.getHasChildrenProperty().getSubmitValue();
	}

	/**
	 * Getter of hasChildren for this TreeNode.
	 * @return {any} parentId - The parentId
	 */
	get hasChildren() {
		return this.getHasChildren();
	}

	/**
	 * Getter of parent TreeNode for this TreeNode.
	 * @return {TreeNode} parent - The parent TreeNode
	 */
	getParent = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getParent is no longer valid. TreeNode has been destroyed.');
		}

		if (!this.hasParent) {
			return null;
		}
		return this.parent;
	}

	/**
	 * Getter of child TreeNodes for this TreeNode.
	 * @return {array} children - The children
	 */
	getChildren = async () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getChildren is no longer valid. TreeNode has been destroyed.');
		}
		if (!this.isChildrenLoaded) {
			await this.loadChildren();
		}
		return this.children;
	}

	/**
	 * Whether the supplied TreeNode is a child of this TreeNode.
	 * @return {boolean} hasThisChild
	 */
	hasThisChild = async (treeNode) => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.hasThisChild is no longer valid. TreeNode has been destroyed.');
		}

		const children = await this.getChildren();
		return  _.includes(children, treeNode);
	}

	/**
	 * Loads the children of this TreeNode from repository.
	 */
	loadChildren = async (depth) => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.loadChildren is no longer valid. TreeNode has been destroyed.');
		}
		if (!this.repository?.loadChildren) {
			throw Error('repository.loadChildren is not defined.');	
		}

		this.children = await this.repository.loadChildren(this, depth); // populates the children with a reference to this in child.parent
		this.isChildrenLoaded = true;
	}

	/**
	 * Alias for loadChildren
	 */
	reloadChildren = () => { // alias
		return this.loadChildren();
	}

	/**
	 * Gets the previous sibling of this TreeNode from repository.
	 * @return {TreeNode} sibling
	 */
	getPrevousSibling = async () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getPrevousSibling is no longer valid. TreeNode has been destroyed.');
		}

		const 
			parent = this.getParent(),
			siblings = await parent.getChildren();
		let previous = null;
		_.each(siblings, (treeNode) => {
			if (treeNode.id === this.id) {
				return false;
			}
			previous = treeNode;
		})
		return previous;
	}

	/**
	 * Gets the next sibling of this TreeNode from repository.
	 * @return {TreeNode} sibling
	 */
	getNextSibling = async () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getNextSibling is no longer valid. TreeNode has been destroyed.');
		}

		const 
			parent = this.getParent(),
			siblings = await parent.getChildren();
		let returnNext = false,
			next = null;
		_.each(siblings, (treeNode) => {
			if (returnNext) {
				next = treeNode;
				return false;
			}
			if (treeNode.id === this.id) {
				returnNext = true;
			}
		})
		return next;
	}

	/**
	 * Gets the child of this TreeNode at index ix from repository.
	 * @return {TreeNode} child
	 */
	getChildAt = (ix) => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getChildAt is no longer valid. TreeNode has been destroyed.');
		}

		if (!this.children[ix]) {
			return null;
		}
		return this.children[ix];
	}

	/**
	 * Gets the first child of this TreeNode from repository.
	 * @return {TreeNode} child
	 */
	getFirstChild = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getFirstChild is no longer valid. TreeNode has been destroyed.');
		}

		if (!this.children[0]) {
			return null;
		}
		return this.children[0];
	}

	/**
	 * Gets the last child of this TreeNode from repository.
	 * @return {TreeNode} child
	 */
	getLastChild = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getLastChild is no longer valid. TreeNode has been destroyed.');
		}

		const child = this.children.slice(-1)[0];
		if (!child) {
			return null;
		}
		return child;
	}

	/**
	 * Gets the path to this node.
	 * @return {string} path
	 */
	getPath = () => {
		this.ensureTree();
		if (this.isDestroyed) {
			throw Error('this.getPath is no longer valid. TreeNode has been destroyed.');
		}

		const parentIds = [];
		let parent = this;
		while(parent.hasParent) { // stops at root
			parentIds.push(parent.id);
			parent = parent.parent;
		}
		if (parent.id !== this.id) {
			parentIds.push(parent.id); // add root id
		}

		return parentIds.reverse().join('/');
	}

	/**
	 * Helper to make sure this Repository is a tree
	 * @private
	 */
	ensureTree = async () => {
		if (!this.isTree) {
			this.throwError('This Entity is not a tree!');
			return false;
		}
		return true;
	}


	/**
	 * Destroy this object.
	 * - Removes all circular references to parent objects
	 * - Removes child objects
	 * - Removes event listeners
	 * @fires destroy
	 */
	destroy = () => {
		if (this.isFrozen) {
			return;
		}

		// Save destroyed properties
		this.destroyedProperties = this.displayValues;

		this._id = this.id; // save id, so we can query it later--even on a destroyed entity

		// parent objects
		this.schema = null;
		this._proxy = null;
		this.repository = null;
		
		// child objects
		_.each(this.properties, (property) => {
			property.destroy();
		})
		this.properties = null;

		this.emit('destroy', this._proxy);
		this.isDestroyed = true;
		
		// listeners
		this.removeAllListeners();
	}

	get [Symbol.toStringTag]() {
		return 'Entity {' + this.id + '} - ' + (this.isDestroyed ? 'destroyed' : this.displayValue);
	}

	get toJSON() {
		if (this.isDestroyed) {
			throw Error('this.toJSON is no longer valid. Entity has been destroyed.');
		}
		return this.getRawValues();
	}
	
}

export default Entity;
