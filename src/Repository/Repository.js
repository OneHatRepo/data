/** @module Repository */

import EventEmitter from '@onehat/events';
import Entity from '../Entity/Entity.js'
import PropertyTypes from '../Property/index.js';
import {
	v4 as uuid,
} from 'uuid';
import moment from 'moment';
import { waitUntil } from 'async-wait-until';
import hash from 'object-hash';
import _ from 'lodash';

/**
 * Class represents a unique collection of data, with a Schema, and a storage medium.
 * The Repository holds a current page of Entities (this.entities), which may or may not be the
 * complete set of all Entities in the storage medium. The storage medium is defined by the
 * subclasses of Repository (e.g. MemoryRepository, AjaxRepository, etc).
 * @extends EventEmitter
 */
export default class Repository extends EventEmitter {

	/**
	 * @constructor
	 * @param {object} config - Config object
	 * - id {string} - Optional. If supplied, must be unique
	 * - name {string} - Optional. Defaults to schema.name
	 * - schema - Schema object
	 */
	constructor(config = {}, oneHatData = null) {
		super(...arguments);
		
		const { schema } = config;

		if (!schema || !schema.model) {
			throw Error('Schema cannot be empty'); // don't use throwError() because Repository is not yet successfully constructed
		}

		const defaults = {
			/**
			 * @member {string} id - Must be unique, if supplied. Defaults to UUID
			 */
			id: uuid(),

			/**
			 * @member {string} name - Name of this repository. Defaults to Schema.name
			 */
			name: schema.name,

			/**
			 * @member {boolean} isUnique - Whether this repository is classified as 'unique'
			 */
			isUnique: false,

			/**
			 * @member {boolean} isAutoLoad - Whether to immediately load this repository's data on instantiation
			 */
			isAutoLoad: false,

			/**
			 * @member {boolean} isAutoSave - Whether to automatically save entity changes to permanent storage
			 */
			isAutoSave: false,

			/**
			 * @member {boolean} isAutoSort - Whether to automatically sort entities in permanent storage
			 */
			isAutoSort: true,

			/**
			 * @member {boolean} isLocal - Whether this Repository saves its data to local permanent storage
			 * ("permanent" being a relative term)
			 * @readonly
			 */
			isLocal: false,

			/**
			 * @member {boolean} isRemote - Whether this Repository saves its data to remote permanent storage
			 * @readonly
			 */
			isRemote: false,

			/**
			 * @member {boolean} isRemoteFilter - Whether this Repository filters data remotely
			 * @readonly
			 */
			isRemoteFilter: false,

			/**
			 * @member {boolean} isRemoteSort - Whether this Repository sorts data remotely
			 * @readonly
			 */
			isRemoteSort: false,

			/**
			 * @member {boolean} isRemotePhantomMode - Whether this Repository uses the "alternate" CRUD mode.
			 * In this CRUD mode, records are *immediately* saved to server when added to Repository,
			 * but still marked as "phantom" until the their first "edit" operation takes place.
			 * 
			 * This mode overrides repository.isAutoSave, entity.isPersisted, && entity.isDelayedSave.
			 * 
			 * @readonly
			 */
			isRemotePhantomMode: false,

			/**
			 * @member {boolean} isPaginated - Whether this Repository is paginated
			 */
			isPaginated: false,

			/**
			 * @member {bool} isShowingMore - Whether this repository is in "show more" mode
			 */
			isShowingMore: false,

			/**
			 * @member {string} hash - A hash of this.entities, so we can detect changes
			 */
			hash: null,

			/**
			 * @member {number} pageSize - Max number of entities per page
			 * Example: For "Showing 21-30 of 45" This would be 10
			 */
			pageSize: 10,

			sorters: schema.model.sorters || [],

			/**
			 * @member {string} batchOrder - Comma-separated ordering of add, edit, and delete batch operations
			 */
			batchOrder: 'add,edit,delete',

			/**
			 * @member {boolean} batchAsSynchronous - Whether batch operations should be conducted synchronously (waiting for each operation to complete before beginning the next)
			 */
			batchAsSynchronous: false,

			/**
			 * @member {boolean} combineBatch - Whether this Repository should combine batch operations
			 */
			combineBatch: false,

			/**
			 * @member {boolean} canAdd - Whether this Repository allows adding entities
			 */
			canAdd: true,

			/**
			 * @member {boolean} canEdit - Whether this Repository allows editing entities
			 */
			canEdit: true,

			/**
			 * @member {boolean} canDelete - Whether this Repository allows deleting entities
			 */
			canDelete: true,

			/**
			 * @member {boolean} debugMode - Whether this Repository should output debug messages
			 */
			debugMode: false,
		};

		_.merge(this, defaults, config);
		this.originalConfig = config;
		
		//    _____ __        __
		//   / ___// /_____ _/ /____
		//   \__ \/ __/ __ `/ __/ _ \
		//  ___/ / /_/ /_/ / /_/  __/
		// /____/\__/\__,_/\__/\___/

		/**
		 * This is where the current page of entities are stored. 
		 * All add/edit/delete operations are performed on this array of items.
		 * Calling save() persists the changes to the storage medium.
		 * @member {array} entities - Entities on current page
		 * @private
		 */
		this.entities = [];

		/**
		 * @member {array} filters - Array of filters
		 */
		this.filters = [];

		/**
		 * @member {number} page - State: Current page number in pagination
		 */
		this.page = 1;

		/**
		 * Getter for 
		 * @member {number} pageTotal - State: Total number of entities on the current page
		 * Example: "Showing 21-25 of 25" This would be 5
		 */
		this.pageTotal = 0;

		/**
		 * @member {number} pageStart - Index (based on total) of the first item on the current page.
		 * Example: "Showing 21-30 of 45" This would be 21
		 */
		this.pageStart = 0;

		/**
		 * @member {number} pageEnd - Index (based on total) of the last item on the current page
		 * Example: "Showing 21-30 of 45" This would be 30
		 */
		this.pageEnd = 0;

		/**
		 * @member {number} totalPages - Total number of pages based on this.total and this.pageSize
		 */
		this.totalPages = 1;

		/**
		 * @member {number} total - Total number of entities in remote storage that pass filters
		 */
		this.total = 0;

		/**
		 * @member {boolean} isFiltered - State: whether or not any filters are currently applied to entities
		 */
		this.isFiltered = false;
		
		/**
		 * @member {boolean} isInitialized - State: whether or not this repository has been completely initialized
		 */
		this.isInitialized = false;

		/**
		 * @member {boolean} isTree - Whether this Repository contains TreeNodes
		 * @readonly
		 */
		this.isTree = schema.model.isTree || false;

		/**
		 * @member {boolean} moveSubtreeUp - Whether to move the subtree up on the next delete operation (trees only)
		 */
		this.moveSubtreeUp = false;

		/**
		 * @member {boolean} isLoaded - State: whether or not entities have been loaded at least once
		 */
		this.isLoaded = false;

		/**
		 * @member {boolean} isLoading - State: whether or not entities are currently being loaded
		 */
		this.isLoading = false;

		/**
		 * @member {string} lastLoaded - Last time this repository was loaded
		 */
		this.lastLoaded = null;

		/**
		 * @member {boolean} areRootNodesLoaded - State: whether or not root nodes have been loaded at least once
		 */
		this.areRootNodesLoaded = false;

		/**
		 * @member {boolean} isSaving - State: whether or not entities are currently being saved
		 */
		this.isSaving = false;

		/**
		 * @member {boolean} isSorted - State: whether or not any sorting is currently applied to entities
		 */
		this.isSorted = false;

		/**
		 * @member {boolean} allowsMultiSort - Whether to allow >1 sorter
		 */
		this.allowsMultiSort = true;
		
		/**
		 * @member {boolean} isDestroyed - Whether this object has been destroyed
		 */
		this.isDestroyed = false;

		/**
		 * @member {boolean} oneHatData - The global @onehat/data object
		 */
		this.oneHatData = oneHatData;

		this.registerEvents([
			'add',
			'beforeSave',
			'beforeLoad',
			'changeData',
			'changeFilters',
			'changePage',
			'changePageSize',
			'changeSorters',
			'delete',
			'destroy',
			'error',
			'initialize',
			'load',
			'reloadEntity',
			'save',
		]);

		// create error listener to block Node from throwing the Error. https://nodejs.org/dist/v11.13.0/docs/api/events.html#events_emitter_emit_eventname_args:~:text=Error%20events-,%23,-When%20an%20error
		this.on('error', () => {});
	}

	/**
	 * Decorator for parent emit() method
	 * so we can rehash on changeData events
	 */
	emit(name) { // NOTE: Purposefully do not use an arrow-function, so we have access to arguments
		
		if (name === 'changeData') {
			this.rehash();
		}

		return super.emit(...arguments);
	}

	/**
	 * Initializes the Repository.
	 * - Applies default sorters
	 * - Autoloads data, if needed
	 * This is async because we may need to wait for loading and sorting.
	 */
	async initialize() {
		// Create default sorters if none supplied
		if (this.isAutoSort && !this.sorters.length) {
			this.sorters = this.getDefaultSorters();
		}
		
		// Assign event handlers
		this.on('entity_change', async (entity) => { // Entity changed its value
			if (this.isAutoSave && !this.isRemotePhantomMode) {
				return await this.save(entity);
			}
		});

		// Auto load & sort
		if (this.isAutoLoad && !this.isTree) {
			await this.load();
		}
		if (!this.isSorted && this.isAutoSort && !this.isRemoteSort && !this.isTree) { // load may have sorted, in which case this will be skipped.
			await this.sort();
		}

		this._createMethods();
		this._createStatics();

		const init = this.schema.repository.init || this.originalConfig.init; // The latter is mainly for lfr repositories
		if (init) {
			await init.call(this);
		}
		this.rehash();

		this.isInitialized = true;
		this.emit('initialize');
	}

	/**
	 * Creates the methods for this Repository, based on Schema.
	 * @private
	 */
	_createMethods() {
		if (this.isDestroyed) {
			this.throwError('this._createMethods is no longer valid. Repository has been destroyed.');
			return;
		}
		const methodDefinitions = this.schema.repository.methods || this.originalConfig.methods; // The latter is mainly for lfr repositories
		if (!_.isEmpty(methodDefinitions)) {
			const oThis = this;
			_.each(methodDefinitions, (method, name) => {
				oThis[name] = method; // NOTE: Methods must be defined in schema as "function() {}", not as "() => {}" so scope of "this" will be correct
			});
		}
	}

	/**
	 * Creates the static properties for this Repository, based on Schema.
	 * @private
	 */
	_createStatics() {
		if (this.isDestroyed) {
			this.throwError('this._createStatics is no longer valid. Repository has been destroyed.');
			return;
		}
		const staticsDefinitions = this.schema.repository.statics || this.originalConfig.statics; // The latter is mainly for lfr repositories
		if (!_.isEmpty(staticsDefinitions)) {
			const oThis = this;
			_.each(staticsDefinitions, (value, key) => {
				oThis[key] = value;
			});
		}
	}


	//     __                    __
	//    / /   ____  ____ _____/ /
	//   / /   / __ \/ __ `/ __  /
	//  / /___/ /_/ / /_/ / /_/ /
	// /_____/\____/\__,_/\__,_/

	/**
	 * Tells storage medium to load data
	 * @abstract
	 */
	async load() {
		this.throwError('load must be implemented by Repository subclass');
		return;
	}

	/**
	 * Marks this repository as loading
	 */
	markLoading(bool = true) {
		this.isLoading = bool;
	}

	/**
	 * Async function that resolves when !isLoading
	 */
	async waitUntilDoneLoading(timeout = 10000) {
		if (this.isDestroyed) {
			this.throwError('this.waitUntilDoneLoading is no longer valid. Repository has been destroyed.');
			return;
		}
		
		await waitUntil(() => !this.isLoading, { timeout });
	}

	/**
	 * Marks this repository as unloaded
	 */
	markUnloaded() {
		this.markLoading(false);
		this.isLoaded = false;
		this.lastLoaded = null;
	}

	/**
	 * Marks this repository as loaded
	 */
	markLoaded() {
		this.markLoading(false);
		this.isLoaded = true;
		this.lastLoaded = moment(new Date()).format('YYYY-MM-DD HH:mm:ss.SSSS');
	}

	/**
	 * Reload data from storage medium, using previous settings.
	 * Subclasses may override this to provide additional 
	 * or differing functionality.
	 */
	reload() {
		return this.load();
	}

	/**
	 * Tells storage medium to reload just this one entity
	 * @abstract
	 */
	async reloadEntity(entity) {
		this.throwError('reloadEntity must be implemented by Repository subclass');
		return;
	}

	/**
	 * Sets the isAutoSave setting of this Repository
	 * @param {boolean} isAutoSave
	 */
	setAutoSave(isAutoSave) {
		if (this.isDestroyed) {
			this.throwError('this.setAutoSave is no longer valid. Repository has been destroyed.');
			return;
		}
		this.isAutoSave = isAutoSave
	}

	/**
	 * Sets the isAutoLoad setting of this Repository
	 * @param {boolean} isAutoLoad
	 */
	setAutoLoad(isAutoLoad) {
		if (this.isDestroyed) {
			this.throwError('this.setAutoLoad is no longer valid. Repository has been destroyed.');
			return;
		}
		this.isAutoLoad = isAutoLoad
	}


	//    _____            __
	//   / ___/____  _____/ /_
	//   \__ \/ __ \/ ___/ __/
	//  ___/ / /_/ / /  / /_
	// /____/\____/_/   \__/

	/**
	 * @member {boolean} hasSorters - Whether or not any sorters are applied
	 */
	get hasSorters() {
		if (this.isDestroyed) {
			this.throwError('this.hasSorters is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.sorters.length > 0;
	}

	/**
	 * Clear all sorting from this Repository.
	 */
	clearSort() {
		if (this.isDestroyed) {
			this.throwError('this.clearSort is no longer valid. Repository has been destroyed.');
			return;
		}
		this.setSorters([])
	}

	/**
	 * Sets the sorting applied to entities.
	 * Chainable function.
	 * 
	 * Usage:
	 * - repository.sort(); // Reverts back to default sort. To actually *clear* all sorters, use this.clearSort()
	 * - repository.sort('last_name'); // sort by one property, ASC
	 * - repository.sort('last_name', 'ASC'); // sort by one property
	 * - repository.sort('last_name', 'ASC', 'natsort'); // sort by one property with specific function
	 * - repository.sort('last_name', 'ASC', (a, b) => { ... })); // sort by one property with custom function
	 * - repository.sort((a, b) => { ... }); // sort by custom function
	 * - repository.sort({ // sort by one property, object notation
	 * 		name: 'last_name',
	 * 		direction: 'ASC',
	 * 	});
	 * - repository.sort([ // sort by multiple properties
	 * 		{
	 * 			name: 'last_name',
	 * 			direction: 'ASC',
	 * 			fn: 'natsort',
	 * 		},
	 * 		{
	 * 			name: 'first_name',
	 * 			direction: 'ASC',
	 * 		},
	 * ]);
	 * - sort().filter() // combine with filter
	 * 
	 * @return this
	 */
	sort(arg1 = null, arg2 = 'ASC', arg3 = null) {
		if (this.isDestroyed) {
			this.throwError('this.sort is no longer valid. Repository has been destroyed.');
			return;
		}
		// Assemble sorting definition objects
		let sorters = [];
		if (_.isNil(arg1)) {
			sorters = this.getDefaultSorters();
		} else if (_.isString(arg1)) {
			sorters = [{
				name: arg1,
				direction: arg2,
				fn: arg3,
			}];
		} else if (_.isPlainObject(arg1)) {
			sorters = [arg1];
		} else if (_.isArray(arg1)) {
			sorters = arg1;
		} else if (_.isFunction(arg1)) {
			sorters = [arg1];
		}

		this.setSorters(sorters);

		return this;
	}

	/**
	 * Gets default sorters. Either what was specified on schema, or sorty by displayProperty ASC.
	 * @return {array} sorters
	 */
	getDefaultSorters() {
		if (this.isDestroyed) {
			this.throwError('this.getDefaultSorters is no longer valid. Repository has been destroyed.');
			return;
		}
		let sorters = [];
		if (_.size(this.schema.model.sorters) > 0) {
			sorters = this.schema.model.sorters
		} else if (!_.isNil(this.schema.model.sortProperty)) {
			sorters = [{
				name: this.schema.model.sortProperty,
				direction: this.schema.model.sortDir,
				fn: 'default',
			}];
		} else if (!_.isNil(this.schema.model.displayProperty)) {
			sorters = [{
				name: this.schema.model.displayProperty,
				direction: this.schema.model.sortDir,
				fn: 'default',
			}];
		}
		return sorters;
	}

	/**
	 * Sets the sorters directly
	 * @fires changeSorters
	 */
	setSorters(sorters) {
		if (this.isDestroyed) {
			this.throwError('this.setSorters is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.allowsMultiSort && sorters.length > 1) {
			this.throwError('Cannot have more than one sorter at a time.');
			return;
		}

		let isChanged = false;
		if (!_.isEqual(this.sorters, sorters)) {
			isChanged = true;

			// Check to make sure specified properties are sortable
			const oThis = this;
			_.each(sorters, (sorter) => {
				if (_.isFunction(sorter)) {
					return; // skip
				}
				const propertyDefinition = _.find(oThis.schema.model.properties, (property) => property.name === sorter.name);
				if (!propertyDefinition) {
					oThis.throwError('Sorting property does not exist.');
					return;
				}
				const propertyType = propertyDefinition.type;
				if (propertyType && PropertyTypes[propertyType]) {
					const propertyInstance = new PropertyTypes[propertyType]();
					if (!propertyInstance.isSortable) {
						oThis.throwError('Sorting property type is not sortable.');
						return;
					}
				}
			});

			this.sorters = sorters;
			if (this._onChangeSorters) {
				return this._onChangeSorters();
			}
			this.emit('changeSorters');
		}
		return isChanged;
	}


	//     _______ ____
	//    / ____(_) / /____  _____
	//   / /_  / / / __/ _ \/ ___/
	//  / __/ / / / /_/  __/ /
	// /_/   /_/_/\__/\___/_/

	/**
	 * @member {boolean} hasFilters - Whether or not any filters are applied
	 */
	get hasFilters() {
		return this.filters.length > 0;
	}

	hasFilter(name) {
		if (!this.hasFilters) {
			return false;
		}
		const found = _.find(this.filters, (filter) => filter.name === name);
		return !!found;
	}

	hasFilterValue(name, value) {
		if (!this.hasFilters) {
			return false;
		}
		const found = _.find(this.filters, (filter) => {
			return filter.name === name;
		});
		if (!found) {
			return false;
		}
		if (_.isArray(value)) {
			// Sort the array elements first, so isEqual doesn't fail simply because of ordering of elements
			return _.isEqual(_.sortBy(value), _.sortBy(found.value));
		}
		return _.isEqual(value, found.value);
	}

	/**
	 * Sets one or more filters to the repository.
	 * 
	 * NOTE: By default, this function REPLACES the existing filters with new ones.
	 * If you want to ADD to the existing filters, set the third argument to false.
	 * 
	 * Usage:
	 * - repository.filter(); // Special case: clear all filtering
	 * - repository.filter('first_name', 'Scott'); // Set a single filter
	 * - repository.filter({ // Set a single filter, object notation
	 * 		name: 'first_name',
	 * 		value: 'Scott',
	 * 	});
	 * - repository.filter([ // Set multiple filters
	 * 		{
	 * 			name: 'last_name',
	 * 			value: 'Spuler',
	 * 		},
	 * 		{
	 * 			name: 'first_name',
	 * 			value: 'Scott',
	 * 		},
	 * 	]);
	 * 
	 * @return this
	 */
	filter(arg1 = null, arg2 = null, clearFirst = true) {
		if (this.isDestroyed) {
			this.throwError('this.filter is no longer valid. Repository has been destroyed.');
			return;
		}

		if (_.isNil(arg1)) {
			return this.clearFilters();
		}

		// Assemble filtering definition objects
		let newFilters = [];
		if (_.isString(arg1)) {
			newFilters = [{
				name: arg1,
				value: arg2,
			}];
		} else if (_.isArray(arg1)) {
			newFilters = arg1;
		} else if (_.isPlainObject(arg1)) {
			if (arg1.name) {
				// like { name: 'first_name', value: 'Steve' }
				newFilters = [arg1];
			} else {
				// like { first_name: 'Steve' }
				const name = Object.keys(arg1)[0];
				newFilters = [{
					name,
					value: arg1[name],
				}];
			}
		} else if (_.isFunction(arg1)) {
			newFilters = [arg1];
		}

		// Set up new filters
		let filters = clearFirst ? 
						[] : // Clear existing filters
						_.clone(this.filters); // so we can detect changes in _setFilters
		
		_.each(newFilters, (newFilter) => {

			let deleteExisting = false,
				addNew = true;

			if (!_.isFunction(newFilter) && _.isNil(newFilter?.fn)) {
				if (_.isNil(newFilter?.value)) {
					deleteExisting = true;
					addNew = false;
				} else
				if (_.find(filters, (filter) => filter?.name === newFilter?.name)) {
					// Filter already exists
					deleteExisting = true;
				}
			}

			if (deleteExisting) {
				filters = _.filter(filters, (filter) => filter?.name !== newFilter?.name)
			}
			if (addNew) {
				filters.push(newFilter);
			}
		});

		return this._setFilters(filters);
	}

	/**
	 * Sets one or more filters.
	 * This is a convenience function; a special case alias of filter().
	 * Useful for allowing object notation of filters.
	 * 
	 * Usage:
	 * - repository.setFilters({
	 * 		first_name: 'Scott',
	 * 		last_name: 'Spuler',
	 * 	});
	 * 
	 * @return this
	 */
	setFilters(filters, clearFirst = true) {
		const parsed = _.map(filters, (value, name) => {
			return {
				name,
				value,
			};
		});
		return this.filter(parsed, null, clearFirst);
	}

	/**
	 * Clears filters.
	 * @param {array|string} filtersToClear - Optional string or array of filter names to clear. Leave blank to clear ALL filters.
	 * @fires changeFilters
	 * 
	 * Usage:
	 * - repository.clearFilters(); // Clear all filtering
	 * - repository.clearFilters('first_name'); // Clear a single filter
	 * - repository.clearFilters(['first_name', 'last_name']); // Clear multiple filters
	 */
	clearFilters(filtersToClear) {
		let filters = [];
		if (filtersToClear) {
			if (_.isString(filtersToClear)) {
				filtersToClear = [filtersToClear];
			}
			filters = _.filter(this.filters, (filter) => {
				return filtersToClear.indexOf(filter.name) === -1;
			});
		}
		return this._setFilters(filters);
	}

	/**
	 * Sets the filters directly
	 * @private
	 * @fires changeFilters
	 */
	_setFilters(filters) {
		if (this.isDestroyed) {
			this.throwError('this._setFilters is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!_.isEqual(this.filters, filters)) {
			this.filters = filters;
			this.resetPagination();
			let ret;
			if (this._onChangeFilters) {
				ret = this._onChangeFilters();
			}
			this.emit('changeFilters');
			return ret;
		}
		return false; // no filters changed
	}




	//     ____              _             __
	//    / __ \____ _____ _(_)___  ____ _/ /____
	//   / /_/ / __ `/ __ `/ / __ \/ __ `/ __/ _ \
	//  / ____/ /_/ / /_/ / / / / / /_/ / /_/  __/
	// /_/    \__,_/\__, /_/_/ /_/\__,_/\__/\___/
	//             /____/

	/**
	 * Resets the pagination to page one
	 * @fires changePageSize
	 */
	resetPagination() {
		if (this.isDestroyed) {
			this.throwError('this.resetPagination is no longer valid. Repository has been destroyed.');
			return;
		}
		this.setPage(1);
	}

	/**
	 * Sets isPaginated
	 */
	setIsPaginated(bool) {
		if (this.isDestroyed) {
			this.throwError('this.setIsPaginated is no longer valid. Repository has been destroyed.');
			return;
		}
		this.isPaginated = bool;

		if (this._onChangePagination) {
			return this._onChangePagination();
		}
		return true;
	}

	/**
	 * Sets the pageSize
	 * @fires changePage
	 * @fires changePageSize
	 */
	setPageSize(pageSize) {
		if (this.isDestroyed) {
			this.throwError('this.setPageSize is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isPaginated) {
			return false;
		}
		
		pageSize = parseInt(pageSize, 10);
		if (_.isEqual(this.pageSize, pageSize)) {
			return false;
		}

		// Reset to page 1 (don't use setPage(), so we can skip _onChangePagination, which we'll do later)
		this.page = 1;
		this.emit('changePage');

		this.pageSize = pageSize;
		this.emit('changePageSize', pageSize);
		if (this._onChangePagination) {
			return this._onChangePagination();
		}
		return true;
	}

	/**
	 * Advances to a specific page of entities
	 * @return {boolean} success
	 * @fires changePage
	 */
	setPage(page) {
		if (this.isDestroyed) {
			this.throwError('this.setPage is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isPaginated) {
			return false;
		}
		if (_.isEqual(this.page, page)) {
			return false;
		}
		if (page < 1) {
			return false;
		}
		if (page > this.totalPages) {
			return false;
		}

		this.page = page;
		this.emit('changePage');
		if (this._onChangePagination) {
			return this._onChangePagination();
		}
		return true;
	}

	/**
	 * Advances to the previous page of entities
	 * @return {boolean} success
	 */
	prevPage() {
		return this.setPage(this.page -1);
	}

	/**
	 * Advances to the next page of entities
	 * @return {boolean} success
	 */
	nextPage() {
		return this.setPage(this.page +1);
	}

	/**
	 * Sets current pagination vars.
	 * NOTE: this.total, this.page, and this.pageSize must be managed elsewhere.
	 * This function takes care of calculating and setting the rest.
	 * @private
	 */
	_setPaginationVars() {
		if (this.isDestroyed) {
			this.throwError('this._setPaginationVars is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isPaginated) {
			this.totalPages = 1;
			this.pageStart = 1;
			this.pageEnd = this.total;
			this.pageTotal = this.total;
		}
		const paginationVars = Repository._calculatePaginationVars(this.total, this.page, this.pageSize);
		this.totalPages = paginationVars.totalPages;
		this.pageStart = paginationVars.pageStart;
		this.pageEnd = paginationVars.pageEnd;
		this.pageTotal = paginationVars.pageTotal;
	}

	/**
	 * Helper for _setPaginationVars.
	 * Utility function to calculate all pagination variables.
	 * @param {number} total - Total number of items
	 * @param {number} page - Current page number
	 * @param {number} pageSize - Max items per page
	 * @return {object} pageVars - Object representing all returned page variables
	 * - page {number} - Current page number
	 * - pageSize {number} - Max items per page
	 * - total {number} - Total number of items
	 * - totalPages {number} - Total number of pages
	 * - pageStart {number} - Index (within total, and 1-based) of first item on current page
	 * - pageEnd {number} - Index (within total, and 1-based) of last item on current page
	 * - pageTotal {number} - Total number of items on current page
	 * @private
	 * @static
	 */
	static _calculatePaginationVars(total, page, pageSize) {

		// Special case: empty pages
		if (total < 1) {
			return {
				page,
				pageSize,
				total,
				totalPages: 1,
				pageStart: 0,
				pageEnd: 0,
				pageTotal: 0,
			};
		}

		const totalPages = Math.ceil(total / pageSize),
			pageStart = ((page -1) * pageSize) + 1;
		
		let remainder,
			pageEnd,
			pageTotal;

		if (page === 1 && totalPages === 1) {
			pageTotal = total;
		} else if (page < totalPages) {
			pageTotal = pageSize;
		} else {
			// last page
			remainder = total % pageSize;
			pageTotal = remainder || pageSize;
		}

		pageEnd = pageStart + pageTotal -1;
		
		return {
			page,
			pageSize,
			total,
			totalPages,
			pageStart,
			pageEnd,
			pageTotal,
		};
	}



	//    __________  __  ______
	//   / ____/ __ \/ / / / __ \
	//  / /   / /_/ / / / / / / /
	// / /___/ _, _/ /_/ / /_/ /
	// \____/_/ |_|\____/_____/

	/**
	 * Creates a single new Entity in storage medium.
	 * @param {object} data - Either raw data object or Entity. If raw data, keys are Property names, Values are Property values.
	 * @param {boolean} isPersisted - Whether the new entity should be marked as already being persisted in storage medium.
	 * @param {boolean} isDelayedSave - Should the repository skip autosave when immediately adding the record?
	 * @return {object} entity - new Entity object
	 * @fires add
	 */
	async add(data, isPersisted = false, isDelayedSave = false) {
		if (this.isDestroyed) {
			this.throwError('this.add is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.canAdd) {
			this.throwError('Adding has been disabled on this repository.');
			return;
		}
		
		// Does it already exist? If so, edit the existing
		const idProperty = this.getSchema().model.idProperty;
		if (data.hasOwnProperty(idProperty)) {
			if (this.isInRepository(data[idProperty])) {
				const existing = this.getById(data[idProperty]);
				existing.setRawValues(data);
				if (this.isAutoSave && !existing.isPersisted) {
					await this.save(existing);
				}
				return existing;
			}
		}

		let entity = data;
		if (!(data instanceof Entity)) {
			// Create the new entity
			entity = Repository._createEntity(this.schema, data, this, isPersisted, isDelayedSave, this.isRemotePhantomMode);
		}
		this._relayEntityEvents(entity);
		if (this.isTree && data.parentId) {
			// Trees need new node to be added as first child of parent
			const ix = this.getIxById(data.parentId) +1;
			this.entities = [
				...this.entities.slice(0, ix),
				entity,
				...this.entities.slice(ix)
			];
			this.assembleTreeNodes();
		} else {
			this.entities.unshift(entity); // Add to *beginning* of entities array, so the phantom record will appear at the beginning of the current page
		}

		// Create id if needed
		if (!this.isRemotePhantomMode && entity.isPhantom) {
			entity.createTempId();
		}

		this.emit('add', entity);

		if (this.isRemotePhantomMode || (this.isAutoSave && !entity.isPersisted && !entity.isDelayedSave)) {
			await this.save(entity);
		}

		return entity;
	}

	/**
	 * Creates a new static Entity that does NOT persist in storage medium.
	 * Used when we want to work with an entity, but don't want that entity to appear in a repository.
	 * @param {object} data - Either raw data object or Entity. If raw data, keys are Property names, Values are Property values.
	 * @param {boolean} isPersisted - Whether the new entity should be marked as already being persisted in storage medium.
	 * @param {boolean} isDelayedSave - Should the repository skip autosave when immediately adding the record?
	 * @return {object} entity - new Entity object
	 */
	createStandaloneEntity(data, isPersisted = false, isDelayedSave = false) {
		if (this.isDestroyed) {
			this.throwError('this.createStandaloneEntity is no longer valid. Repository has been destroyed.');
			return;
		}
		
		const entity = Repository._createEntity(this.schema, data, this, isPersisted, isDelayedSave, this.isRemotePhantomMode);

		if (entity.isPhantom && !this.isRemotePhantomMode) {
			entity.createTempId();
		}

		return entity;
	}

	/**
	 * Convenience function to create multiple new Entities in storage medium.
	 * @param {array} data - Array of data objects or Entities. 
	 * @param {boolean} isPersisted - Whether the new entities should be marked as already being persisted in storage medium.
	 * @return {array} entities - new Entity objects
	 */
	async addMultiple(allData, isPersisted = false) {

		if (!this.canAdd) {
			this.throwError('Adding has been disabled on this repository.');
			return;
		}

		let entities = [],
			i,
			data,
			entity;

		for (i = 0; i < allData.length; i++) {
			data = allData[i];
			entity = await this.add(data, isPersisted);
			entities.push(entity);
		};
		
		return entities;
	}

	/**
	 * Helper for add.
	 * Creates a new Entity and immediately returns it
	 * @param {object} schema - Schema object
	 * @param {object} rawData - Raw data object. Keys are Property names, Values are Property values.
	 * @param {boolean} repository - Optional repository to connect the entity to.
	 * @param {boolean} isPersisted - Whether the new entity should be marked as already being persisted in storage medium.
	 * @param {boolean} isDelayedSave - Should the repository skip autosave when immediately adding the record?
	 * @return {object} entity - new Entity object
	 * @private
	 */
	static _createEntity(schema, rawData, repository = null, isPersisted = false, isDelayedSave = false, isRemotePhantomMode = false) {
		const entity = new Entity(schema, rawData, repository, isDelayedSave, isRemotePhantomMode);
		entity.initialize();
		entity.isPersisted = isPersisted;
		return entity;
	}

	/**
	 * Helper for add.
	 * Relays events from entity to this Repository
	 * @param {object} entity - Entity
	 * @private
	 */
	_relayEntityEvents(entity) {
		if (this.isDestroyed) {
			this.throwError('this._relayEntityEvents is no longer valid. Repository has been destroyed.');
			return;
		}
		this.relayEventsFrom(entity, [
			'change',
			'delete',
			'reset',
			'save',
		], 'entity_');
	}

	/**
	 * Destroys the current entities - 
	 * mostly so they can be replaced with other entities.
	 */
	_destroyEntities() {
		_.each(this.entities, (entity) => {
			entity.destroy();
		});
		this.entities = [];
	}

	/**
	 * Inserts the newEntity directly before entity on the current page.
	 */
	_insertBefore(newEntity, entity = null) {

		const
			currentEntities = this.getEntities(),
			foundIx = _.findIndex(currentEntities, ent => ent === entity),
			existingEntityIx = foundIx === -1 ? 0 : foundIx;

		let firstHalf = [],
			secondHalf = [];

		if (!currentEntities.length || existingEntityIx === 0) {
			firstHalf.push(newEntity);
			secondHalf = currentEntities;
		} else {
			firstHalf = _.slice(currentEntities, 0, existingEntityIx);
			firstHalf.push(newEntity);
			secondHalf = _.slice(currentEntities, existingEntityIx);
		}

		this.entities = [
			...firstHalf,
			...secondHalf,
		];
	}

	/**
	 * Deletes all locally cached entities in repository,
	 * usually, the current "page".
	 * Does not actually affect anything on the server.
	 */
	async clear() {
		this._destroyEntities();
	}


	//  _    __      __               
	// | |  / /___ _/ /_  _____  _____
	// | | / / __ `/ / / / / _ \/ ___/
	// | |/ / /_/ / / /_/ /  __(__  ) 
	// |___/\__,_/_/\__,_/\___/____/  

	/**
	 * Gets an array of "submit" values objects for the entities
	 * @return {array} map - 
	 */
	getSubmitValues() {
		return _.map(this.entities, (entity) => {
			return entity.getSubmitValues();
		});
	}

	/**
	 * Gets an array of "display" values objects for the entities
	 * @return {array} map - 
	 */
	getDisplayValues() {
		return _.map(this.entities, (entity) => {
			return entity.getDisplayValues();
		});
	}

	/**
	 * Gets an array of "raw" values objects for the entities
	 * @return {array} map - 
	 */
	getRawValues() {
		return _.map(this.entities, (entity) => {
			return entity.getRawValues();
		});
	}

	/**
	 * Gets an array of "originalData" values objects for the entities
	 * @return {array} map - 
	 */
	getOriginalData() {
		return _.map(this.entities, (entity) => {
			return entity.getOriginalData();
		});
	}

	/**
	 * Gets a single random entity
	 * @return {array} map - 
	 */
	getRandomEntity() {
		const len = this.entities.length;
		if (!len) {
			return null;
		}
		const rand = _.random(0, len -1);
		return this.entities[rand];
	}

	/**
	 * Gets an array of "parsed" values objects for the entities
	 * @return {array} map - 
	 */
	getParsedValues() {
		return _.map(this.entities, (entity) => {
			return entity.getParsedValues();
		});
	}

	/**
	 * Get a single Entity by its index (zero-indexed) on the current page
	 * @param {integer} ix - Index
	 * @return {object} entity - Entity
	 */
	getByIx(ix) {
		if (this.isDestroyed) {
			this.throwError('this.getByIx is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.entities[ix];
	}
	
	/**
	 * Get multiple Entities by their range of indices 
	 * (zero-indexed) on the current page
	 * @param {integer} startIx - Index
	 * @param {integer} endIx - Index (inclusive)
	 * @return {array} entities - Array of Entities
	 */
	getByRange(startIx, endIx) {
		if (this.isDestroyed) {
			this.throwError('this.getByRange is no longer valid. Repository has been destroyed.');
			return;
		}
		return _.slice(this.entities, startIx, endIx+1);
	}

	/**
	 * Get a single Entity by its id
	 * @param {integer} id - id of record to retrieve
	 * @return {Entity} The Entity with matching id, or undefined
	 */
	getById(id) {
		if (this.isDestroyed) {
			this.throwError('this.getById is no longer valid. Repository has been destroyed.');
			return;
		}
		if (_.isNil(id)) {
			return null;
		}
		return this.getFirstBy(entity => entity.id === id);
	}

	/**
	 * Get a single Entity's index by its id.
	 * @param {integer} id - id of record to retrieve
	 * @return {integer} The numerical index, or undefined
	 */
	getIxById(id) {
		if (this.isDestroyed) {
			this.throwError('this.getIxById is no longer valid. Repository has been destroyed.');
			return;
		}
		if (_.isNil(id)) {
			return null;
		}

		const ix = this.entities.findIndex((entity) => entity.id === id);
		if (ix >= 0) {
			return ix;
		}
		return null;
	}

	/**
	 * Get an array of Entities by supplied filter function
	 * @param {function} filter - Filter function to apply to all entities
	 * @return {Entity[]} Entities that passed through filter, or []
	 */
	getBy(filter) {
		if (this.isDestroyed) {
			this.throwError('this.getBy is no longer valid. Repository has been destroyed.');
			return;
		}
		return _.filter(this.entities, filter);
	}

	/**
	 * Gets the first Entity that passes through supplied filter function.
	 * Takes current sorting into account.
	 * Optional second param determines whether to take other currently-applied
	 * filters into account. Defaults to false.
	 * 
	 * @param {function} filter - Filter function to search by
	 * @return {Entity} First Entity found, or undefined
	 */
	getFirstBy(filter) {
		if (this.isDestroyed) {
			this.throwError('this.getFirstBy is no longer valid. Repository has been destroyed.');
			return;
		}
		return _.find(this.entities, filter);
	}

	/**
	 * Get all phantom (unsaved) Entities
	 * @param {array} entities - Array of entities to filter. Optional. Defaults to this.entities
	 * @return {Entity[]} Array of phantom Entities, or []
	 */
	getPhantom(entities = null) {
		if (this.isDestroyed) {
			this.throwError('this.getPhantom is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!entities) {
			entities = this.entities;
		}
		return _.filter(this.entities, entity => entity.isPhantom && !entity.isSaving);
	}

	/**
	 * Get all Entities not yet persisted to a storage medium
	 * @param {array} entities - Array of entities to filter. Optional. Defaults to this.entities
	 * @return {Entity[]} Array of dirty Entities, or []
	 */
	getNonPersisted(entities = null) {
		if (this.isDestroyed) {
			this.throwError('this.getNonPersisted is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!entities) {
			entities = this.entities;
		}
		return _.filter(this.entities, entity => !entity.isPersisted && !entity.isSaving);
	}

	/**
	 * Get an array of all Entities.
	 * Can be overridden by subclasses.
	 * @return {array} Entities that passed through filter
	 */
	getEntities() {
		if (this.isDestroyed) {
			this.throwError('this.getEntities is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.entities;
	}
	/* */

	/**
	 * Get an array of all Entities on current page,
	 * which for the base Repository, means all entities.
	 * Subclasses may change this behavior.
	 * @return {array} Entities
	 */
	getEntitiesOnPage() {
		if (this.isDestroyed) {
			this.throwError('this.getPagedEntities is no longer valid. Repository has been destroyed.');
			return;
		}
		const entities = this.getEntities();
		if (!this.isPaginated) {
			return entities;
		}
		const
			pageIx = this.page -1, // zero-indexed page#
			start = pageIx * this.pageSize,
			end = start + this.pageSize;
		return entities.slice(start, end);
	}
	/* */

	/**
	 * Determines whether this repository is bound to the schema
	 * @return {boolean}
	 */
	getIsBound() {
		if (this.isDestroyed) {
			this.throwError('this.getIsBound is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.schema.getBoundRepository() === this;
	}

	/**
	 * Get all dirty (having unsaved changes) Entities
	 * @param {array} entities - Array of entities to filter. Optional. Defaults to this.entities
	 * @return {Entity[]} Array of dirty Entities, or []
	 */
	getDirty(entities = null) {
		if (this.isDestroyed) {
			this.throwError('this.getDirty is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!entities) {
			entities = this.entities;
		}
		return _.filter(entities, entity => !entity.isSaving && (entity.isDestroyed || entity.isDirty));
	}

	/**
	 * Get all deleted Entities
	 * @param {array} entities - Array of entities to filter. Optional. Defaults to this.entities
	 * @return {Entity[]} Array of deleted Entities, or []
	 */
	getDeleted(entities = null) {
		if (this.isDestroyed) {
			this.throwError('this.getDeleted is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!entities) {
			entities = this.entities;
		}
		return _.filter(entities, entity => entity.isDestroyed || entity.isDeleted);
	}

	/**
	 * Get all staged Entities
	 * @param {array} entities - Array of entities to filter. Optional. Defaults to this.entities
	 * @return {Entity[]} Array of deleted Entities, or []
	 */
	getStaged(entities = null) {
		if (this.isDestroyed) {
			this.throwError('this.getStaged is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!entities) {
			entities = this.entities;
		}
		return _.filter(entities, entity => entity.isStaged && !entity.isSaving);
	}

	/**
	 * Gets the Schema object
	 * @return {Schema} schema
	 */
	getSchema() {
		if (this.isDestroyed) {
			this.throwError('this.getSchema is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.schema;
	}

	/**
	 * Gets the sort field, if only one sorter is applied.
	 * @return {Schema} schema
	 */
	getSortField() {
		if (this.isDestroyed) {
			this.throwError('this.getSortField is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.allowsMultiSort || this.sorters.length < 1) {
			return null;
		}
		return this.sorters[0].name;
	}

	/**
	 * Gets the sort direction, if only one sorter is applied.
	 * @return {Schema} schema
	 */
	getSortDirection() {
		if (this.isDestroyed) {
			this.throwError('this.getSortDirection is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.allowsMultiSort || this.sorters.length < 1) {
			return null;
		}
		return this.sorters[0].direction;
	}

	/**
	 * Gets the sort function, if only one sorter is applied.
	 * @return {Schema} schema
	 */
	getSortFn() {
		if (this.isDestroyed) {
			this.throwError('this.getSortDirection is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.allowsMultiSort || this.sorters.length < 1) {
			return null;
		}
		return this.sorters[0].fn;
	}

	/**
	 * Gets the associated Repository
	 * @param {string} repositoryName - Name of the Repository to retrieve
	 * @return {boolean} hasProperty
	 */
	getAssociatedRepository(repositoryName) {
		if (this.isDestroyed) {
			this.throwError('this.getAssociatedRepository is no longer valid. Repository has been destroyed.');
			return;
		}

		const schema = this.getSchema();
		if (!schema.model.associations?.hasOne.includes(repositoryName) &&
			!schema.model.associations?.hasMany.includes(repositoryName) &&
			!schema.model.associations?.belongsTo.includes(repositoryName) &&
			!schema.model.associations?.belongsToMany.includes(repositoryName)
			) {
			this.throwError(repositoryName + ' is not associated with this schema');
			return;
		}

		const oneHatData = this.oneHatData;
		if (!oneHatData) {
			this.throwError('No global oneHatData object');
			return;
		}

		const associatedRepository = oneHatData.getRepository(repositoryName);
		if (!associatedRepository) {
			this.throwError('Repository ' + repositoryName + ' cannot be found');
			return;
		}
		
		return associatedRepository;
	}

	/**
	 * Utility function.
	 * Detects if entity is in the current page of the storage medium.
	 * @param {object|string} entity - Either an Entity object, or an id
	 * @return {boolean} isInRepository - Whether or not the entity exists in this Repository
	 */
	isInRepository(idOrEntity) {
		if (this.isDestroyed) {
			this.throwError('this.isInRepository is no longer valid. Repository has been destroyed.');
			return;
		}
		if (idOrEntity instanceof Entity) {
			return this.entities.indexOf(idOrEntity) !== -1;
		}
		return !_.isNil(this.getById(idOrEntity));
	}

	/**
	 * Getter of isBound for this Repository.
	 * Returns true if this repository is bound to the schema
	 * @return {boolean} isBound
	 */
	get isBound() {
		if (this.isDestroyed) {
			this.throwError('this.isBound is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.getIsBound();
	}

	/**
	 * Getter of isDirty for this Repository.
	 * Returns true if any Entities within it are dirty
	 * @return {boolean} isDirty
	 */
	get isDirty() {
		if (this.isDestroyed) {
			this.throwError('this.isDirty is no longer valid. Repository has been destroyed.');
			return;
		}
		return !!this.getDirty().length;
	}

	/**
	 * Convenience function
	 * Alias for isInRepository
	 * NOTE: It only searches in memory. Doesn't query server
	 */
	hasId(id) {
		return this.isInRepository(id);
	}

	/**
	 * Convenience function
	 */
	saveStaged() {
		return this.save(null, true);
	}

	/**
	 * Queues up batch operations for saving
	 * new, edited, and deleted entities to storage medium.
	 * 
	 * NOTE: Since multiple operations can take place in one go, we don't change
	 * this.entities until all operations have completed. We leave it to subclasses
	 * to implement that.
	 * @param {object} entity - Optional single entity to save (instead of doing a batch operation on everything)
	 * @param {boolean} useStaged - Save only the staged items, not all
	 */
	async save(entity = null, useStaged = false) {
		if (this.isDestroyed) {
			this.throwError('this.save is no longer valid. Repository has been destroyed.');
			return;
		}

		this.emit('beforeSave'); // So subclasses can prep anything needed for saving
	
		this.isSaving = true;

		const results = [];

		if (entity) {
			// Single operation

			let result;
			if (!entity.isPersisted && entity.isDeleted) {
				result = this._doDeleteNonPersisted(entity);
			} else if (!entity.isPersisted) {
				result = this._doAdd(entity);
			} else if (entity.isDirty && !entity.isDeleted) {
				result = this._doEdit(entity);
			} else if (entity.isDeleted) {
				result = this._doDelete(entity);
			}
			results.push(result);

		} else {
			// Batch operations
			// TODO: Future feature: Take advantage of storage medium's bulk add/edit/delete functionality, if it exists

			const batchOrder = this.batchOrder.split(',');

			let n,
				i,
				entity,
				entities,
				operation,
				result;
			for (n = 0; n < batchOrder.length; n++) {
				operation = batchOrder[n];
				switch(operation) {
					case 'add':
						entities = this.getNonPersisted();
						if (useStaged) {
							entities = this.getStaged(entities);
						}
						if (_.size(entities) > 0) {
							if (this.combineBatch) {

								result = this.batchAsSynchronous ? await this._doBatchAdd(entities) : this._doBatchAdd(entities);
								if (result) {
									results.push(result);
								}
		
							} else {
								for (i = 0; i < entities.length; i++) {
									entity = entities[i];
	
									if (entity.isDeleted) {
										// This entity is new, but it's also marked for deletion
										// Skip it. We'll deal with it later, in 'delete'
										continue;
									}
	
									result = this.batchAsSynchronous ? await this._doAdd(entity) : this._doAdd(entity);
									if (result) {
										results.push(result);
									}
								}
							}
						}
						break;
					case 'edit':
						entities = this.getDirty();
						if (_.isEmpty(entities) && this.isRemotePhantomMode) {
							// In remote phantom mode, we need to save phantoms even if they're not dirty
							entities = this.getPhantom();
						}
						if (useStaged) {
							entities = this.getStaged(entities);
						}
						if (_.size(entities) > 0) {
							if (this.combineBatch) {

								result = this.batchAsSynchronous ? await this._doBatchEdit(entities) : this._doBatchEdit(entities);
								if (result) {
									results.push(result);
								}

							} else {
								for (i = 0; i < entities.length; i++) {
									entity = entities[i];

									if (entity.isDeleted) {
										// This entity is new, but it's also marked for deletion
										// Skip it. We'll deal with it later, in 'delete'
										continue;
									}

									result = this.batchAsSynchronous ? await this._doEdit(entity) : this._doEdit(entity);
									if (result) {
										results.push(result);
									}
								}
							}
						}
						break;
					case 'delete':
						entities = this.getDeleted();
						if (useStaged) {
							entities = this.getStaged(entities);
						}
						if (_.size(entities) > 0) {
							if (this.combineBatch) {

								result = this.batchAsSynchronous ? await this._doBatchDelete(entities) : this._doBatchDelete(entities);
								if (result) {
									results.push(result);
								}

							} else {
								for (i = 0; i < entities.length; i++) {
									entity = entities[i];

									if (!entity.isPersisted) {
										result = this.batchAsSynchronous ? await this._doDeleteNonPersisted(entity) : this._doDeleteNonPersisted(entity);
									} else {
										result = this.batchAsSynchronous ? await this._doDelete(entity) : this._doDelete(entity);
									}
									if (result) {
										results.push(result);
									}
								}
							}
						}
						break;
				}
			}
		}

		return await this._finalizeSave(results);
	}

	
	/**
	 * Helper for save.
	 * Add multiple entities to storage medium
	 * @param {array} entities - Entities
	 * @private
	 * @abstract
	 */
	_doBatchAdd(entities) { // standard function notation
		this.throwError('_doBatchAdd must be implemented by Repository subclass');
		return;
	}

	/**
	 * Helper for save.
	 * Add entity to storage medium
	 * @param {object} entity - Entity
	 * @private
	 * @abstract
	 */
	_doAdd(entity) { // standard function notation
		this.throwError('_doAdd must be implemented by Repository subclass');
		return;
	}

	/**
	 * Helper for save.
	 * Edit multiple entities in storage medium
	 * @param {array} entities - Entities
	 * @private
	 * @abstract
	 */
	_doBatchEdit(entities) { // standard function notation
		this.throwError('_doBatchEdit must be implemented by Repository subclass');
		return;
	}

	/**
	 * Helper for save.
	 * Mark entity as saved
	 * @param {object} entity - Entity
	 * @private
	 * @abstract
	 */
	_doEdit(entity) { // standard function notation
		this.throwError('_doEdit must be implemented by Repository subclass');
		return;
	}

	/**
	 * Helper for save.
	 * Delete multiple entities from storage medium
	 * @param {array} entities - Entities
	 * @private
	 * @abstract
	 */
	_doBatchDelete(entities) { // standard function notation
		this.throwError('_doBatchDelete must be implemented by Repository subclass');
		return;
	}

	/**
	 * Helper for save.
	 * Delete entity from storage medium
	 * @param {object} entity - Entity
	 * @private
	 * @abstract
	 */
	_doDelete(entity) { // standard function notation
		this.throwError('_doDelete must be implemented by Repository subclass');
		return;
	}

	/**
	 * Helper for save.
	 * Tells repository to delete entity without ever having saved it 
	 * to storage medium
	 * @private
	 */
	_doDeleteNonPersisted(entity) {
		return this._doDelete(entity);
	}

	/**
	 * Helper for save.
	 * Should take the promises returned from batch operations and handle any errors.
	 * @param {array} results - Promises returned from batch operations
	 * @fires save
	 * @return {Promise}
	 * @private
	 */
	_finalizeSave(results) {
		this.isSaving = false;
		this.emit('save');
		return results;
	}
	
	/**
	 * Marks entities for deletion from storage medium.
	 * Actual deletion takes place in save(), unless isPhantom
	 * @param {object|array} entities - one or more entities to delete
	 * @param {bool} moveSubtreeUp - whether or not to move the subtree up (if this is a tree)
	 * @fires delete
	 */
	async delete(entities, moveSubtreeUp = false) {
		if (this.isDestroyed) {
			this.throwError('this.delete is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.canDelete) {
			this.throwError('Deleting has been disabled on this repository.');
			return;
		}
		if (!entities) {
			return false;
		}
		if (!_.isArray(entities)) {
			entities = [entities];
		}
		if (!entities.length) {
			return false;
		}
		const oThis = this;
		_.each(entities, (entity) => {
			if (!entity) {
				return;
			}
			if (entity.isPhantom && !entity.isRemotePhantomMode) {
				// Just auto-remove it. Don't bother saving to storage medium.
				oThis.removeEntity(entity);
			} else {
				entity.markDeleted(); // Entity is still there, it's just marked for deletion
			}
		});

		if (this.isTree) {
			this.moveSubtreeUp = moveSubtreeUp;
		}

		this.emit('delete', entities);

		if (this.isAutoSave) {
			await this.save();
		}
	}

	/**
	 * Removes an Entity from the current page
	 * Mainly used for phantom Entities
	 * Helper for delete()
	 */
	removeEntity(entity) { // standard function notation so it can be called by child class via super.removeEntity
		this.entities = _.filter(this.entities, e => e !== entity);
		if (!entity.isDestroyed) {
			entity.destroy();
		}
	}

	/**
	 * Deletes a single Entity by its index (zero-indexed) on the current page
	 * @param {integer} ix - Index
	 * @return {object} entity - Entity
	 */
	async deleteByIx(ix) {
		await this.delete(this.getByIx(ix));
	}
	
	/**
	 * Deletes multiple Entities by their range of indices 
	 * (zero-indexed) on the current page
	 * @param {integer} startIx - Index
	 * @param {integer} endIx - Index (inclusive)
	 * @return {array} entities - Array of Entities
	 */
	async deleteByRange(startIx, endIx) {
		await this.delete(this.getByRange(startIx, endIx));
	}

	/**
	 * Remove multiple Entities by supplied filter function
	 * @param {function} fn - Filter function to apply to all entities
	 * @return {Entity[]} Entities that passed through filter
	 */
	async deleteBy(filter) {
		await this.delete(this.getBy(filter));
	}

	/**
	 * Remove a single Entity by its id
	 * @param {integer} id - id of record to retrieve
	 * @return {Entity} The Entity with matching id
	 */
	async deleteById(id) {
		await this.delete(this.getById(id));
	}

	/**
	 * Remove dirty (having unsaved changes) Entities
	 * Will *NOT* take any filtering into account.
	 * 
	 * @return {Entity[]} Array of dirty Entities
	 */
	async deleteDirty() {
		await this.delete(this.getDirty());
	}

	/**
	 * Remove all phantom (unsaved) Entities
	 * Will *NOT* take any filtering into account.
	 * 
	 * @return {Entity[]} Array of phantom Entities
	 */
	async deletePhantom() {
		await this.delete(this.getPhantom());
	}

	/**
	 * Undelete a single Entity by its index (zero-indexed) on the current page
	 * @param {integer} ix - Index
	 * @return {object} entity - Entity
	 */
	async undeleteByIx(ix) {
		await this.undelete(this.getByIx(ix));
	}
	
	/**
	 * Undelete multiple Entities by their range of indices 
	 * (zero-indexed) on the current page
	 * @param {integer} startIx - Index
	 * @param {integer} endIx - Index (inclusive)
	 * @return {array} entities - Array of Entities
	 */
	async undeleteByRange(startIx, endIx) {
		await this.undelete(this.getByRange(startIx, endIx));
	}

	/**
	 * Undelete multiple Entities by supplied filter function
	 * @param {function} fn - Filter function to apply to all entities
	 * @return {Entity[]} Entities that passed through filter
	 */
	async undeleteBy(filter) {
		await this.undelete(this.getBy(filter));
	}

	/**
	 * Undelete a single Entity by its id
	 * @param {integer} id - id of record to retrieve
	 * @return {Entity} The Entity with matching id
	 */
	async undeleteById(id) {
		await this.undelete(this.getById(id));
	}

	/**
	 * Undelete all deleted Entities
	 * @return {Entity[]} Entities that passed through filter
	 */
	async undeleteDeleted() {
		await this.undelete(this.getDeleted());
	}


	//   ______
	//  /_  __/_______  ___  _____
	//   / / / ___/ _ \/ _ \/ ___/
	//  / / / /  /  __/  __(__  )
	// /_/ /_/   \___/\___/____/
	

	/**
	 * Gets the root TreeNodes
	 */
	getRootNodes() {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.loadRootNodes is no longer valid. Repository has been destroyed.');
			return;
		}

		// Look through all entities and pull out the root nodes.
		// Subclasses of Repository will override this method to get root nodes from server
		const entities = _.filter(this.getEntities(), (entity) => {
			return entity.isRoot;
		})
		return entities;
	}


	/**
	 * Populates the TreeNodes with .parent and .children references
	 */
	assembleTreeNodes() {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.assembleTreeNodes is no longer valid. Repository has been destroyed.');
			return;
		}

		const treeNodes = this.getEntities();

		// Reset all parent/child relationships
		_.each(treeNodes, (treeNode) => {
			treeNode.parent = null;
			treeNode.children = [];
		});

		// Rebuild all parent/child relationships
		const oThis = this;
		_.each(treeNodes, (treeNode) => {
			const parent = oThis.getById(treeNode.parentId);
			if (parent) {
				treeNode.parent = parent;
				parent.children.push(treeNode);
			}
		});
	}

	/**
	 * Removes the treeNode and all of its children from repository
	 * without deleting anything on the server
	 */
	removeTreeNode(treeNode) {
		if (!_.isEmpty(treeNode.children)) {
			const children = treeNode.children;
			treeNode.parent = null;
			treeNode.children = [];
			
			const oThis = this;
			_.each(children, (child) => {
				oThis.removeTreeNode(child);
			});
		}

		this.removeEntity(treeNode);
	}

	/**
	 * Helper to make sure this Repository is a tree
	 * @private
	 */
	async ensureTree() {
		if (!this.isTree) {
			this.throwError('This Repository is not a tree!');
			return false;
		}
		return true;
	}





	//    __  ____  _ ___ __  _          
	//   / / / / /_(_) (_) /_(_)__  _____
	//  / / / / __/ / / / __/ / _ \/ ___/
	// / /_/ / /_/ / / / /_/ /  __(__  ) 
	// \____/\__/_/_/_/\__/_/\___/____/  

	/**
	 * Set config options after Repository has already been initialized
	 * @param {object} options - config options to set. 
	 * Note: this will overwrite any existing properties on 'this', so *use with caution!*
	 */
	setOptions(options) {
		_.merge(this, options);
	}

	rehash() {
		const hashes = _.map(this.entities, (entity) => entity.hash);
		this.hash = hash(hashes);
	}

	unmapData(mappedData) {
		const propertiesDef = this.schema?.model?.properties;
		if (!propertiesDef) {
			throw Error('No properties defined!');
		}

		// Simply the definitions
		const
			UNMAPPED = 'UNMAPPED',
			properties = {};
		_.each(propertiesDef, (def) => {
			properties[def.name] = def.mapping || UNMAPPED;
		});

		// Build the unmapped data
		const unmappedData = {};
		_.forOwn(mappedData, (value, field) => {
			const mapping = properties[field];
			if (mapping === UNMAPPED) {
				// Simple, just add the value
				unmappedData[field] = value;
			} else {
				// This is the more complicated one. Need to build up the hierarchy of unmapped data

				const
					mapStack = mapping.split('.'),
					rawValue = value;
		
				// Build up the hierarchy
				let thisValue = {},
					current = thisValue,
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
						current[path] = rawValue; // Last one, so set the thisValue
					}
				}
				_.merge(unmappedData, thisValue);

			}
		});



		return unmappedData;
	}

	/**
	 * Set error handler for this repository
	 * @param {function} handler - the error handler
	 */
	setErrorHandler(handler) {
		this.errorHandler = handler;
	}


	/**
	 * Either generates an exception, or handles it with the repository's errorHandler
	 * @param {string|object|bool} error - the error message
	 * @param {object} data - optional data object to describe the error
	 */
	throwError(obj, data = null) {
		if (this.errorHandler) {
			this.errorHandler(obj, data);
		} else {
			this.emit('error', obj, data);
		}
	}

	/**
	 * Destroy this object.
	 * - Removes child objects
	 * - Removes event listeners
	 * @fires destroy
	 */
	destroy() {
		// parent objects
		this.schema = null;

		// child objects
		_.each(this.entities, (entity) => {
			entity.destroy();
		})
		this.entities = null;
		this.originalConfig = null;

		this.emit('destroy');
		this.isDestroyed = true;
		
		// listeners
		this.removeAllListeners();
	}

	/**
	 * Gets the className of this Repository type.
	 * @return {string} className
	 */
	getClassName() {
		if (this.isDestroyed) {
			this.throwError('this.getClassName is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.__proto__.constructor.className;
	}

	get className() {
		return this.getClassName();
	}

	/**
	 * Gets the type of this Repository.
	 * @return {string} className
	 */
	getType() {
		if (this.isDestroyed) {
			this.throwError('this.getClassName is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.__proto__.constructor.type;
	}

	get type() {
		return this.getType();
	}

	toString() {
		if (this.isDestroyed) {
			this.throwError('this.toString is no longer valid. Repository has been destroyed.');
			return;
		}
		return this.getClassName() + 'Repository {' + this.name + '} - ' + this.id;
	}

};