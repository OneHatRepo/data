/** @module Property */

import EventEmitter from '@onehat/events';
import _ from 'lodash';

/**
 * Base class representing a Property
 * This class should not be instantiated directly.
 * Rather, instantiate a subclass, like StringProperty
 * @extends EventEmitter
 * @fires ['change', 'changeValidity', 'destroy']
 */
export default class Property extends EventEmitter {

	/**
	 * @constructor
	 * @param {object} config - Object with key/value pairs that define this Property
	 */
	constructor(config = {}, entity) {
		super(...arguments);
		
		const defaults = {
			/**
			 * @member {string} name - Could be anything, but OneHat's convention is to use
			 * the model name pluralized and underscored, followed by two underscores, 
			 * followed by the field name singular and underscored (e.g. 'groups_users__id')
			 * This convention allows us to have multiple models' data in a single Entity, all flattened
			 */
			name: null,

			/**
			 * @member {boolean} allowNull - Is the property required to have a value? 
			 * Defaults to true.
			 */
			allowNull: true,

			/**
			 * @member {function} parse - Custom parse function that overrides 
			 * Property.parse.
			 * Takes one argument:
			 * - rawValue {any} - The raw value to parse
			 * 
			 * Note: If you use standard function notation for the parse function,
			 * then the Property and Entity (with all other parsed properties and original data)
			 * are available inside the function as:
			 * - Property: this
			 * - Entity: this.getEntity()
			 * - Original Data: this.getEntity().getOriginalData()
			 * 
			 * Returns 'parsedValue'
			 * @private
			 */
			// parse: null,

			/**
			 * @member {(string|string[])} depends - Other properties this property 
			 * depends upon for its custom "parse" function. 
			 * @private
			 */
			depends: null,
			
			/**
			 * @member {string} mapping - JS dot-notation path
			 * (e.g. "user.username") for how to access the rawValue which will be 
			 * given to parse(), based on an Entity's _originalData object.
			 * @private
			 * @readonly
			 */
			mapping: null,
			
			/**
			 * @member {any} defaultValue - Default value for this property if none is supplied
			 * @private
			 */
			defaultValue: null,
			
			/**
			 * @member {boolean} submitAsString - Whether to submit value as a string, rather than a primitive or complex type
			 */
			submitAsString: false,

			/**
			 * @member {boolean} isSortable - Whether this property type is sortable
			 */
			isSortable: true,
			
			/**
			 * @member {boolean} isTempId - Whether this property's ID is temporary
			 */
			isTempId: false,

			// ##################################################################
			// #### These next properties are only for OneBuild repositories ####
			// ##################################################################

			/**
			 * @member {boolean} isVirtual - Whether this property represents a virtual field on server
			 */
			isVirtual: false,
			
			/**
			 * @member {string} title - The human-readable title for this property
			 */
			title: null,
			
			/**
			 * @member {string} tooltip - The human-readable tooltip for this property
			 */
			tooltip: null,
			
			/**
			 * @member {string} fieldGroup - The field group for this property
			 */
			fieldGroup: null,

			/**
			 * @member {boolean} isForeignModel - Whether this property belongs to a foreign model
			 */
			isForeignModel: false,
			
			/**
			 * @member {object} filterType - The UI filter type of this property
			 */
			filterType: null,

			/**
			 * @member {boolean} isFilteringDisabled - Whether this property is disabled for UI filtering
			 */
			isFilteringDisabled: false,
			
			/**
			 * @member {object} viewerType - The UI viewer type of this property
			 */
			viewerType: null,
			
			/**
			 * @member {object} editorType - The UI editor type of this property
			 */
			editorType: null,

			/**
			 * @member {boolean} isEditingDisabled - Whether this property is disabled for UI editing
			 */
			isEditingDisabled: false,

		};
		
		_.merge(this, defaults, config);
		this._originalConfig = config;

		this.registerEvents([
			'change',
			'changeValidity',
			'destroy',
		]);

		/**
		 * @member {object} entity - Entity object
		 * @private
		 */
		this._entity = entity;

		/**
		 * @member {any} rawValue - The raw value supplied to this property, *before* any parsing was applied
		 */
		this.rawValue = null;
		
		/**
		 * @member {any} parsedValue - The value for this property, *after* any parsing was applied
		 */
		this.parsedValue = null;
		
		/**
		 * @member {boolean} isDestroyed - Whether this object has been destroyed
		 * @private
		 */
		this.isDestroyed = false;
		
	}



	//    ______     __  __
	//   / ____/__  / /_/ /____  __________
	//  / / __/ _ \/ __/ __/ _ \/ ___/ ___/
	// / /_/ /  __/ /_/ /_/  __/ /  (__  )
	// \____/\___/\__/\__/\___/_/  /____/


	/**
	 * Gets default value. Can be overridden to get dynamic default value.
	 * @return {any} defaultValue
	 */
	getDefaultValue() {
		let value = null;
		if (!_.isNil(this.defaultValue)) {
			value = this.defaultValue;
		}
		if (_.isFunction(value)) {
			value = value();
		}
		return value;
	}

	/**
	 * Gets "raw" value
	 * @return {any} rawValue
	 */
	getRawValue() {
		if (this.isDestroyed) {
			throw Error('this.getRawValue is no longer valid. Property has been destroyed.');
		}
		return this.rawValue;
	}

	/**
	 * Gets "raw" value in its parsed form
	 * @return {any} rawValue
	 */
	getParsedRawValue() {
		if (this.isDestroyed) {
			throw Error('this.getParsedRawValue is no longer valid. Property has been destroyed.');
		}
		return this.parse(this.rawValue);
	}

	/**
	 * Gets "parsed" value, without any formatting applied
	 * @return {any} parsedValue
	 */
	getParsedValue() {
		if (this.isDestroyed) {
			throw Error('this.getParsedValue is no longer valid. Property has been destroyed.');
		}
		return this.parsedValue;
	}

	/**
	 * Gets parsed value, formatted for submission to server
	 * @return {any} parsedValue
	 */
	getSubmitValue() {
		if (this.isDestroyed) {
			throw Error('this.getSubmitValue is no longer valid. Property has been destroyed.');
		}
		if (this.submitAsString) {
			return String(this.parsedValue);
		}
		return this.parsedValue;
	}

	/**
	 * Gets parsed value, formatted for submission to server
	 * @return {any} submitValue
	 */
	get submitValue() {
		if (this.isDestroyed) {
			throw Error('this.submitValue is no longer valid. Property has been destroyed.');
		}
		return this.getSubmitValue();
	}

	/**
	 * Gets parsed value, formatted for displaying to user
	 * @return {any} _displayValue
	 */
	getDisplayValue() {
		if (this.isDestroyed) {
			throw Error('this.getDisplayValue is no longer valid. Property has been destroyed.');
		}
		return this.parsedValue;
	}

	/**
	 * Gets parsed value, formatted for displaying to user
	 * @return {any} displayValue
	 */
	get displayValue() {
		if (this.isDestroyed) {
			throw Error('this.displayValue is no longer valid. Property has been destroyed.');
		}
		return this.getDisplayValue();
	}

	/**
	 * Gets whether or not the Property has a mapping.
	 * Used by Entity.
	 * @return {boolean} 
	 */
	get hasMapping() {
		if (this.isDestroyed) {
			throw Error('this.hasMapping is no longer valid. Property has been destroyed.');
		}
		return !!this.mapping;
	}

	/**
	 * Gets whether or not the Property depends on any other properties 
	 * for its local "parse" function.
	 * Used by Entity.
	 * @return {boolean} 
	 */
	get hasDepends() {
		if (this.isDestroyed) {
			throw Error('this.hasDepends is no longer valid. Property has been destroyed.');
		}
		return !!this.depends;
	}

	/**
	 * Gets whether or not the Property is an "ID" property for the Entity it's assigned to
	 * @return {boolean} isIdProperty
	 */
	get isIdProperty() {
		if (this.isDestroyed) {
			throw Error('this.isIdProperty is no longer valid. Property has been destroyed.');
		}
		const entity = this.getEntity();
		if (!entity || !entity.getIdProperty) {
			return false;
		}
		return entity.getIdProperty() === this;
	}

	/**
	 * Gets whether or not the Property is a "Display" property for the Entity it's assigned to
	 * @return {boolean} isDisplayProperty
	 */
	get isDisplayProperty() {
		if (this.isDestroyed) {
			throw Error('this.isDisplayProperty is no longer valid. Property has been destroyed.');
		}
		const entity = this.getEntity();
		if (!entity || !entity.getDisplayProperty) {
			return false;
		}
		return entity.getDisplayProperty() === this;
	}

	/**
	 * Gets the model name from this property
	 * NOTE: Only for OneBuild repositories!
	 * @return {any} submitValue
	 */
	get modelName() {
		if (this.isDestroyed) {
			throw Error('this.modelName is no longer valid. Property has been destroyed.');
		}
		if (!this.name.match(/__/)) {
			throw Error('this.name is not in the correct format for modelName.');
		}

		const
			matches = this.name.match(/^([\w_]+)__/),
			modelName = matches[1];
		return modelName;
	}





	//    _____      __  __
	//   / ___/___  / /_/ /____  __________
	//   \__ \/ _ \/ __/ __/ _ \/ ___/ ___/
	//  ___/ /  __/ /_/ /_/  __/ /  (__  )
	// /____/\___/\__/\__/\___/_/  /____/

	/**
	 * Sets the parsedValue for this Property.
	 * Any mapping for this property has already taken place.
	 * i.e. The rawValue to parse *is the mapped value.*
	 * @param {any} rawValue - Value to parse
	 * @return {boolean} isChanged - Whether or not the parsedValue was changed
	 */
	setValue(rawValue) {
		if (this.isDestroyed) {
			throw Error('this.setValue is no longer valid. Property has been destroyed.');
		}
		const oldValue = this.parsedValue;
		let newValue = this.parse(rawValue);

		// Special case: ID properties that are normally integers
		// but which use strings as temporary values (e.g. "TEMP-123")
		if (this.isIdProperty && this.type === 'int' && _.isString(rawValue)) {
			// Allow this to stay as a string
			newValue = rawValue;
		}

		if (!this.allowNull && _.isNil(newValue)) {
			throw new Error('Value for ' + this.name + ' cannot be null.');
		}

		let isChanged = !_.isEqual(oldValue, newValue);

		if (isChanged) {
			this.rawValue = rawValue;
			this.parsedValue = newValue;
			this.emit('change', this, oldValue, newValue);
		}

		return isChanged;
	}

	/**
	 * Performs the actual parsing conversion, but *does not* set anything on the property.
	 * Default function. Meant to be overridden with subclass.
	 * @param {any} value - Value to parse
	 * @return {any} value - Parsed value. NOTE: for the Property base class, no parsing actually takes place!
	 */
	parse(value) {
		if (this.isDestroyed) {
			throw Error('this.parse is no longer valid. Property has been destroyed.');
		}
		if (_.isNil(value)) {
			return null;
		}
		return value;
	}





	//    __  ____  _ ___ __  _
	//   / / / / /_(_) (_) /_(_)__  _____
	//  / / / / __/ / / / __/ / _ \/ ___/
	// / /_/ / /_/ / / / /_/ /  __(__  )
	// \____/\__/_/_/_/\__/_/\___/____/

	/**
	 * Sets value of submitAsString
	 * @param {boolean} bool - New value of submitAsString
	 */
	setSubmitAsString(bool) {
		if (this.isDestroyed) {
			throw Error('this.setSubmitAsString is no longer valid. Property has been destroyed.');
		}
		this.submitAsString = bool;
	}
	
	/**
	 * Gets the Entity object
	 * @return {object} _entity - Entity
	 */
	getEntity() {
		if (this.isDestroyed) {
			throw Error('this.getEntity is no longer valid. Property has been destroyed.');
		}
		return this._entity;
	}

	/**
	 * Gets the className of this Property type.
	 * @return {string} className
	 */
	getClassName() {
		if (this.isDestroyed) {
			throw Error('this.getClassName is no longer valid. Property has been destroyed.');
		}
		return this.__proto__.constructor.className;
	}

	/**
	 * Gets the mapped name of this Property.
	 * @return {string} name
	 */
	getMapping() {
		if (this.isDestroyed) {
			throw Error('this.getMapping is no longer valid. Property has been destroyed.');
		}
		return this.mapping;
	}

	/**
	 * Destroy this object.
	 * - Removes all circular references to parent objects
	 * - Removes child objects
	 * - Removes event listeners
	 * @fires destroy
	 */
	destroy() {
		// parent objects
		this._entity = null;

		// child objects
		this._originalConfig = null;
		this.rawValue = null;
		this.parsedValue = null;

		this.emit('destroy');
		this.isDestroyed = true;
		
		// listeners
		this.removeAllListeners();
	}

	toString() {
		if (this.isDestroyed) {
			throw Error('this.toString is no longer valid. Property has been destroyed.');
		}
		return 'Property {' + this.name + '} - ' + this.getDisplayValue();
	}
};

Property.className = 'Auto';
Property.type = 'auto';
