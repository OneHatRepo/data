/** @module Repository */

import Repository from './Repository.js';
import Entity from '../Entity/Entity.js';
import natsort from 'natsort';
import _ from 'lodash';

const MEM_PREFIX = 'MEM-';

/**
 * Stores all of its data in local memory as JSON.
 * Does not persist anything to permanent storage.
 * See subclasses for implementations that do persist data
 * to permanent storage.
 * @extends Repository
 */
class MemoryRepository extends Repository {

	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			isLocal: true,
			isAutoSort: true,
			isAutoLoad: true,
			isAutoSave: true,
		};
		_.merge(this, defaults, config);
	}

	initialize() {

		/**
		 * @member {Object} _keyedEntities - Object of all entities, keyed by id (for quick access)
		 * @private
		 */
		this._keyedEntities = {};

		/**
		 * @member {array} _unsortedEntities - The full array of entities, unsorted and unfiltered
		 * @private
		 */
		this._unsortedEntities = [];

		/**
		 * @member {array} _sortedEntities - The full array of entities, sorted and unfiltered
		 * @private
		 */
		this._sortedEntities = [];

		/**
		 * @member {array} _filteredEntities - The full array of entities, sorted and filtered
		 * @private
		 */
		this._filteredEntities = [];

		/**
		 * @member {array} _previousValues - Previous result of this._recalculate
		 * @private
		 */
		this._previousValues = [];

		this.addListeners([
			'changeFilters',
			'changePage',
			'changePageSize',
			'changeSorters',
			'save',
		], () => this._recalculate());

		this.on('add', (entity) => {
			this._keyedEntities[entity.id] = entity;
		});
		
		return super.initialize();
	}



	//     __                    __
	//    / /   ____  ____ _____/ /
	//   / /   / __ \/ __ `/ __  /
	//  / /___/ /_/ / /_/ / /_/ /
	// /_____/\____/\__,_/\__,_/

	/**
	 * Loads data into the Repository. 
	 * This loads *all* data, not just the data for a single page.
	 * @param {array} data - Optional array of rawData or entities 
	 * to load. If null, data will be loaded from storage medium.
	 */
	async load(data = null) {
		
		if (this.isDestroyed) {
			this.throwError('this.load is no longer valid. Repository has been destroyed.');
			return;
		}

		this.emit('beforeLoad');
		this.markLoading();


		const isDirectLoad = !_.isNil(data);


		// Delete _previousValues & _keyedEntities
		this._previousValues = {}; // otherwise, if we load same data, old entities will be destroyed and not replaced!
		_.each(this._keyedEntities, (entity) => {
			entity.destroy();
		});
		this._keyedEntities = {};

		if (isDirectLoad) {
			// We're loading in new data.
			// Delete all existing data, if needed
			if (this._deleteFromStorage) {
				await this._deleteFromStorage();
			}
		} else {
			// No data supplied.
			// Load data from storage medium
			data = await this._loadFromStorage();
		}

		// Create entities, if needed
		let entities = data;
		const repository = this;
		if (!_.isEmpty(data) && !(data[0] instanceof Entity)) {
			entities = _.map(data, (dataRow) => {
				const entity = Repository._createEntity(repository.schema, dataRow, repository, true);
				repository._relayEntityEvents(entity);
				return entity;
			});
		}
		
		// Add to internal store
		const oThis = this;
		_.each(entities, (entity) => {
			if (entity.isPhantom) {
				entity.createTempId();
			}
			oThis._keyedEntities[entity.id] = entity;
		});

		if (isDirectLoad && this._saveToStorage) {
			await this._saveToStorage(entities);
		}

		this.markLoaded();
		this._recalculate(); // fires changeData if needed
		this.emit('load', entities, this);
		return entities;
	}
	

	/**
	 * Helper for load.
	 * Gets initial data from storage medium.
	 * This is mainly used for subclasses of MemoryRepository.
	 * @return {array} data - Array of rawData objects
	 */
	async _loadFromStorage() {
		return this.data || []; // this.data may have come from initial config of Repository
	}

	/**
	 * Override base Repository, because we don't need to reload, but rather _recalculate.
	 * Tells the Repository to reload its data from the storage medium,
	 * using previous settings
	 */
	reload() {
		this._recalculate();
	}

	/**
	 * Override base Repository, just return the entity from storage
	 * @abstract
	 */
	async reloadEntity(entity) {
		const reloadedEntity = this.getById(entity.id);
		reloadedEntity.emit('reload', reloadedEntity);

		this.emit('changeData', this.entities);
		this.emit('load', this);
		this.emit('reloadEntity', reloadedEntity);
		
		return reloadedEntity;
	}



	//    _____            __
	//   / ___/____  _____/ /_
	//   \__ \/ __ \/ ___/ __/
	//  ___/ / /_/ / /  / /_
	// /____/\____/_/   \__/

	/**
	 * Helper for _recalculate.
	 * Internally applies all sorters
	 * @private
	 */
	_applySorters() {
		if (this.isDestroyed) {
			this.throwError('this._applySorters is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.hasSorters) {
			this.isSorted = false;
			this._sortedEntities = [];
			return;
		}

		// Convert these objects into actual "compare" functions
		const sorterFunctions = _.map(this.sorters, (sorter) => {
			if (_.isFunction(sorter)) {
				return sorter;
			}
			if (sorter.fn && sorter.fn !== 'default') {
				if (sorter.fn === 'natsort') {
					return MemoryRepository._getNatSort(sorter);
				} else if (_.isFunction(sorter.fn)) {
					return sorter.fn;
				}
			}
			return MemoryRepository._getCompareFunction(sorter);
		});
		
		let entities = [...this._unsortedEntities]; // Clone the array, so we don't affect the original _unsortedEntities
		
		// This is a multi-dimensional sorter
		// It loops through all sorters in order.
		// If prior sorter returns '0' (equal), then move on to next sorter
		entities.sort((a, b) => { // Array.prototype.sort
			let position;
			_.forEach(sorterFunctions, (sortFn) => {
				position = sortFn(a, b);
				if (position !== 0) {
					return false; // break the forEach loop
				}
			});
			return position;
		});
		this._sortedEntities = entities;
		this.isSorted = true;
	}

	/**
	 * Helper for _applySorters().
	 * Takes a sorter object and returns a valid compare function for use with Array.prototype.sort
	 * @param {object} sorter - Object with two properties: 'name' & 'direction'
	 * @return {function} - Compare function
	 * @private
	 * @static
	 */
	static _getNatSort(sorter) {
		const
			name = sorter.name,
			direction = sorter.direction.toUpperCase();
	
		const ns = natsort.default || natsort; // When imported into cypress, natsort has default, when in React Native, it doesn't.

		const sortFn = ns({ desc: direction !== 'ASC', });
		return (entity1, entity2) => {
			const
				a = entity1[name],
				b = entity2[name];
			return sortFn(a, b);
		};
	}

	/**
	 * Helper for _applySorters().
	 * Takes a sorter object and returns a valid compare function for use with Array.prototype.sort
	 * @param {object} sorter - Object with two properties: 'name' & 'direction'
	 * @return {function} - Compare function
	 * @private
	 * @static
	 */
	static _getCompareFunction(sorter) {
		const
			name = sorter.name,
			direction = sorter.direction.toUpperCase();
		return (entity1, entity2) => {
			const
				a = entity1[name],
				b = entity2[name];
			if (a === b) {
				return 0;
			}
			if (direction === 'ASC') {
				return (a > b) ? 1 : -1;
			} else {
				return (a > b) ? -1 : 1;
			}
		};
	}



	//     _______ ____
	//    / ____(_) / /____  _____
	//   / /_  / / / __/ _ \/ ___/
	//  / __/ / / / /_/  __/ /
	// /_/   /_/_/\__/\___/_/

	/**
	 * Helper for _recalculate.
	 * Internally applies all filters
	 * @fires changeFilter
	 * @private
	 */
	_applyFilters() {
		if (this.isDestroyed) {
			this.throwError('this._applyFilters is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.hasFilters) {
			this._filteredEntities = [];
			return;
		}

		let filters = this.filters,
			entities = this.hasSorters ? [...this._sortedEntities] : [...this._unsortedEntities];

		this._filteredEntities = _.filter(entities, (entity) => {
			let passedAll = true;
			_.forEach(filters, (filter) => {
				// Special: MemoryRepository can handle JS filter functions
				if (_.isFunction(filter)) {
					if (!filter(entity)) {
						passedAll = false;
						return false; // break the forEach loop
					}
				} else if (!_.isNil(filter.fn)) {
					if (!filter.fn(entity)) {
						passedAll = false;
						return false; // break the forEach loop
					}
				} else {
					const { name, value } = filter,
						property = entity.getProperty(name);
					if (!_.isEqual(property.getParsedValue(), property.parse(value))) {
						passedAll = false;
						return false; // break the forEach loop
					}
				}
			});
			return passedAll;
		});
	}

	

	//    __________  __  ______
	//   / ____/ __ \/ / / / __ \
	//  / /   / /_/ / / / / / / /
	// / /___/ _, _/ /_/ / /_/ /
	// \____/_/ |_|\____/_____/

	/**
	 * Helper for save().
	 * Add entity to storage medium.
	 * In this case, it also changes TEMP id to long-term id
	 * @param {object} entity - Entity
	 * @private
	 */
	_doAdd(entity) { // standard function notation
		if (this.isDestroyed) {
			this.throwError('this._doAdd is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.canAdd) {
			this.throwError('Adding has been disabled on this repository.');
			return;
		}

		// Give it a non-temporary ID, if needed
		if (entity.isPhantom) {
			let id = entity.id;

			entity.setId(this._generateUniqueId());

			// Delete its current position in _keyedEntities
			if (this._keyedEntities.hasOwnProperty(id)) {
				delete this._keyedEntities[id];
			}
		}

		// Save it
		this._keyedEntities[entity.id] = entity;
		entity.markSaved();

		return entity;
	}

	/**
	 * Helper for _doAdd().
	 * Generates a unique ID, not already in storage medium
	 * @return {string} id
	 * @private
	 */
	_generateUniqueId() {
		let isUnique = false,
			id;
		while(!isUnique) {
			id = _.uniqueId(MEM_PREFIX);
			if (!this._keyedEntities.hasOwnProperty(id)) {
				isUnique = true;
			}
		}
		return id;
	}


	/**
	 * Helper for save().
	 * Mark entity as saved
	 * @param {object} entity - Entity
	 * @private
	 */
	_doEdit(entity) { // standard function notation
		if (this.isDestroyed) {
			this.throwError('this._doEdit is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.canEdit) {
			this.throwError('Editing has been disabled on this repository.');
			return;
		}

		entity.markSaved();
		return entity;
	}

	/**
	 * Helper for save().
	 * Delete entity from storage medium
	 * @param {object} entity - Entity
	 * @private
	 */
	_doDelete(entity) { // standard function notation
		if (this.isDestroyed) {
			this.throwError('this._doDelete is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.canDelete) {
			this.throwError('Deleting has been disabled on this repository.');
			return;
		}
		
		delete this._keyedEntities[entity.id];
		this.entities = _.filter(this.entities, (x) => x.id !== entity.id);

		entity.destroy();
		return entity;
	}

	/**
	 * Deletes all entities in repository
	 */
	async deleteAll() {
		const entities = _.map(this._keyedEntities, entity => entity);
		await this.delete(entities);
	}

	/**
	 * Get an entity directly from its id.
	 * @return {object} entity
	 */
	getById(id) {
		if (this.isDestroyed) {
			this.throwError('this.getById is no longer valid. Repository has been destroyed.');
			return;
		}
		return this._keyedEntities[id] ? this._keyedEntities[id] : null;
	}

	/**
	 * Get a single Entity's index by its id.
	 * Overrides Repository method, to limit results to only the current page.
	 * @param {integer} id - id of record to retrieve
	 * @return {integer} The numerical index, or undefined
	 */
	getIxById(id) {
		if (this.isDestroyed) {
			this.throwError('this.getIxById is no longer valid. Repository has been destroyed.');
			return;
		}

		const ix = this.getEntitiesOnPage().findIndex((entity) => entity.id === id);
		if (ix >= 0) {
			return ix;
		}
		return undefined;
	}

	/**
	 * Override Repository.getEntities, so we can get an array of 
	 * all *active* Entities, with sorting and filtering applied.
	 * @return {array} Entities that passed through filter
	 */
	getEntities() {
		if (this.isDestroyed) {
			this.throwError('this.getEntities is no longer valid. Repository has been destroyed.');
			return;
		}
		return this._getActiveEntities();
	}
	/* */

	/**
	 * Get an array of all Entities
	 * @return {Entity[]} Entities that passed through filter
	 * /
	getAllData() {
		if (this.isDestroyed) {
			this.throwError('this.getAllData is no longer valid. Repository has been destroyed.');
			return;
		}
		const entities = this._getActiveEntities();
		return _.map(entities, (entity) => {
			return entity.getSubmitValues();
		})
	}
	/* */
	
	removeEntity(entity) { // standard function notation
		const id = entity.id;

		super.removeEntity(entity);

		delete this._keyedEntities[id];

		this._recalculate();
	}





	//     ____              _             __
	//    / __ \____ _____ _(_)___  ____ _/ /____
	//   / /_/ / __ `/ __ `/ / __ \/ __ `/ __/ _ \
	//  / ____/ /_/ / /_/ / / / / / /_/ / /_/  __/
	// /_/    \__,_/\__, /_/_/ /_/\__,_/\__/\___/
	//             /____/

	/**
	 * Retrieves the slice of entities corresponding to the current page.
	 * @return {array} entities - The slice of entities
	 * @private
	 */
	_paginate(entities) {
		if (this.isDestroyed) {
			this.throwError('this._paginate is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isPaginated) {
			return entities;
		}
		return _.slice(entities, this.pageStart -1, this.pageEnd);
	}



	//    ______           __
	//   / ____/_  _______/ /_____  ____ ___
	//  / /   / / / / ___/ __/ __ \/ __ `__ \
	// / /___/ /_/ (__  ) /_/ /_/ / / / / / /
	// \____/\__,_/____/\__/\____/_/ /_/ /_/

	/**
	 * Internally sorts and filters all entities, then populates this.entities
	 * Sorting happens first, then filtering.
	 * @fires changeData
	 * @private
	 */
	_recalculate() {
		if (this.isDestroyed) {
			this.throwError('this._recalculate is no longer valid. Repository has been destroyed.');
			return;
		}
		this._unsortedEntities = _.map(this._keyedEntities, item => item);
		this._sortedEntities = null;
		this._filteredEntities = null;
		
		if (this.hasSorters) {
			this._applySorters();
		}
		if (this.hasFilters) {
			this._applyFilters();
		}

		// Set the current entities
		const entities = this._getActiveEntities();

		// Set the total records that pass filter
		this.total = _.size(entities);

		this._setPaginationVars();

		const nextEntities = this._paginate(entities),
			nextValues = _.map(nextEntities, (entity) => entity.getSubmitValues());
		if (!_.isEqual(this._previousValues, nextValues)) {
			this.entities = nextEntities;
			this._previousValues = nextValues;
			this.emit('changeData', nextEntities);
		}
	}


	_insertBefore(newEntity, entity = null) {
		throw Error('Not yet implemented');
	}

	/**
	 * Gets the total number of Entities in the storage medium,
	 * before any sorting or filtering is applied.
	 * @return {integer} count - The total number of unsorted, unfiltered entities
	 */
	getGrandTotal() {
		if (this.isDestroyed) {
			this.throwError('this.getGrandTotal is no longer valid. Repository has been destroyed.');
			return;
		}
		return _.size(this._unsortedEntities);
	}

	/**
	 * Gets the "active" Entities in the store.
	 * If filtering is applied, this is the number of items that have passed the filter.
	 * If sorting is applied, this is the number of sorted items.
	 * Otherwise, this is equal to the 
	 * @return {integer} count - The total number of unsorted, unfiltered entities
	 */
	_getActiveEntities() {
		if (this.isDestroyed) {
			this.throwError('this._getActiveEntities is no longer valid. Repository has been destroyed.');
			return;
		}
		if (this.hasFilters) {
			return this._filteredEntities;
		}
		if (this.hasSorters) {
			return this._sortedEntities;
		}
		return this._unsortedEntities;
	}

	destroy() {
		// objects associated with this RepositoryType
		this._keyedEntities = null;
		this._unsortedEntities = null;
		this._filteredEntities = null;
		this._sortedEntities = null;

		super.destroy();
	}
};

MemoryRepository.className = 'Memory';
MemoryRepository.type = 'memory';

export default MemoryRepository;