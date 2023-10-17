/** @module Repository */

import Repository from './Repository.js';
import ReaderTypes from '../Reader/index.js';
import WriterTypes from '../Writer/index.js';
import axios from 'axios';
import qs from 'qs';
import _ from 'lodash';

/**
 * Class represents a Repository that stores its data on a remote server,
 * through HTTP requests. 
 * 
 * @extends Repository
 */
class AjaxRepository extends Repository {
	constructor(config = {}) {
		super(...arguments);

		const defaults = {

			isRemote: true,
			isRemoteFilter: true,
			isRemoteSort: true,
			isPaginated: true,

			/**
			 * @member {object} api - List of relative URIs to API endpoints.
			 */
			api: {
				get: null,
				add: null,
				edit: null,
				delete: null,
				batchAdd: null,
				batchEdit: null,
				batchDelete: null,
				baseURL: '', // e.g. 'https://example.com/myapp/'
			},

			/**
			 * @member {object} methods - List of methods for all four CRUD operations
			 */
			methods: {
				get: 'GET',
				add: 'POST',
				edit: 'POST',
				delete: 'POST',
			},

			/**
			 * @member {string|object} reader - Reader. Options: json|xml
			 */
			reader: 'json',

			/**
			 * @member {string|object} writer - Writer. Options: json|xml
			 */
			writer: 'json',

			/**
			 * @member {string} paramPageNum - Parameter name for currentl page number
			 */
			paramPageNum: 'page',

			/**
			 * @member {string} paramPageSize - Parameter name for current page size
			 */
			paramPageSize: 'limit',

			/**
			 * @member {string} paramSort - Parameter name for sorting property
			 */
			paramSort: 'order',

			/**
			 * @member {string} paramSort - Parameter name for sorting direction
			 */
			paramDirection: 'dir',

			/**
			 * @member {integer} timeout - Number of milliseconds to wait before canceling request
			 */
			timeout: 4000,

			/**
			 * @member {Object} headers - Object of headers to submit to server on every request
			 * @private
			 */
			headers: {},

			/**
			 * @member {object} _baseParams - Params that will be applied to every request
			 */
			_baseParams: {},

			/**
			 * @member {boolean} isOnline - Whether the remote storage medium is available.
			 * This must be managed by outside software, calling setIsOnline at appropriate times.
			 * @private
			 */
			isOnline: true,
			
		};
		_.merge(this, defaults, config);

		/**
		 * @member {boolean} allowsMultiSort - Whether to allow >1 sorter
		 */
		this.allowsMultiSort = false;

		/**
		 * @member {object} lastSendOptions - Last options sent to server
		 */
		this.lastSendOptions = null;

		/**
		 * @member {Object} _params - Object of query params to submit to server
		 * @private
		 */
		this._params = {};
		
		this._operations = {
			add: false,
			edit: false,
			delete: false,
			deletePhantom: false,
		};

	}

	async initialize() {

		this.registerEvents([
			'beforeLoad',
		]);

		// Respond to Repository events
		this.on('beforeSave', this._onBeforeSave);


		// Create Reader
		let readerConfig;
		if (this.reader && this.reader.type) {
			readerConfig = this.reader;
		} else if (_.isString(this.reader)) {
			readerConfig = {
				type: this.reader,
			};
		}
		if (readerConfig && ReaderTypes[readerConfig.type]) {
			const Reader = ReaderTypes[readerConfig.type];
			this.reader = new Reader(readerConfig);
		} else {
			this.reader = null;
		}

		// Create Writer
		let writerConfig;
		if (this.writer && this.writer.type) {
			writerConfig = this.writer;
		} else if (_.isString(this.writer)) {
			writerConfig = {
				type: this.writer,
			};
		}
		if (writerConfig && WriterTypes[writerConfig.type]) {
			const Writer = WriterTypes[writerConfig.type];
			this.writer = new Writer(writerConfig);
		} else {
			this.writer = null;
		}

		// Initialize query params
		this._setInitialQueryParams();

		await super.initialize();
	}

	/**
	 * Convenience alias so subclasses can have direct access to Axios.
	 * this.sendDirect()
	 */
	axios = axios;

	/**
	 * Helper for initialize
	 * Sets the query params for initial loading
	 */
	_setInitialQueryParams = () => {
		// Pagination
		if (this.isPaginated) {
			this._onChangePagination();
		}

		// Sorting
		if (this.isAutoSort) {
			if (!this.sorters.length) {
				this.sorters = this.getDefaultSorters(); // Need this here, because _setInitialQueryParams() runs before this.load() in super.initialize()
			}
			this._onChangeSorters();
		}
	}
	

	//     ____
	//    / __ \____ __________ _____ ___  _____
	//   / /_/ / __ `/ ___/ __ `/ __ `__ \/ ___/
	//  / ____/ /_/ / /  / /_/ / / / / / (__  )
	// /_/    \__,_/_/   \__,_/_/ /_/ /_/____/

	/**
	 * Sets a single query param.
	 * @param {string} name - Param name to set.
	 * @param {any} value - Param value to set.
	 * @param {boolean} isBaseParam - Whether param is a base param (to be sent on every request).
	 */
	setParam = (name, value, isBaseParam = false) => {
		const re = /^([^\[]+)\[([^\]]+)\](.*)$/,
			matches = name.match(re),
			paramsToChange = isBaseParam ? this._baseParams : this._params;
		
		if (matches) { // name has array notation like 'conditions[username]'
			const first = matches[1],
				second = matches[2];
			if (paramsToChange && !paramsToChange.hasOwnProperty(first)) {
				paramsToChange[first] = {};
			}
			if (_.isNil(value) && paramsToChange[first] && paramsToChange[first].hasOwnProperty(second)) {
				delete paramsToChange[first][second];
				return;
			}
			paramsToChange[first][second] = value;
			return;
		}
		if (_.isNil(value) && paramsToChange && paramsToChange.hasOwnProperty(name)) {
			delete paramsToChange[name];
			return;
		}
		paramsToChange[name] = value;
	}

	/**
	 * Same as setParam, but without any value
	 * Sets a single query param.
	 * @param {string} name - Param name to set.
	 * @param {boolean} isBaseParam - Whether param is a base param (to be sent on every request).
	 */
	setValuelessParam = (name, isBaseParam = false) => {
		const re = /^([^\[]+)\[([^\]]+)\](.*)$/,
			matches = name.match(re),
			paramsToChange = isBaseParam ? this._baseParams : this._params;
		
		let first, second;
		if (matches) { // name has array notation like 'conditions[username]'
			first = matches[1],
			second = matches[2];
			if (paramsToChange && !paramsToChange.hasOwnProperty(first)) {
				paramsToChange[first] = [];
			}
			if (paramsToChange[first] && paramsToChange[first].hasOwnProperty(second)) {
				delete paramsToChange[first][second];
				return;
			}
			paramsToChange[first][ paramsToChange[first].length ] = second;
			return;
		}
		paramsToChange[paramsToChange.length] = second;
	}

	/**
	 * Sets query params
	 * @param {object} params - Params to set. Key is parameter name, value is parameter value
	 */
	setParams = (params) => {
		_.each(params, (value, name) => {
			this.setParam(name, value);
		});
	}

	/**
	 * Determines if base query param exists
	 * @param {string} name - Param name
	 */
	hasBaseParam = (name) => {
		return this._baseParams.hasOwnProperty(name);
	}

	/**
	 * Determines if query param exists
	 * @param {string} name - Param name
	 */
	hasParam = (name) => {
		return this._params.hasOwnProperty(name);
	}

	/**
	 * Sets base query param
	 * @param {string} name - Param name to set.
	 * @param {any} value - Param value to set.
	 */
	setBaseParam = (name, value) => {
		this.setParam(name, value, true);
	}

	/**
	 * Sets base query params. These params are sent on every request.
	 * @param {object} params - Base params to set. Key is parameter name, value is parameter value
	 */
	setBaseParams = (params) => {
		_.each(params, (value, name) => {
			this.setBaseParam(name, value);
		});
	}

	/**
	 * Manually clears all (non-base) params including filtering.
	 * *Not intended for normal usage,* but rather for testing.
	 * @param {boolean} reload - Whether to reload repository. Defaults to false.
	 */
	clearParams = (reload = false, clearBase = false) => {
		this._params = {};
		if (clearBase) {
			this._baseParams = {};
		}
		if (reload && this.isLoaded && !this.eventsPaused) {
			return this.reload();
		}
	}

	/**
	 * Sets sort and direction params.
	 * Only one sorter is allowed with this Repository type.
	 * Refreshes entities.
	 */
	_onChangeSorters = () => {
		const sorter = this.sorters[0];
		this.setBaseParam(this.paramSort, sorter.name);
		this.setBaseParam(this.paramDirection, sorter.direction);
		
		if (this.isLoaded && !this.eventsPaused) {
			return this.reload();
		}
	}

	/**
	 * Sets filter params.
	 * Refreshes entities.
	 */
	_onChangeFilters = () => {
		_.each(this.filters, (value, name) => {
			this.setParam(name, value);
		});

		if (this.isLoaded && !this.eventsPaused) {
			return this.reload();
		}
	}

	/**
	 * Sets pagination params.
	 * Refreshes entities.
	 */
	_onChangePagination = () => {
		this.setBaseParam(this.paramPageNum, this.isPaginated ? this.page : null);
		this.setBaseParam(this.paramPageSize, this.isPaginated ? this.pageSize : null);

		if (this.isLoaded && !this.eventsPaused) {
			return this.reload();
		}
	}
	

	//    __________  __  ______
	//   / ____/ __ \/ / / / __ \
	//  / /   / /_/ / / / / / / /
	// / /___/ _, _/ /_/ / /_/ /
	// \____/_/ |_|\____/_____/

	/**
	 * Loads data into the Repository.
	 * This loads only a single page of data.
	 * @param {object} params - Params to send to server
	 * @param {function} callback - Function to call after loading is complete
	 * @fires beforeLoad,changeData,load,error
	 */
	load = async (params, callback = null) => {
		if (this.isTree && this.getRootNodes) {
			return this.getRootNodes();
		}
		if (this.isDestroyed) {
			this.throwError('this.load is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.api.get) {
			this.throwError('No "get" api endpoint defined.');
			return;
		}
		this.emit('beforeLoad'); // TODO: canceling beforeLoad will cancel the load operation
		this.markLoading();

		if (params?.showMore) {
			delete params.showMore;
			this.isShowingMore = true;
		} else {
			this.isShowingMore = false;
		}
		if (this.isShowingMore) {
			this.pauseEvents();
			this.setPage(this.page +1);
			this.resumeEvents();
		}

		if (!_.isNil(params) && _.isObject(params)) {
			this.setParams(params);
		}

		const repository = this;
		const data = _.merge({}, this._baseParams, this._params);
		
		return this._send(this.methods.get, this.api.get, data)
					.then(result => {
						if (this.debugMode) {
							console.log('Response for ' + this.name, result);
						}

						if (this.isDestroyed) {
							// If this repository gets destroyed before it has a chance
							// to process the Ajax request, just ignore the response.
							return;
						}
						
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						if (this.isShowingMore) {
							// Add to the current entities
							const newEntities = _.map(root, (data) => {
								const entity = Repository._createEntity(this.schema, data, repository, true);
								this._relayEntityEvents(entity);
								return entity;
							});
							this.entities = this.entities.concat(newEntities);
						} else {
							// Replace the current entities
							this._destroyEntities();
							this.entities = _.map(root, (data) => {
								const entity = Repository._createEntity(this.schema, data, repository, true);
								this._relayEntityEvents(entity);
								return entity;
							});
						}
				
						// Set the total records that pass filter
						this.total = total;
						this._setPaginationVars();

						this.markLoaded();

						if (this.isTree) {
							this.assembleTreeNodes();
						}
						this.emit('changeData', this.entities);
						this.emit('load', this);

						if (callback) {
							callback(this.entities);
						}
					})
					.finally(() => {
						this.markLoading(false);
					});
	}

	showMore = (params = {}, callback) => {
		params.showMore = true;
		return this.load(params, callback);
	}

	/**
	 * Reload a single entity from storage. 
	 * If the entity is in the internal representation, update it.
	 * @param {function} callback - Function to call after loading is complete
	 * @returns {entity} The newly updated entity
	 * @fires reloadEntity,beforeLoad,changeData,load,error
	 */
	reloadEntity = async (entity, callback = null) => {
		if (this.isDestroyed) {
			this.throwError('this.reloadEntity is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.api.get) {
			this.throwError('No "get" api endpoint defined.');
			return;
		}
		this.emit('beforeLoad'); // TODO: canceling beforeLoad will cancel the load operation
		this.markLoading();

		const params = this._getReloadEntityParams(entity);
		if (this.debugMode) {
			console.log('reloadEntity ' + entity.id, params);
		}
		
		return this._send(this.methods.get, this.api.get, params)
					.then(result => {
						if (this.debugMode) {
							console.log('reloadEntity response ' + entity.id, result);
						}
						
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						if (!success) {
							this.throwError(message);
							return;
						}

						const updatedData = root[0];
						entity.loadOriginalData(updatedData);
						entity.emit('reload', entity);
						
						this.markLoaded();

						this.emit('changeData', this.entities);
						this.emit('load', this);
						this.emit('reloadEntity', entity);

						if (callback) {
							callback(entity);
						}
					})
					.finally(() => {
						this.markLoading(false);
					});
		
	}
	
	/**
	 * Helper for reloadEntity.
	 * Subclasses may override this to provide additional 
	 * or differing functionality.
	 * @private
	 */
	_getReloadEntityParams(entity) {
		const params = {
			id: entity.id,
		};
		return _.assign({}, this._baseParams, params);
	}

	/**
	 * Helper for save.
	 * @private
	 */
	_onBeforeSave = () => {
		this._operations = {
			add: false,
			edit: false,
			delete: false,
			deletePhantom: false,
		};
	}

	/**
	 * Helper for save.
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doAdd(entity) { // standard function notation
		if (!this.api.add) {
			this.throwError('No "add" api endpoint defined.');
			return;
		}

		this._operations.add = true;
		entity.isSaving = true;

		const
			method = this.methods.add,
			url = this.api.add,
			data = entity.getSubmitValues();

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.add + ' response', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						entity.isSaving = false;

						if (!success) {
							this.throwError(message);
							return;
						}

						entity.loadOriginalData(root[0]);
						if (entity.isRemotePhantomMode) {
							entity.isRemotePhantom = true;
						}

						if (this.isTree) {
							this.assembleTreeNodes();
						}
					});
	}
	
	/**
	 * Helper for save.
	 * Add multiple entities to storage medium
	 * @param {array} entities - Entities
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doBatchAdd(entities) { // standard function notation
		if (!this.api.batchAdd) {
			this.throwError('No "batchAdd" api endpoint defined.');
			return;
		}

		this._operations.add = true;

		const
			method = this.methods.add,
			url = this.api.batchAdd,
			data = {
				entities: _.map(entities, entity => {
					const values = entity.submitValues;
					entity.isSaving = true;
					return values;
				}),
			};

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.batchAdd + ' response', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						_.each(entities, (entity) => {
							entity.isSaving = false;
						});

						if (!success) {
							this.throwError(message);
							return;
						}

						// Reload each entity with new data
						// TODO: Check this
						_.each(entities, (entity, ix) => {
							entity.loadOriginalData(root[ix]);
							if (entity.isRemotePhantomMode) {
								entity.isRemotePhantom = true;
							}
						});

						if (this.isTree) {
							this.assembleTreeNodes();
						}
					});
	}

	/**
	 * Helper for save.
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doEdit(entity) { // standard function notation
		if (!this.api.edit) {
			this.throwError('No "edit" api endpoint defined.');
			return;
		}

		this._operations.edit = true;
		entity.isSaving = true;

		const
			method = this.methods.edit,
			url = this.api.edit,
			data = entity.getSubmitValues();

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.edit + ' response', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						entity.isSaving = false;

						if (!success) {
							this.throwError(message);
							return;
						}

						entity.loadOriginalData(root[0]);
						if (entity.isRemotePhantomMode && entity.isRemotePhantom) {
							entity.isRemotePhantom = false;
						}

						if (this.isTree) {
							this.assembleTreeNodes();
						}
					});
	}

	/**
	 * Helper for save.
	 * Edit multiple entities in storage medium
	 * @param {array} entities - Entities
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doBatchEdit(entities) { // standard function notation
		if (!this.api.batchEdit) {
			this.throwError('No "batchEdit" api endpoint defined.');
			return;
		}

		this._operations.edit = true;

		const
			method = this.methods.edit,
			url = this.api.batchEdit,
			data = {
				entities: _.map(entities, entity => {
					const values = entity.submitValues;
					entity.isSaving = true;
					return values;
				}),
			};

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.batchEdit + ' response', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						_.each(entities, (entity) => {
							entity.isSaving = false;
						});

						if (!success) {
							this.throwError(message);
							return;
						}

						// Reload each entity with new data
						// TODO: Check this
						_.each(entities, (entity, ix) => {
							entity.loadOriginalData(root[ix]);
							if (entity.isRemotePhantomMode && entity.isRemotePhantom) {
								entity.isRemotePhantom = false;
							}
						});

						if (this.isTree) {
							this.assembleTreeNodes();
						}
					});
	}

	/**
	 * Helper for save.
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doDelete(entity) { // standard function notation
		if (!this.api.delete) {
			this.throwError('No "delete" api endpoint defined.');
			return;
		}

		if (entity.isRemotePhantomMode && entity.isPhantom) {
			this._operations.deletePhantom = true;
		} else {
			this._operations.delete = true;
		}
		entity.isSaving = true;

		const
			method = this.methods.delete,
			url = this.api.delete,
			data = {
				id: entity.id,
			};

		if (this.isTree && this.moveSubtreeUp) {
			data.moveSubtreeUp = this.moveSubtreeUp;
		}

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.delete + ' response', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						entity.isSaving = false;
						
						if (!success) {
							this.throwError(message);
							return;
						}

						// Delete it from this.entities
						const id = entity.id;
						this.entities = _.filter(this.entities, (entity) => entity.id !== id);
						entity.destroy();

						if (this.isTree) {
							this.assembleTreeNodes();
						}
					});
	}

	/**
	 * Helper for save.
	 * Delete multiple entities from storage medium
	 * @param {array} entities - Entities
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doBatchDelete(entities) { // standard function notation
		if (!this.api.batchDelete) {
			this.throwError('No "batchDelete" api endpoint defined.');
			return;
		}

		this._operations.delete = true; // NOTE: We don't use batchDelete for remotePhantom records

		const
			method = this.methods.delete,
			url = this.api.batchDelete,
			ids = _.map(entities, (entity) => {
				entity.isSaving = true;
				return entity.id;
			}),
			data = { ids, };

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.batchDelete + ' response', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);
						
						_.each(entities, (entity) => {
							entity.isSaving = false;
						});

						if (!success) {
							this.throwError(message);
							return;
						}

						// Delete it from this.entities
						this.entities = _.filter(this.entities, (entity) => {
							const deleteIt = ids.includes(entity.id);
							if (deleteIt) {
								entity.destroy();
							}
							return !deleteIt;
						});

						if (this.isTree) {
							this.assembleTreeNodes();
						}
					});
	}

	/**
	 * Helper for save.
	 * Tells repository to delete entity without ever having saved it 
	 * to storage medium
	 * @private
	 */
	_doDeleteNonPersisted(entity) {
		this.entities = _.filter(this.entities, (item) => {
			const match = item === entity;
			if (match) {
				entity.destroy();
			}
			return !match;
		});

		if (this.isTree) {
			this.assembleTreeNodes();
		}

		return true;
	}

	/**
	 * Helper for _do* save operations.
	 * Fires off axios request to server
	 * @private
	 */
	_send = (method, url, data) => {

		if (!url) {
			this.throwError('No url submitted');
			return;
		}

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const headers = _.merge({
							'Content-Type': 'application/json',
							'Accept': 'application/json',
						}, this.headers);

		const options = {
				url,
				method,
				baseURL: this.api.baseURL,
				transformResponse: null,
				headers,
				params: method === 'GET' ? data : null,
				data: method !== 'GET' ? qs.stringify(data) : null,
				timeout: this.timeout,
			};
		
		if (this.debugMode) {
			console.log(url, options);
		}
		
		this.lastSendOptions = options;
		
		return this.axios(options)
					.catch(error => {
						if (this.debugMode) {
							console.log(url + ' error', error);
							console.log('response:', error.response);
						}
						this.throwError(error);
						return;
					});
	}

	/**
	 * Helper for _send.
	 * Handles server's response to _send().
	 * This is basically just looking for errors.
	 * @fires error
	 * @private
	 */
	_processServerResponse = (result) => {
		return this.reader.read(result);
	}

	/**
	 * Sorts the items in the current page of memory
	 * This is mainly used to sort isPhantom entities,
	 * since the server normally sorts, and they haven't yet gone to server.
	 */
	sortInMemory = () => {
		const sorters = this.sorters;
		let sortNames = [],
			sortDirections = [];
		_.each(sorters, (sorter) => {
			sortNames.push(sorter.name);
			sortDirections.push(sorter.direction.toLowerCase());
		});
		let entities = this.entities;
		entities = _.orderBy(entities, sortNames, sortDirections);
		this.entities = entities;
	}

	/**
	 * Helper for save.
	 * Takes an array of Promises from axios. When they are all resolved,
	 * emit save.
	 * @param {array} promises - Results of batch operations
	 * @fires save, changeData
	 * @private
	 */
	_finalizeSave = (promises) => {
		if (!promises.length) {
			return;
		}
		return Promise.all(promises)
						.then(this.axios.spread((...batchOperationResults) => {
							// All requests are now complete

							this.isSaving = false;
							this.emit('save', batchOperationResults);

							// Do we need to reload?
							if (!this.eventsPaused) {
								if (this.isTree) {
									this.assembleTreeNodes();
									this.emit('changeData', this.entities);
								} else if (this.isRemotePhantomMode && (this._operations.add || this._operations.deletePhantom)) {
									// Do nothing, as we don't want to immediately reload on add for a remote phantom mode record. It won't appear, and it will cause all kinds of trouble!
									if (this._operations.deletePhantom) {
										// sweep existing deleted records and remove them
										_.each(this.entities, (entity) => {
											if (entity.isDeleted && entity.isDestroyed) {
												this.removeEntity(entity);
											}
										})
									}
								} else if (this._operations.add || this._operations.delete) {
									this.reload();
								} else {
									this.emit('changeData', this.entities);
								}
							}
						}));
	}

	setIsOnline = (isOnline) => {
		this.isOnline = !!isOnline; // force convert type to boolean
	}

}

AjaxRepository.className = 'Ajax';
AjaxRepository.type = 'ajax';

export default AjaxRepository;