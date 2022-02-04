/** @module Repository */

import EventEmitter from '@onehat/events';
import Entity from '../Entity';
import {
	v4 as uuid,
} from 'uuid';
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
	constructor(config = {}) {
		super(...arguments);
		
		const { schema } = config;

		if (!schema || !schema.model) {
			throw new Error('Schema cannot be empty');
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
			 * @member {boolean} autoLoad - Whether to immediately load this repository's data on instantiation
			 */
			autoLoad: false,

			/**
			 * @member {boolean} autoSave - Whether to automatically save entity changes to permanent storage
			 */
			autoSave: false,

			/**
			 * @member {boolean} autoSort - Whether to automatically sort entities in permanent storage
			 */
			autoSort: true,

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
			 * @member {boolean} isPaginated - Whether this Repository is paginated
			 */
			isPaginated: false,

			/**
			 * @member {number} pageSize - Max number of entities per page
			 * Example: For "Showing 21-30 of 45" This would be 10
			 */
			pageSize: 10,

			sorters: (schema && schema.model && schema.model.sorters) ? schema.model.sorters : [],

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
		 * @member {Boolean} isFiltered - State: whether or not any filters are currently applied to entities
		 */
		this.isFiltered = false;
		
		/**
		 * @member {Boolean} isInitialized - State: whether or not this repository has been completely initialized
		 */
		this.isInitialized = false;

		/**
		 * @member {Boolean} isLoaded - State: whether or not entities have been loaded at least once
		 */
		this.isLoaded = false;

		/**
		 * @member {Boolean} isLoading - State: whether or not entities are currently being loaded
		 */
		this.isLoading = false;

		/**
		 * @member {Boolean} isSaving - State: whether or not entities are currently being saved
		 */
		this.isSaving = false;

		/**
		 * @member {Boolean} isSorted - State: whether or not any sorting is currently applied to entities
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
	}

	/**
	 * Initializes the Repository.
	 * - Applies default sorters
	 * - Autoloads data, if needed
	 * This is async because we may need to wait for loading and sorting.
	 */
	async initialize() {
		// Create default sorters if none supplied
		if (this.autoSort && !this.sorters.length) {
			this.sorters = this.getDefaultSorters();
		}
		
		// Assign event handlers
		this.on('entity_change', async (entity) => { // Entity changed its value
			if (this.autoSave) {
				return await this.save(entity);
			}
		});

		// Auto load & sort
		if (this.autoLoad) {
			await this.load();
		}
		if (!this.isSorted && this.autoSort && !this.isRemoteSort) { // load may have sorted, in which case this will be skipped.
			await this.sort();
		}

		this.isInitialized = true;
		this.emit('initialize');
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
	load = async () => {
		throw new Error('load must be implemented by Repository subclass');
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
	reloadEntity = async (entity) => {
		throw new Error('reloadEntity must be implemented by Repository subclass');
	}

	/**
	 * Sets the autoSave setting of this Repository
	 * @param {boolean} autoSave
	 */
	setAutoSave = (autoSave) => {
		if (this.isDestroyed) {
			throw Error('this.setAutoSave is no longer valid. Repository has been destroyed.');
		}
		this.autoSave = autoSave
	}

	/**
	 * Sets the autoLoad setting of this Repository
	 * @param {boolean} autoLoad
	 */
	setAutoLoad = (autoLoad) => {
		if (this.isDestroyed) {
			throw Error('this.setAutoLoad is no longer valid. Repository has been destroyed.');
		}
		this.autoLoad = autoLoad
	}


	//    _____            __
	//   / ___/____  _____/ /_
	//   \__ \/ __ \/ ___/ __/
	//  ___/ / /_/ / /  / /_
	// /____/\____/_/   \__/

	/**
	 * @member {Boolean} hasSorters - Whether or not any sorters are applied
	 */
	get hasSorters() {
		if (this.isDestroyed) {
			throw Error('this.hasSorters is no longer valid. Repository has been destroyed.');
		}
		return this.sorters.length > 0;
	}

	/**
	 * Clear all sorting from this Repository.
	 */
	clearSort = () => {
		if (this.isDestroyed) {
			throw Error('this.clearSort is no longer valid. Repository has been destroyed.');
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
	 * - repository.sort({ // sort by one property, object notation
	 * 		name: 'last_name',
	 * 		direction: 'ASC',
	 * 	});
	 * - repository.sort([ // sort by multiple properties
	 * 		{
	 * 			name: 'last_name',
	 * 			direction: 'ASC',
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
	sort = (arg1 = null, arg2 = null) => {
		if (this.isDestroyed) {
			throw Error('this.sort is no longer valid. Repository has been destroyed.');
		}
		// Assemble sorting definition objects
		let sorters = [];
		if (_.isNil(arg1)) {
			sorters = this.getDefaultSorters();
		} else if (_.isArray(arg1)) {
			sorters = arg1;
		} else if (_.isObject(arg1)) { // includes functions
			sorters = [arg1];
		} else if (_.isString(arg1)) {
			if (_.isNil(arg2)) {
				arg2 = 'ASC';
			}
			sorters = [{
				name: arg1,
				direction: arg2,
			}];
		}

		this.setSorters(sorters);

		return this;
	}

	/**
	 * Gets default sorters. Either what was specified on schema, or sorty by displayProperty ASC.
	 * @return {array} sorters
	 */
	getDefaultSorters = () => {
		if (this.isDestroyed) {
			throw Error('this.getDefaultSorters is no longer valid. Repository has been destroyed.');
		}
		let sorters = [];
		if (this.schema && this.schema.model) {
			if (_.size(this.schema.model.sorters) > 0) {
				sorters = this.schema.model.sorters
			} else if (!_.isNil(this.schema.model.displayProperty)) {
				sorters = [{
					name: this.schema.model.displayProperty,
					direction: 'ASC'
				}];
			}
		}
		return sorters;
	}

	/**
	 * Sets the sorters directly
	 * @fires changeSorters
	 */
	setSorters = (sorters) => {
		if (this.isDestroyed) {
			throw Error('this.setSorters is no longer valid. Repository has been destroyed.');
		}
		if (!this.allowsMultiSort && sorters.length > 1) {
			throw Error('Cannot have more than one sorter at a time.');
		}

		let isChanged = false;
		if (!_.isEqual(this.sorters, sorters)) {
			isChanged = true;

			// Check to make sure specified properties are sortable
			_.each(sorters, (sorter) => {
				if (_.isFunction(sorter)) {
					return; // skip
				}
				// This is kind of a hack!
				// We get the first entity (assuming any exist) and check its properties.
				// TODO: refactor this so we can check even if no entities exist
				const entity = this.entities[0];
				if (entity) {
					const property = entity.getProperty(sorter.name);
					if (!property) {
						throw new Error('Sorting property does not exist.');
					}
					if (!property.isSortable) {
						throw new Error('Sorting property type is not sortable.');
					}
				}
			});

			this.sorters = sorters;
			this.emit('changeSorters');
			if (this._onChangeSorters) {
				return this._onChangeSorters();
			}
		}
		return isChanged;
	}


	//     _______ ____
	//    / ____(_) / /____  _____
	//   / /_  / / / __/ _ \/ ___/
	//  / __/ / / / /_/  __/ /
	// /_/   /_/_/\__/\___/_/

	/**
	 * @member {Boolean} hasFilters - Whether or not any filters are applied
	 */
	get hasFilters() {
		if (this.isDestroyed) {
			throw Error('this.hasFilters is no longer valid. Repository has been destroyed.');
		}
		return this.filters.length > 0;
	}

	hasFilter = (name) => {
		if (!this.hasFilters) {
			return false;
		}
		const found = _.find(this.filters, (filter) => {
			return filter.name === name;
		});
		return !!found;
	}

	hasFilterValue = (name, value) => {
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
	filter = (arg1 = null, arg2 = null, clearFirst = true) => {
		if (this.isDestroyed) {
			throw Error('this.filter is no longer valid. Repository has been destroyed.');
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
		} else if (_.isObject(arg1)) { // includes functions
			newFilters = [arg1];
		}

		// Set up new filters
		let filters = clearFirst ? 
						[] : // Clear existing filters
						_.map(this.filters, filter => filter); // Add to or modify existing filters. Work with a copy, so we can detect changes in _setFilters
		
		_.each(newFilters, (newFilter) => {

			let deleteExisting = false,
				addNew = true;

			if (!_.isFunction(newFilter)) {
				if (_.isNil(newFilter.value)) {
					deleteExisting = true;
					addNew = false;
				} else
				if (_.find(filters, (filter) => filter.name === newFilter.name)) {
					// Filter already exists
					deleteExisting = true;
				}
			}

			if (deleteExisting) {
				filters = _.filter(filters, (filter) => filter.name !== newFilter.name)
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
	setFilters = (filters, clearFirst = true) => {
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
	clearFilters = (filtersToClear) => {
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
	_setFilters = (filters) => {
		if (this.isDestroyed) {
			throw Error('this._setFilters is no longer valid. Repository has been destroyed.');
		}
		let isChanged = false;
		if (!_.isEqual(this.filters, filters)) {
			isChanged = true;
			this.filters = filters;
			this.resetPagination();
			this.emit('changeFilters');
			if (this._onChangeFilters) {
				return this._onChangeFilters();
			}
		}
		return isChanged;
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
	resetPagination = (pageSize) => {
		if (this.isDestroyed) {
			throw Error('this.resetPagination is no longer valid. Repository has been destroyed.');
		}
		this.setPage(1);
	}

	/**
	 * Sets the pageSize
	 * @fires changePageSize
	 */
	setPageSize = (pageSize) => {
		if (this.isDestroyed) {
			throw Error('this.setPageSize is no longer valid. Repository has been destroyed.');
		}
		if (!this.isPaginated) {
			return false;
		}
		if (_.isEqual(this.pageSize, pageSize)) {
			return false;
		}

		// Reset to page 1
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
	 */
	setPage = (page) => {
		if (this.isDestroyed) {
			throw Error('this.setPage is no longer valid. Repository has been destroyed.');
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
	prevPage = () => {
		return this.setPage(this.page -1);
	}

	/**
	 * Advances to the next page of entities
	 * @return {boolean} success
	 */
	nextPage = () => {
		return this.setPage(this.page +1);
	}

	/**
	 * Sets current pagination vars.
	 * NOTE: this.total, this.page, and this.pageSize must be managed elsewhere.
	 * This function takes care of calculating and setting the rest.
	 * @private
	 */
	_setPaginationVars = () => {
		if (this.isDestroyed) {
			throw Error('this._setPaginationVars is no longer valid. Repository has been destroyed.');
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
	static _calculatePaginationVars = (total, page, pageSize) => {

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
	 * @param {boolean} originalIsMapped - Has data already been mapped according to schema?
	 * @return {object} entity - new Entity object
	 * @fires add
	 */
	add = async (data, isPersisted = false, originalIsMapped = false) => {
		if (this.isDestroyed) {
			throw Error('this.add is no longer valid. Repository has been destroyed.');
		}
		
		let entity = data;
		if (!(data instanceof Entity)) {
			// Create the new entity
			entity = Repository._createEntity(this.schema, data, this, isPersisted, originalIsMapped);
		}
		this._relayEntityEvents(entity);
		this.entities.push(entity);

		// Create id if needed
		if (entity.isPhantom) { // i.e. idProperty has no value
			entity.createTempId();
		}

		this.emit('add', entity);

		if (this.autoSave && !entity.isPersisted) {
			await this.save(entity);
		}

		return entity;
	}

	/**
	 * Creates a new static Entity that does NOT persist in storage medium.
	 * @param {object} data - Either raw data object or Entity. If raw data, keys are Property names, Values are Property values.
	 * @param {boolean} isPersisted - Whether the new entity should be marked as already being persisted in storage medium.
	 * @param {boolean} originalIsMapped - Has data already been mapped according to schema?
	 * @return {object} entity - new Entity object
	 */
	createStandaloneEntity = async (data, isPersisted = false, originalIsMapped = false) => {
		if (this.isDestroyed) {
			throw Error('this.createStandaloneEntity is no longer valid. Repository has been destroyed.');
		}
		
		const entity = Repository._createEntity(this.schema, data, this, isPersisted, originalIsMapped);

		if (entity.isPhantom) {
			entity.createTempId();
		}

		return entity;
	}

	/**
	 * Convenience function to add entity with mapped data.
	 */
	addMapped = (data, isPersisted = false) => {
		return this.add(data, isPersisted, true);
	}

	/**
	 * Convenience function to create multiple new Entities in storage medium.
	 * @param {array} data - Array of data objects or Entities. 
	 * @param {boolean} isPersisted - Whether the new entities should be marked as already being persisted in storage medium.
	 * @return {array} entities - new Entity objects
	 */
	addMultiple = async (allData, isPersisted = false, originalIsMapped = false) => {

		let entities = [],
			i;

		for (i = 0; i < allData.length; i++) {
			const data = allData[i],
				entity = await this.add(data, isPersisted, originalIsMapped);
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
	 * @return {object} entity - new Entity object
	 * @private
	 */
	static _createEntity = (schema, rawData, repository = null, isPersisted = false, originalIsMapped = false) => {
		const entity = new Entity(schema, rawData, repository, originalIsMapped);
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
	_relayEntityEvents = (entity) => {
		if (this.isDestroyed) {
			throw Error('this._relayEntityEvents is no longer valid. Repository has been destroyed.');
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
	_destroyEntities = () => {
		_.each(this.entities, (entity) => {
			entity.destroy();
		});
		this.entities = [];
	}

	/**
	 * Deletes all locally cached entities in repository,
	 * usually, the current "page".
	 * Does not actually affect anything on the server.
	 */
	clear = async () => {
		this._destroyEntities();
	}

	/**
	 * Gets an array of "submit" values objects for the entities
	 * @return {array} map - 
	 */
	getSubmitValues = () => {
		return _.map(this.entities, (entity) => {
			return entity.getSubmitValues();
		});
	}

	/**
	 * Gets an array of "display" values objects for the entities
	 * @return {array} map - 
	 */
	getDisplayValues = () => {
		return _.map(this.entities, (entity) => {
			return entity.getDisplayValues();
		});
	}

	/**
	 * Gets an array of "raw" values objects for the entities
	 * @return {array} map - 
	 */
	getRawValues = () => {
		return _.map(this.entities, (entity) => {
			return entity.getRawValues();
		});
	}

	/**
	 * Gets an array of "originalData" values objects for the entities
	 * @return {array} map - 
	 */
	getOriginalData = () => {
		return _.map(this.entities, (entity) => {
			return entity.getOriginalData();
		});
	}

	/**
	 * Gets a single random entity
	 * @return {array} map - 
	 */
	getRandomEntity = () => {
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
	getParsedValues = () => {
		return _.map(this.entities, (entity) => {
			return entity.getParsedValues();
		});
	}

	/**
	 * Get a single Entity by its index (zero-indexed) on the current page
	 * @param {integer} ix - Index
	 * @return {object} entity - Entity
	 */
	getByIx = (ix) => {
		if (this.isDestroyed) {
			throw Error('this.getByIx is no longer valid. Repository has been destroyed.');
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
	getByRange = (startIx, endIx) => {
		if (this.isDestroyed) {
			throw Error('this.getByRange is no longer valid. Repository has been destroyed.');
		}
		return _.slice(this.entities, startIx, endIx+1);
	}

	/**
	 * Get a single Entity by its id
	 * @param {integer} id - id of record to retrieve
	 * @return {Entity} The Entity with matching id, or undefined
	 */
	getById = (id) => {
		if (this.isDestroyed) {
			throw Error('this.getById is no longer valid. Repository has been destroyed.');
		}
		return this.getFirstBy(entity => entity.id === id);
	}

	/**
	 * Get an array of Entities by supplied filter function
	 * @param {function} filter - Filter function to apply to all entities
	 * @return {Entity[]} Entities that passed through filter, or []
	 */
	getBy = (filter) => {
		if (this.isDestroyed) {
			throw Error('this.getBy is no longer valid. Repository has been destroyed.');
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
	getFirstBy = (filter) => {
		if (this.isDestroyed) {
			throw Error('this.getFirstBy is no longer valid. Repository has been destroyed.');
		}
		return _.find(this.entities, filter);
	}

	/**
	 * Get all phantom (unsaved) Entities
	 * @return {Entity[]} Array of phantom Entities, or []
	 */
	getPhantom = () => {
		if (this.isDestroyed) {
			throw Error('this.getPhantom is no longer valid. Repository has been destroyed.');
		}
		return _.filter(this.entities, (entity) => entity.isPhantom);
	}

	/**
	 * Get all Entities not yet persisted to a storage medium
	 * @return {Entity[]} Array of dirty Entities, or []
	 */
	getNonPersisted = () => {
		if (this.isDestroyed) {
			throw Error('this.getDirty is no longer valid. Repository has been destroyed.');
		}
		return _.filter(this.entities, (entity) => {
			return !entity.isPersisted;
		});
	}

	/**
	 * Get all dirty (having unsaved changes) Entities
	 * @return {Entity[]} Array of dirty Entities, or []
	 */
	getDirty = () => {
		if (this.isDestroyed) {
			throw Error('this.getDirty is no longer valid. Repository has been destroyed.');
		}
		return _.filter(this.entities, (entity) => {
			return entity.isDirty;
		});
	}

	/**
	 * Get all deleted Entities
	 * @return {Entity[]} Array of deleted Entities, or []
	 */
	getDeleted = () => {
		if (this.isDestroyed) {
			throw Error('this.getDeleted is no longer valid. Repository has been destroyed.');
		}
		return _.filter(this.entities, (entity) => {
			return entity.isDeleted;
		});
	}

	/**
	 * Utility function.
	 * Detects if entity is in the current page of the storage medium.
	 * @param {object|string} entity - Either an Entity object, or an id
	 * @return {boolean} isInRepository - Whether or not the entity exists in this Repository
	 */
	isInRepository(idOrEntity) {
		if (this.isDestroyed) {
			throw Error('this.isInRepository is no longer valid. Repository has been destroyed.');
		}
		if (idOrEntity instanceof Entity) {
			return this.entities.indexOf(idOrEntity) !== -1;
		}
		return !_.isNil(this.getById(idOrEntity));
	}

	/**
	 * Convenience function
	 * Alias for isInRepository
	 * NOTE: It only searches in memory. Doesn't query server
	 */
	hasId = (id) => {
		return this.isInRepository(id);
	}

	/**
	 * Queues up batch operations for saving
	 * new, edited, and deleted entities to storage medium.
	 * 
	 * NOTE: Since multiple operations can take place in one go, we don't change
	 * this.entities until all operations have completed. We leave it to subclasses
	 * to implement that.
	 * @param {object} entity - Optional single entity to save (instead of doing a batch operation on everything)
	 */
	save = async (entity = null) => {
		if (this.isDestroyed) {
			throw Error('this.save is no longer valid. Repository has been destroyed.');
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

			let n;
			for (n = 0; n < batchOrder.length; n++) {
				const operation = batchOrder[n];
				let entities;
				switch(operation) {
					case 'add':
						entities = this.getNonPersisted();
						if (this.combineBatch) {

							// TODO: Implement combined batch processing
							throw new Error('Combined batch processing not yet implemented');

						} else {
							if (_.size(entities) > 0) {
								let i;
								for (i = 0; i < entities.length; i++) {
									const entity = entities[i];
	
									if (entity.isDeleted) {
										// This entity is new, but it's also marked for deletion
										// Skip it. We'll deal with it later, in 'delete'
										continue;
									}
	
									const result = this.batchAsSynchronous ? await this._doAdd(entity) : this._doAdd(entity);
									results.push(result);
								}
							}
						}
			
			
						break;
					case 'edit':
						entities = this.getDirty();
						if (this.combineBatch) {

							// TODO: Implement combined batch processing
							throw new Error('Combined batch processing not yet implemented');

						} else {
							if (_.size(entities) > 0) {
								let i;
								for (i = 0; i < entities.length; i++) {
									const entity = entities[i];

									if (entity.isDeleted) {
										// This entity is new, but it's also marked for deletion
										// Skip it. We'll deal with it later, in 'delete'
										continue;
									}

									const result = this.batchAsSynchronous ? await this._doEdit(entity) : this._doEdit(entity);
									results.push(result);
								}
							}
						}
						break;
					case 'delete':
						entities = this.getDeleted();
						if (this.combineBatch) {

							// TODO: Implement combined batch processing
							throw new Error('Combined batch processing not yet implemented');

						} else {
							if (_.size(entities) > 0) {
								let i;
								for (i = 0; i < entities.length; i++) {
									const entity = entities[i];

									let result;
									if (!entity.isPersisted) {
										result = this.batchAsSynchronous ? await this._doDeleteNonPersisted(entity) : this._doDeleteNonPersisted(entity);
									} else {
										result = this.batchAsSynchronous ? await this._doDelete(entity) : this._doDelete(entity);
									}
									results.push(result);
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
	 * Helper for save().
	 * Add entity to storage medium
	 * @param {object} entity - Entity
	 * @private
	 * @abstract
	 */
	_doAdd(entity) { // standard function notation
		throw new Error('_doAdd must be implemented by Repository subclass');
	}

	/**
	 * Helper for save().
	 * Mark entity as saved
	 * @param {object} entity - Entity
	 * @private
	 * @abstract
	 */
	_doEdit(entity) { // standard function notation
		throw new Error('_doEdit must be implemented by Repository subclass');
	}

	/**
	 * Helper for save().
	 * Delete entity from storage medium
	 * @param {object} entity - Entity
	 * @private
	 * @abstract
	 */
	_doDelete(entity) { // standard function notation
		throw new Error('_doDelete must be implemented by Repository subclass');
	}

	/**
	 * Helper for save().
	 * Tells storage medium to delete entity without ever having saved it 
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
	_finalizeSave = (results) => {
		this.isSaving = false;
		this.emit('save');
		return results;
	}
	
	/**
	 * Marks entities for deletion from storage medium.
	 * Actual deletion takes place in save()
	 * @param {object|array} entities - one or more entities to delete
	 * @fires delete
	 */
	delete = async (entities) => {
		if (this.isDestroyed) {
			throw Error('this.delete is no longer valid. Repository has been destroyed.');
		}

		if (!_.isArray(entities)) {
			entities = [entities];
		}
		if (!entities.length) {
			return;
		}
		_.each(entities, (entity) => {
			entity.markDeleted(); // Entity is still there, it's just marked for deletion
		});

		this.emit('delete', entities);

		if (this.autoSave) {
			await this.save();
		}
	}

	/**
	 * Deletes a single Entity by its index (zero-indexed) on the current page
	 * @param {integer} ix - Index
	 * @return {object} entity - Entity
	 */
	deleteByIx = async (ix) => {
		await this.delete(this.getByIx(ix));
	}
	
	/**
	 * Deletes multiple Entities by their range of indices 
	 * (zero-indexed) on the current page
	 * @param {integer} startIx - Index
	 * @param {integer} endIx - Index (inclusive)
	 * @return {array} entities - Array of Entities
	 */
	deleteByRange = async (startIx, endIx) => {
		await this.delete(this.getByRange(startIx, endIx));
	}

	/**
	 * Remove multiple Entities by supplied filter function
	 * @param {function} fn - Filter function to apply to all entities
	 * @return {Entity[]} Entities that passed through filter
	 */
	deleteBy = async (filter) => {
		await this.delete(this.getBy(filter));
	}

	/**
	 * Remove a single Entity by its id
	 * @param {integer} id - id of record to retrieve
	 * @return {Entity} The Entity with matching id
	 */
	deleteById = async (id) => {
		await this.delete(this.getById(id));
	}

	/**
	 * Remove dirty (having unsaved changes) Entities
	 * Will *NOT* take any filtering into account.
	 * 
	 * @return {Entity[]} Array of dirty Entities
	 */
	deleteDirty = async () => {
		await this.delete(this.getDirty());
	}

	/**
	 * Remove all phantom (unsaved) Entities
	 * Will *NOT* take any filtering into account.
	 * 
	 * @return {Entity[]} Array of phantom Entities
	 */
	deletePhantom = async () => {
		await this.delete(this.getPhantom());
	}




	//    ____        __  _
	//   / __ \____  / /_(_)___  ____  _____
	//  / / / / __ \/ __/ / __ \/ __ \/ ___/
	// / /_/ / /_/ / /_/ / /_/ / / / (__  )
	// \____/ .___/\__/_/\____/_/ /_/____/
	//     /_/

	/**
	 * Set config options after Repository has already been initialized
	 * @param {object} options - config options to set. 
	 * Note: this will overwrite any existing properties on 'this', so *use with caution!*
	 */
	setOptions = (options) => {
		_.merge(this, options);
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
	getClassName = () => {
		if (this.isDestroyed) {
			throw Error('this.getClassName is no longer valid. Repository has been destroyed.');
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
	getType = () => {
		if (this.isDestroyed) {
			throw Error('this.getClassName is no longer valid. Repository has been destroyed.');
		}
		return this.__proto__.constructor.type;
	}

	get type() {
		return this.getType();
	}

	toString = () => {
		if (this.isDestroyed) {
			throw Error('this.toString is no longer valid. Repository has been destroyed.');
		}
		return this.getClassName() + 'Repository {' + this.name + '} - ' + this.id;
	}

};