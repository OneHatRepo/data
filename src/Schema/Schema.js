/** @module Schema */

import EventEmitter from '@onehat/events';
import _ from 'lodash';

/**
 * Class represents the Schema definition for Model and Source
 * This is basically just a big config object, used to instantiate an Entity, and Repository.
 * Usage:
 * - const schema = new Schema({
 * 		name: 'Users',
 * 		model: {},
 * 		entity: {},
 * 		repository: {},
 * });
 * 
 * To define a virtual property:
 * 
 * 	{ name: 'virtual', depends: 'bar', parse: function(rawValue) { // NOTE: Use standard function notation, so this === the Property object
 * 		// const originalData = this._entity._originalData, // This gives access to all original data that was supplied to Entity
 * 		// 	parsedData = this._entity.data; // This gives access to all other parsed Properties
 * 		return 'This property is ' + this.name + ' and the value of bar is ' + this._entity.bar;
 * 	} },
 * @extends EventEmitter
 */
export default class Schema extends EventEmitter {

	/**
	 * @constructor
	 * @param {object} config - Settings for this schema. Each setting overrides its default value
	 */
	constructor(config = {}) {
		super(...arguments);

		if (!config.name) {
			throw new Error('name cannot be empty');
		}

		const defaults = {
			/**
			 * @member {string} name - Could be anything, but OneHat's convention is to use
			 * the model name pluralized and camel-cased (e.g. 'Users')
			 */
			name: null,

			/**
			 * @member {object} model - Config for Model
			 */
			model: {

				/**
				 * @member {string} idProperty - name of id Property (e.g. 'users__id')
				 */
				idProperty: null,

				/**
				 * @member {string} displayProperty - name of display Property (e.g. 'users__username')
				 */
				displayProperty: null,

				/**
				 * @member {array} properties - Array of Property definition objects
				 */
				properties: [],

				/**
				 * @member {object[]} sorters - Array of sorter definitions.
				 * Each definition is an object with two or three keys:
				 * - *name* - Name of Property to sort by.
				 * - *direction* - 'ASC'|'DESC'
				 * - *fn* (optional) - The sort function to use. Can be either a name like 'nasort', 'default', or a sorting fn
				 */
				sorters: [],

				/**
				 * @member {object} validators - A validator schema. Could use Joi (https://joi.dev), Yup (https://github.com/jquense/yup), or another comparable library
				 */
				validator: null,

				/**
				 * @member {object} associations - List of associated Models
				 */
				associations: {

					/**
					 * @member {array} hasOne - Array of names of associated Models
					 */
					hasOne: [],

					/**
					 * @member {array} hasMany - Array of names of associated Models
					 */
					hasMany: [],

					/**
					 * @member {array} belongsTo - Array of names of associated Models
					 */
					belongsTo: [],

					/**
					 * @member {array} belongsToMany - Array of names of associated Models
					 */
					belongsToMany: [],
				},
			},
			
			entity: {
				methods: {}, // NOTE: Methods must be defined as "function() {}", not as "() => {}" so "this" will be assigned correctly
				statics: {},
			},

			/**
			 * @member {object|string} repository - Config for Repository
			 */
			repository: 'memory',

		};

		this._originalConfig = _.merge({}, defaults, config);
		_.merge(this, this._originalConfig);

		/**
		 * @member {object} _boundRepository - The general-purpose Repository bound to this schema
		 * @private
		 */
		this._boundRepository = null;

		/**
		 * @member {boolean} isDestroyed - Whether this object has been destroyed
		 * @private
		 */
		this.isDestroyed = false;

		this.normalizeRepositoryConfig();
		
		this.registerEvents([
			'destroy',
		]);
	}

	/**
	 * Normalizes the repository configuration from single string to object.
	 * @memberOf Schema
	 */
	normalizeRepositoryConfig = () => {
		if (_.isString(this.repository)) {
			this.repository = { type: this.repository };
		}
	}

	/**
	 * Sets the Repository bound to this Schema.
	 * @param {object} _boundRepository - The bound Repository
	 * @memberOf Schema
	 */
	setBoundRepository = (repository) => {
		if (this.isDestroyed) {
			throw Error('this.setBoundRepository is no longer valid. Schema has been destroyed.');
		}
		if (!_.isNil(this._boundRepository)) {
			throw new Error('Schema "' + this.name + '" is already bound to a repository.');
		}
		this._boundRepository = repository;
	}

	/**
	 * Gets the Repository bound to this Schema.
	 * @return {object} _boundRepository - The bound Repository
	 * @memberOf Schema
	 */
	getBoundRepository = () => {
		if (this.isDestroyed) {
			throw Error('this.getBoundRepository is no longer valid. Schema has been destroyed.');
		}
		return this._boundRepository;
	}

	/**
	 * Clears the Repository bound to this Schema.
	 * @return {object} _boundRepository - The bound Repository
	 * @memberOf Schema
	 */
	clearBoundRepository = () => {
		if (this.isDestroyed) {
			throw Error('this.clearBoundRepository is no longer valid. Schema has been destroyed.');
		}
		this._boundRepository = null;
	}

	/**
	 * Gets a single Property definition by name,
	 * @param {string} propertyName - Name of the property definition to retrieve
	 * @return {object} propertyDefinition - The property definition
	 */
	getPropertyDefinition = (propertyName) => {
		if (this.isDestroyed) {
			throw Error('this.getPropertyDefinition is no longer valid. Schema has been destroyed.');
		}
		const propertyDefinition = _.find(this.model.properties, (propertyDefinition) => {
			return propertyDefinition.name === propertyName;
		});
		if (!propertyDefinition) {
			throw new Error('Property definition ' + propertyName + ' not found.');
		}
		return propertyDefinition;
	}

	/**
	 * Clones this Schema.
	 * @return {object} Schema - The clone
	 * @memberOf Schema
	 */
	clone = () => {
		return new Schema(this._originalConfig);
	}

	/**
	 * Destroy this object.
	 * - Removes child objects
	 */
	destroy = () => {
		// child objects
		this._boundRepository = null;
		this._originalConfig = null;

		this.emit('destroy');
		this.isDestroyed = true;
	}

};