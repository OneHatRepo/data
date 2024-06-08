/** @module Repository */

import MemoryRepository from './Memory.js';
import _ from 'lodash';
import moment from 'moment';

const LAST_SYNC = 'LAST_SYNC';

/**
 * Offline Repositories are MemoryRepositories backed by an offline storage medium.
 * Data is initially loaded from the storage medium into memory, and data is synced
 * on Add/Edit/Delete operations.
 * @extends MemoryRepository
 */
class OfflineRepository extends MemoryRepository {

	constructor(config = {}) {
		super(...arguments);
		
		const defaults = {

			isAutoLoad: true,
			isAutoSave: true,

		};
		_.merge(this, defaults, config);

		this._index = null;
	}

	async initialize() {
		this.pauseEvents(); // Queue 'initialize' event from super

		await super.initialize(); // Initializes index in _loadFromStorage()

		this.resumeEvents(true); // Now fire it!
	}

	/**
	 * Helper for load.
	 * Deletes all data in storage medium.
	 * @private
	 */
	_deleteFromStorage = async () => {
		try {
			const ids = await this._getIndex(),
				total = ids.length,
				results = [];

			if (_.isNil(ids) || (_.isArray(ids) && !ids.length)) {
				return;
			}
			
			if (this._storageDeleteMultiple) {

				await this._storageDeleteMultiple(ids);
				
			} else {
				let i, id;
				for (i = 0; i < total; i++) {
					id = ids[i];
					results.push( this._storageDeleteValue(id) );
				}
				await Promise.all(results);
			}

			await this._setIndex([]);

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	/**
	 * Helper for load.
	 * Gets initial data from storage medium.
	 * @return {array} data - Array of rawData objects
	 * @private
	 */
	_loadFromStorage = async () => {
		try {

			this._index = await this._getIndex();

			const ids = this._index,
				total = ids && ids.length ? ids.length : 0,
				results = [];
			
			if (!ids) {
				return [];
			}
			
			if (this._storageGetMultiple) {

				return await this._storageGetMultiple(ids);

			} else {
				let i, id;
				for (i = 0; i < total; i++) {
					id = ids[i];
					const value = await this._storageGetValue(id);
					results.push(value);
				}
				return results;
			}

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
			return [];
		}
	}

	/**
	 * Helper for load.
	 * Saves data to storage medium from direct load.
	 * @return {array} data - Array of rawData objects
	 * @private
	 */
	_saveToStorage = async (entities) => {
		try {
			let i, entity,
				total = entities.length,
				result,
				results = [];

			if (this._storageSetMultiple) {

				// Prepare entities for multi-storage
				const values = {};
				_.each(entities, (entity) => {
					values[entity.id] = entity.getOriginalData();
				});
				await this._storageSetMultiple(values);

			} else {
				for (i = 0; i < total; i++) {
					entity = entities[i];
					result = this._storageSetValue(entity.id, entity.getOriginalData());
					results.push(result);
				}
				await Promise.all(results);
			}

			const ids = _.map(entities, (entity) => entity.id);
			await this._setIndex(ids);

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	/**
	 * Helper for save().
	 * Hook into super._doAdd, so we can save new Entity to storage medium.
	 * @param {object} entity - Entity
	 * @return {Promise}
	 * @private
	 */
	async _doAdd(entity) {
		if (!this.canAdd) {
			this.throwError('Adding has been disabled on this repository.');
			return;
		}

		// Get a clone, in case we need to revert back to it later
		const clone = entity.clone();

		// Attempt to add
		super._doAdd(entity);

		let storageResult;
		try {
			storageResult = await this._storageSetValue(entity.id, entity.getOriginalData());
			await this._addToIndex(entity.id);
		} catch (e) {
			// Revert to clone
			delete this._keyedEntities[entity.id];
			entity.destroy();
			this._keyedEntities[clone.id] = clone;
		}

		return storageResult;
	}

	/**
	 * Helper for _doAdd.
	 * Adds id to index in storage medium.
	 * @param {string} id - The id to add.
	 * @private
	 */
	_addToIndex = async (id) => {
		let index = await this._getIndex();
		index.push(id);
		index = _.uniq(index);
		await this._setIndex(index);
	}

	/**
	 * Hook into super._doEdit, so we can save Entity changes to storage medium.
	 */
	async _doEdit(entity) {
		if (!this.canEdit) {
			this.throwError('Editing has been disabled on this repository.');
			return;
		}

		// Get a clone, in case we need to revert back to it later
		const clone = entity.clone();

		// Attempt to edit
		super._doEdit(entity);

		let storageResult;
		try {
			storageResult = await this._storageSetValue(entity.id, entity.getOriginalData());
		} catch (e) {
			// Revert to clone
			entity.isPersisted = clone.isPersisted;
			entity._originalData = clone._originalData;
			entity._originalDataParsed = clone._originalDataParsed;
		}

		return storageResult;
	}

	/**
	 * Hook into super._doDelete, so we can delete Entity from storage medium.
	 */
	async _doDelete(entity) {
		if (!this.canDelete) {
			this.throwError('Deleting has been disabled on this repository.');
			return;
		}
		
		// Get a clone, in case we need to revert back to it later
		const clone = entity.clone();

		// Attempt to delete
		super._doDelete(entity);


		let storageResult;
		try {
			storageResult = await this._storageDeleteValue(entity.id);
			await this._deleteFromIndex(entity.id);
		} catch (e) {
			// Revert to clone
			this._keyedEntities[clone.id] = clone;
		}

		return storageResult;
	}

	/**
	 * Helper for _doDelete.
	 * Deletes id from index in storage medium.
	 * @param {string} id - The id to delete.
	 * @private
	 */
	_deleteFromIndex = async (id) => {
		let index = await this._getIndex();
		_.pull(index, id);
		await this._setIndex(index);
	}

	/**
	 * Don't do anything with storage medium; just go straight to super._doDelete
	 * @private
	 */
	_doDeleteNonPersisted(entity) {
		return super._doDelete(entity);
	}

	/**
	 * Helper for save.
	 * Should take the results of the batch operations and handle any errors.
	 * Executes callback that was passed to save()
	 * @param {array} results - Promises returned from batch operations
	 * Executes with one argument of batchOperationResults
	 * @fires save
	 * @private
	 */
	_finalizeSave = async (results) => {
		return Promise.all(results)
					.then(() => {
						this.isSaving = false;
						this.emit('save');
					});
	}


	//     ____          __         
	//    /  _/___  ____/ /__  _  __
	//    / // __ \/ __  / _ \| |/_/
	//  _/ // / / / /_/ /  __/>  <  
	// /___/_/ /_/\__,_/\___/_/|_|
	
	/**
	 * Gets the index from the storage medium.
	 * @return {array} index - Array of ids.
	 * @private
	 */
	_getIndex = async () => {
		// return await this._storageGetValue('index');
		let result = await this._storageGetValue('index');
		if (!result) {
			await this._setIndex([]);
			result = [];
		}
		return result;
	}

	/**
	 * Gets all keys from the storage medium within current namespace.
	 * Mainly used for unit testing.
	 * @return {array} index - Array of keys.
	 * @private
	 */
	_getKeys = async () => {
		if (!this._getAllKeys) {
			this.throwError('Storage medium does not support _getAllKeys');
			return;
		}
		const re = new RegExp('^' + this.name + '-');
		let keys = await this._getAllKeys();
		keys = _.filter(keys, (key) => key.match(re));
		keys = _.map(keys, (key) => key.replace(re, ''));
		return keys;
	}

	/**
	 * Overwrites the index in the storage medium.
	 * @param {array} index - Array of ids.
	 * @private
	 */
	_setIndex = async (index) => {
		if (!_.isEqual(this._index, index)) {
			this._index = index;
			return await this._storageSetValue('index', index);
		}
		return;
	}

	
	/**
	 * Gets a value from storage medium.
	 * @param {string} name - The name of the value
	 * @return {any} value - The value to retrieve.
	 * @private
	 * @abstract
	 */
	_storageGetValue = async (name) => {
		this.throwError('this._storageGetValue must be implemented by OfflineRepository subclass.');
		return;
	}

	/**
	 * Sets a value in storage medium.
	 * @param {string} name - The name of the value
	 * @param {any} value - The value to save.
	 * @private
	 * @abstract
	 */
	_storageSetValue = async (name, value) => {
		this.throwError('this._storageSetValue must be implemented by OfflineRepository subclass.');
		return;
	}

	/**
	 * Deletes a value in storage medium.
	 * @param {string} name - The name of the value
	 * @private
	 * @abstract
	 */
	_storageDeleteValue = async (name) => {
		this.throwError('this._storageDeleteValue must be implemented by OfflineRepository subclass.');
		return;
	}

	/**
	 * Helper function, in case storage medium
	 * does not have its own namespacing implementation
	 * @param {string|array} name - The name or an array of names to get
	 * @return {string|array} namespacedName - The namespaced name(s)
	 */
	_namespace(name) {
		if (_.isArray(name)) {
			return _.map(name, (key) => this.schema.name + '-' + key);
		}
		return this.schema.name + '-' + name;	
	}

	/**
	 * Gets the date when this Repository was last synced with remote
	 * (when this is the "local" side of at LocalFromRemoteRepository)
	 * @return {moment} lastSync
	 */
	getLastSync = async () => {
		const dateStr = await this._storageGetValue(LAST_SYNC);
		if (!_.isNil(dateStr)) {
			const date = moment(dateStr);
			if (date.isValid()) {
				return date;
			}
		}
		return null;
	}

	/**
	 * Sets the date when this Repository was last synced with remote.
	 * Used when this is the "local" side of a LocalFromRemoteRepository
	 * @param {date} lastSync
	 */
	setLastSync = async (date) => {
		await this._storageSetValue(LAST_SYNC, date);
	}


	/**
	 * Clears the date when this Repository was last synced with remote.
	 * Used when this is the "local" side of a LocalFromRemoteRepository
	 */
	clearLastSync = async () => {
		await this._storageDeleteValue(LAST_SYNC);
	}

};

OfflineRepository.className = 'Offline';
OfflineRepository.type = 'offline';

export default OfflineRepository;