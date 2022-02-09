/** @module Repository */

import Repository from './Repository';
import ReaderTypes from '../Reader';
import WriterTypes from '../Writer';
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
			
		};
		_.merge(this, defaults, config);

		/**
		 * @member {boolean} allowsMultiSort - Whether to allow >1 sorter
		 */
		this.allowsMultiSort = false;

		/**
		 * @member {Object} _params - Object of query params to submit to server
		 * @private
		 */
		this._params = {};
		
		this._operations = {
			add: false,
			edit: false,
			delete: false,
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
		if (this.autoSort) {
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
				paramsToChange[first] = [];
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
		
		if (matches) { // name has array notation like 'conditions[username]'
			const first = matches[1],
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
		if (reload && this.isLoaded) {
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
		
		if (this.isLoaded) {
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

		if (this.isLoaded) {
			return this.reload();
		}
	}

	/**
	 * Sets pagination params.
	 * Refreshes entities.
	 */
	_onChangePagination = () => {
		this.setBaseParam(this.paramPageNum, this.page);
		this.setBaseParam(this.paramPageSize, this.pageSize);

		if (this.isLoaded) {
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
	 * @fires beforeLoad,changeData,load,error
	 */
	load = async (params) => {
		if (this.isDestroyed) {
			throw Error('this.load is no longer valid. Repository has been destroyed.');
		}
		if (!this.api.get) {
			throw new Error('No "get" api endpoint defined.');
		}
		this.emit('beforeLoad'); // TODO: canceling beforeLoad will cancel the load operation
		this.isLoading = true;


		if (!_.isNil(params) && _.isObject(params)) {
			this.setParams(params);
		}
		
		if (this.debugMode) {
			console.log('loading ' + this.name, params);
		}

		const repository = this;
		const data = _.merge({}, this._baseParams, this._params);
		
		return this._send(this.methods.get, this.api.get, data)
					.then(result => {
						if (this.debugMode) {
							console.log('load result ' + this.name, result);
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

						this._destroyEntities();

						// Set the current entities
						this.entities = _.map(root, (data) => {
							const entity = Repository._createEntity(this.schema, data, repository, true);
							this._relayEntityEvents(entity);
							return entity;
						});
				
						// Set the total records that pass filter
						this.total = total;
						this._setPaginationVars();
				
						this.isLoading = false;
						this.isLoaded = true;
						this.emit('changeData', this.entities);
						this.emit('load', this);
					})
					.finally(() => {
						this.isLoading = false;
					});
	}

	/**
	 * Reload a single entity from storage. 
	 * If the entity is in the internal representation, update it.
	 * @returns {entity} The newly updated entity
	 * @fires reloadEntity,beforeLoad,changeData,load,error
	 */
	reloadEntity = async (entity) => {
		if (this.isDestroyed) {
			throw Error('this.reloadEntity is no longer valid. Repository has been destroyed.');
		}
		if (!this.api.get) {
			throw new Error('No "get" api endpoint defined.');
		}
		this.emit('beforeLoad'); // TODO: canceling beforeLoad will cancel the load operation
		this.isLoading = true;

		const params = this._getReloadEntityParams(entity);
		if (this.debugMode) {
			console.log('reloadEntity ' + entity.id, params);
		}
		
		return this._send(this.methods.get, this.api.get, params)
					.then(result => {
						if (this.debugMode) {
							console.log('reloadEntity result ' + entity.id, result);
						}
						
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						if (!success) {
							throw Error(message);
						}

						const updatedData = root[0];
						entity.loadOriginalData(updatedData, true);
						entity.emit('reload', entity);
						
						this.isLoading = false;
						this.isLoaded = true;
						this.emit('changeData', this.entities);
						this.emit('load', this);
						this.emit('reloadEntity', entity);
					})
					.finally(() => {
						this.isLoading = false;
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
		};
	}

	/**
	 * Helper for save.
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doAdd(entity) { // standard function notation
		if (!this.api.add) {
			throw new Error('No "add" api endpoint defined.');
		}

		this._operations.add = true;

		const method = this.methods.add,
			url = this.api.add,
			data = entity.getSubmitValues();

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.add + ' result', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						if (!success) {
							throw new Error(message);
						}

						entity.loadOriginalData(root[0]);
					});
	}

	/**
	 * Helper for save.
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doEdit(entity) { // standard function notation
		if (!this.api.edit) {
			throw new Error('No "edit" api endpoint defined.');
		}

		this._operations.edit = true;

		const method = this.methods.edit,
			url = this.api.edit,
			data = entity.getSubmitValues();

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.edit + ' result', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);

						if (!success) {
							throw new Error(message);
						}

						entity.loadOriginalData(root[0]);
					});
	}

	/**
	 * Helper for save.
	 * @returns {promise} - Axios Promise.
	 * @private
	 */
	_doDelete(entity) { // standard function notation
		if (!this.api.delete) {
			throw new Error('No "delete" api endpoint defined.');
		}

		this._operations.delete = true;

		const method = this.methods.delete,
			url = this.api.delete,
			data = { id: entity.id, };

		return this._send(method, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log(this.api.delete + ' result', result);
						}
						const {
							root,
							success,
							total,
							message
						} = this._processServerResponse(result);
						
						if (!success) {
							throw new Error(message);
						}

						// Delete it from this.entities
						const id = entity.id;
						this.entities = _.omitBy(this.entities, (entity) => entity.id === id);
						entity.destroy();
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

		return true;
	}

	/**
	 * Helper for _do* save operations.
	 * Fires off axios request to server
	 * @private
	 */
	_send = (method, url, data) => {

		if (!url) {
			throw new Error('No url submitted');
		}

		const options = {
				url,
				method,
				baseURL: this.api.baseURL,
				transformResponse: null,
				headers: this.headers,
				params: method === 'GET' ? data : null,
				data: method !== 'GET' ? qs.stringify(data) : null,
				timeout: this.timeout,
			};
		
		if (this.debugMode) {
			console.log(url, options);
		}
		
		return this.axios(options)
					.catch(error => {
						if (this.debugMode) {
							console.log(url + ' error', error);
							console.log('response:', error.response);
						}
						this.emit('error', error);
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
		return this.axios.all(promises)
			.then(this.axios.spread((...batchOperationResults) => {
				// All requests are now complete

				this.isSaving = false;
				this.emit('save', batchOperationResults);

				// Do we need to reload?
				if (this._operations.add || this._operations.delete) {
					this.reload();
				} else {
					this.emit('changeData', this.entities);
				}
			}));
	}

}

AjaxRepository.className = 'Ajax';
AjaxRepository.type = 'ajax';

export default AjaxRepository;