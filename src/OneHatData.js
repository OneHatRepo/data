 /** @module OneHatData */

import EventEmitter from '@onehat/events';
import CoreRepositoryTypes from './Repository';
import {
	MODE_LOCAL_MIRROR,
	MODE_OFFLINE_QUEUE,
	MODE_REMOTE_WITH_OFFLINE,
} from './Repository/LocalFromRemote/LocalFromRemote';
import {
	default as Schema,
	CoreSchemas,
} from './Schema';
import _ from 'lodash';

/**
 * OneHatData represents a collection of Repositories.
 * It is the top-level object for this module.
 * Normally used as a global singleton within an app, 
 * using the exported 'oneHatData' constant
 * @extends EventEmitter
 */
export class OneHatData extends EventEmitter {

	constructor() {
		super(...arguments);

		/**
		 * @member {object} schemas - Object of all Schemas, keyed by name (for quick access)
		 * @private
		 */
		this.schemas = _.chain(_.map(CoreSchemas, (schema) => schema.clone())) // clone CoreSchemas so it remains untouched in case this instance of OneHatData gets destroyed
					.keyBy('name')
					.value();

		/**
		 * @member {Object} repositories - Object of all Repositories, keyed by id (for quick access)
		 * @private
		 */
		this._repositoryTypes = _.clone(CoreRepositoryTypes);

		/**
		 * @member {Object} repositories - Object of all Repositories, keyed by id (for quick access)
		 * @private
		 */
		this.repositories = {};
		
		/**
		 * @member {boolean} isDestroyed - Whether this object has been destroyed
		 * @private
		 */
		this.isDestroyed = false;

		this.registerEvents([
			'createRepository',
			'deleteRepository',
			'createSchema',
			'deleteSchema',
			'destroy',
		]);
	}

	/**
	 * Sets global config settings that will be passed into all Repositories.
	 * Chainable.
	 * @param {object} globals - Schema config object
	 * @return this
	 */
	setRepositoryGlobals = (globals) => {
		if (this.isDestroyed) {
			throw Error('this.setRepositoryGlobals is no longer valid. OneHatData has been destroyed.');
		}
		this._repositoryGlobals = globals;
		return this;
	}

	
	//    ______                __
	//   / ____/_______  ____ _/ /____
	//  / /   / ___/ _ \/ __ `/ __/ _ \
	// / /___/ /  /  __/ /_/ / /_/  __/
	// \____/_/   \___/\__,_/\__/\___/


	/**
	 * Creates one Schema and immediately returns it.
	 * @return {object} schema - The newly created schema
	 * @memberOf OneHatData
	 */
	createSchema = (config) => {
		if (this.isDestroyed) {
			throw Error('this.createSchema is no longer valid. OneHatData has been destroyed.');
		}
		return this._createSchema(config);
	}

	/**
	 * Creates one or more Schemas at once.
	 * Chainable.
	 * @param {array|object} configs - Single or array of Schema config objects
	 * @return this
	 */
	createSchemas = (configs) => {
		if (this.isDestroyed) {
			throw Error('this.createSchemas is no longer valid. OneHatData has been destroyed.');
		}
		if (!_.isArray(configs)) {
			configs = [configs];
		}
		_.each(configs, (config) => {
			this._createSchema(config)
		});
		return this;
	}

	/**
	 * Creates a new Schema.
	 * @param {object} config - Schema config object
	 * @return {object} schema - The newly created schema
	 * @private
	 */
	_createSchema = (config) => {
		if (this.isDestroyed) {
			throw Error('this._createSchema is no longer valid. OneHatData has been destroyed.');
		}
		if (config.name && this.hasSchemaWithName(config.name)) {
			throw new Error('Schema with name ' + config.name + ' already exists. Schema names must be unique.');
		}
		const schema = new Schema(config);
		this.schemas[schema.name] = schema;
		this.emit('createSchema', schema);
		return schema;
	}

	/**
	 * Creates a new Repository.
	 * @param {object} config - Repository config object
	 * @param {boolean} bound - Should this Repository be bound to its schema? Defaults to false.
	 * @return {object} repository - The newly created repository
	 */
	createRepository = async (config, bound = false) => {
		if (this.isDestroyed) {
			throw Error('this.createRepository is no longer valid. OneHatData has been destroyed.');
		}

		if (_.isNil(config)) {
			config = {};
		} else if (_.isString(config)) {
			config = {
				schema: config,
			};
		}

		const { id } = config;
		let schema = config.schema;

		// Check required args
		if (id && this.hasRepositoryWithId(id)) {
			throw new Error('Repository with id ' + repository.id + ' already exists. Repository IDs must be unique.');
		}
		if (!schema) {
			throw new Error('Schema cannot be empty. Perhaps you meant to use "KeyValues"?');
		}

		// Get actual schema, if only name provided
		if (_.isString(schema)) {
			const name = schema;
			schema = this.getSchema(name);
			if (!schema) {
				throw new Error('No schema found with name ' + name);
			}
			config.schema = schema;
		}

		// Construct overall config
		const schemaRepositoryDef = _.isString(schema.repository) ? { type: schema.repository } : schema.repository;
		config = _.merge({}, schemaRepositoryDef, this._repositoryGlobals, config);

		if (!config.type) {
			throw new Error('Repository type not set');
		}
		if (!this._repositoryTypes[config.type]) {
			throw new Error('Repository type does not exist');
		}

		// Create the Repository
		const repository = await this._createRepository(config);
		this.repositories[repository.id] = repository;

		if (bound) {
			schema.setBoundRepository(repository);
		}

		this.emit('createRepository', repository);
		return repository;
	}

	/**
	 * Helper for createRepository.
	 */
	_createRepository = async (config) => {

		// Special case: LocalFromRemoteRepository.
		if (config.type === 'lfr') {
			// We need to initiate *both the local AND the remote* sides first

			// Get general config settings shared by both (e.g. schema, isPaginated)
			const generalConfig = _.omit(config, ['type', 'local', 'remote']);

			// Convert string configs to objects
			if (_.isString(config.local)) {
				config.local = {
					type: config.local,
				};
			}
			if (_.isString(config.remote)) {
				config.remote = {
					type: config.remote,
				};
			}

			switch(config.mode) {
				case MODE_LOCAL_MIRROR:
					break;
				case MODE_OFFLINE_QUEUE:
					generalConfig.isPaginated = false;
					config.remote.type = 'command';
					break;
				case MODE_REMOTE_WITH_OFFLINE:
					break;
			}

			// Apply the general config settings to each specific one
			const localConfig = _.assign({}, generalConfig, config.local),
				remoteConfig = _.assign({}, generalConfig, config.remote);
			
			// Actually create the local and remote repositories
			config.local = await this.createRepository(localConfig);
			config.remote = await this.createRepository(remoteConfig);
		}

		const Repository = this._repositoryTypes[config.type],
			repository = new Repository(config);
		await repository.initialize();
		
		return repository;
	}

	/**
	 * Creates multiple Repositories at once.
	 * If no argument supplied, will create Repositories for all
	 * schemas previously created.
	 * Chainable.
	 * @param {array} configs - Array of Repository config objects
	 * @return this
	 * @memberOf OneHatData
	 */
	createRepositories = async (schemas, bound = false) => {
		if (this.isDestroyed) {
			throw Error('this.createRepositories is no longer valid. OneHatData has been destroyed.');
		}
		let promises = [];
		_.each(schemas, (schema) => {
			promises.push( this.createRepository({ schema, }, bound) );
		});

		await Promise.all(promises);
		return this;
	}

	/**
	 * Creates the bound Repositories for all Schemas.
	 * Chainable.
	 * @return this
	 * @memberOf OneHatData
	 */
	createBoundRepositories = async () => {
		if (this.isDestroyed) {
			throw Error('this.createBoundRepositories is no longer valid. OneHatData has been destroyed.');
		}
		return await this.createRepositories(this.schemas, true);
	}


	/**
	 * Destroys and clears the bound Repositories for all Schemas.
	 * Chainable.
	 * @return this
	 * @memberOf OneHatData
	 */
	destroyBoundRepositories = async () => {
		_.each(this.schemas, (schema) => {
			const repository = schema.getBoundRepository();
			if (repository) {
				schema.clearBoundRepository();
				delete this.repositories[repository.id];
				repository.destroy();
			}
		});
		return this;
	}

	/**
	 * Alias for registerRepositoryTypes()
	 * Chainable.
	 * @return this
	 * @memberOf OneHatData
	 */
	registerRepositoryType = (repositoryType) => {
		if (this.isDestroyed) {
			throw Error('this.registerRepositoryType is no longer valid. OneHatData has been destroyed.');
		}
		return this.registerRepositoryTypes(repositoryType);
	}

	/**
	 * Registers one or more RepositoryTypes (plugin architecture).
	 * Chainable.
	 * @return this
	 * @memberOf OneHatData
	 */
	registerRepositoryTypes = (repositoryTypes) => {
		if (this.isDestroyed) {
			throw Error('this.registerRepositoryTypes is no longer valid. OneHatData has been destroyed.');
		}
		if (!_.isArray(repositoryTypes)) {
			repositoryTypes = [repositoryTypes];
		}
		_.each(repositoryTypes, (repositoryType) => {
			this._repositoryTypes[repositoryType.type] = repositoryType;
		});
		return this;
	}



	//     ____       __       _
	//    / __ \___  / /______(_)__ _   _____
	//   / /_/ / _ \/ __/ ___/ / _ \ | / / _ \
	//  / _, _/  __/ /_/ /  / /  __/ |/ /  __/
	// /_/ |_|\___/\__/_/  /_/\___/|___/\___/

	/**
	 * Get a Schema by its name
	 * @param {string} name - Name of Schema to get
	 * @return {Schema} schema
	 */
	getSchema = (name) => {
		if (this.isDestroyed) {
			throw Error('this.getSchema is no longer valid. OneHatData has been destroyed.');
		}
		return this.schemas[name];
	}

	/**
	 * Get all Repositories
	 * @return {object} repositories
	 */
	getAllRepositories = () => {
		if (this.isDestroyed) {
			throw Error('this.getAllRepositories is no longer valid. OneHatData has been destroyed.');
		}
		return this.repositories;
	}

	/**
	 * Get the Repository bound to the Schema with the supplied name.
	 * @param {string} name - Name of Schema
	 * @return {Repository} repository
	 */
	getRepository = (name) => {
		if (this.isDestroyed) {
			throw Error('this.getRepository is no longer valid. OneHatData has been destroyed.');
		}
		const schema = this.getSchema(name);
		if (!schema) {
			return null;
		}
		return schema.getBoundRepository();
	}

	/**
	 * Get Repositories by a filter function
	 * @param {function} filter - Filter function
	 * @param {boolean} firstOnly - Whether to retrieve only the first item that passes the filter
	 * @return {Repository[]} repositories
	 */
	getRepositoriesBy = (filter, firstOnly = false) => {
		if (this.isDestroyed) {
			throw Error('this.getRepositoriesBy is no longer valid. OneHatData has been destroyed.');
		}
		if (firstOnly) {
			return _.find(this.repositories, filter);
		}
		return _.filter(this.repositories, filter);
	}

	/**
	 * Get a Repository by its id
	 * @param {string} id - ID of Repository to get
	 * @return {Repository} repository
	 */
	getRepositoryById = (id) => {
		if (this.isDestroyed) {
			throw Error('this.getRepositoryById is no longer valid. OneHatData has been destroyed.');
		}
		return this.repositories[id];
	}
	
	/**
	 * @member
	 * Get Repositories that share the given Schema
	 * @return {Repository[]} repositories
	 */
	getRepositoriesBySchema = (schema) => {
		if (this.isDestroyed) {
			throw Error('this.getRepositoriesBySchema is no longer valid. OneHatData has been destroyed.');
		}
		return this.getRepositoriesBy((repository) => {
			return repository.schema === schema;
		});
	}
	
	/**
	 * @member
	 * Get Repositories that share the given type
	 * @return {Repository[]} repositories
	 */
	getRepositoriesByType = (type) => {
		if (this.isDestroyed) {
			throw Error('this.getRepositoriesByType is no longer valid. OneHatData has been destroyed.');
		}
		return this.getRepositoriesBy((repository) => {
			return repository.getType() === type;
		});
	}

	/**
	 * Checks whether a Schema with the supplied name exists
	 * @param {string} name - Name to check
	 * @return {boolean} hasSchema
	 */
	hasSchemaWithName = (name) => {
		if (this.isDestroyed) {
			throw Error('this.hasSchemaWithName is no longer valid. OneHatData has been destroyed.');
		}
		return this.schemas && this.schemas.hasOwnProperty(name);
	}

	/**
	 * Checks whether a Repository with the supplied ID exists
	 * @param {string} id - ID to check
	 * @return {boolean} hasRepository
	 */
	hasRepositoryWithId = (id) => {
		if (this.isDestroyed) {
			throw Error('this.hasRepositoryWithId is no longer valid. OneHatData has been destroyed.');
		}
		return this.repositories && this.repositories.hasOwnProperty(id);
	}



	//     ____       __     __
	//    / __ \___  / /__  / /____
	//   / / / / _ \/ / _ \/ __/ _ \
	//  / /_/ /  __/ /  __/ /_/  __/
	// /_____/\___/_/\___/\__/\___/

	/**
	 * Deletes an existing Schema.
	 * Chainable.
	 * @param {string} name - Name of Schema to delete
	 * @return this
	 * @memberOf OneHatData
	 */
	deleteSchema = (name) => {
		if (this.isDestroyed) {
			throw Error('this.deleteSchema is no longer valid. OneHatData has been destroyed.');
		}
		const schema = this.getSchema(name);
		delete this.schemas[name];
		this.emit('deleteSchema', schema);
		return this;
	}

	/**
	 * Deletes an existing Repository.
	 * Chainable.
	 * @param {object} config - Repository config object
	 * @return this
	 * @memberOf OneHatData
	 */
	deleteRepository = (id) => {
		if (this.isDestroyed) {
			throw Error('this.deleteRepository is no longer valid. OneHatData has been destroyed.');
		}
		const repository = this.getRepositoryById(id);
		if (!repository) {
			return false;
		}
		repository.destroy();
		delete this.repositories[id];
		this.emit('deleteRepository', repository);
		return this;
	}

	/**
	 * Destroy this object.
	 * - Removes child objects
	 * - Removes event listeners
	 * @member
	 * @fires destroy
	 */
	destroy = () => {
		// child objects
		_.each(this.schemas, (schema) => {
			schema.destroy();
		});
		this.schemas = null;
		_.each(this.repositories, (repository) => {
			repository.destroy();
		});
		this.repositories = null;

		this.emit('destroy');
		this.isDestroyed = true;
		
		// listeners
		this.removeAllListeners();
	}

};

 // Create and export a singleton
const oneHatData = new OneHatData();
export default oneHatData;
