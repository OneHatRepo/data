/** @module Repository */

import AjaxRepository from './Ajax.js';
import qs from 'qs';
import _ from 'lodash';

const nonConditionFilters = [
	'q',
	'hydrate',
	'fields',
	'distinct',
	'leftJoinWith',
	'innerJoin',
	'join',
	'where',
	'matching',
	'groupBy',
	'contain',
	'order',
	'limit',
	'page',
];

/**
 * This class contains overrides of specific functions in
 * AjaxRepository that are unique to OneBuild.
 * 
 * @extends AjaxRepository
 */
class OneBuildRepository extends AjaxRepository {
	constructor(config = {}) {
		super(...arguments);

		const defaults = {

			isAutoLoad: false,
			isAutoSave: false,

			api: {
				get: 'get',
				add: 'add',
				edit: 'edit',
				delete: 'delete',
				batchAdd: 'batchAdd',
				batchEdit: 'batchEdit',
				batchDelete: 'batchDelete',
				reorder: 'reorder',
				duplicate: 'duplicate',
				getLastModifiedDate: 'getLastModifiedDate',
			},

			methods: {
				// get: 'POST',
			},
			
			rootProperty: 'data',
			successProperty: 'success',
			totalProperty: 'total',
			messageProperty: 'message',

			allowsMultiSort: true,
			// batchAsSynchronous: true, // Add directly to schema for now
			// combineBatch: true,

			// writer: {
			// 	type: 'json',
			// 	asForm: true,
			// 	writeAllFields: true,
			// },

			queryParam: 'q', // General-purpose query/searching parameter
			allQuery: 'getAll', // For getting all results. Basically, nullifies queryParam on backend

		};
		_.merge(this, defaults, config);

		/**
		 * @member {boolean} allowsMultiSort - Whether to allow >1 sorter
		 */
		this.allowsMultiSort = true;

	}

	async initialize() {

		this.registerEvents([
			'logout',
		]);

		await super.initialize();
	}

	/**
	 * Override parent so we can emit 'logout' event on 401 error
	 * 
	 * Helper for _do* save operations.
	 * Fires off axios request to server
	 * @private
	 */
	_send(method, url, data, headers) {

		if (!url) {
			this.throwError('No url submitted');
			return;
		}

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const mergedHeaders = _.merge({
							// 'Content-Type': 'application/json', // Stops axios from using 'application/x-www-form-urlencoded'
							Accept: 'application/json',
						}, this.headers, headers);

		const options = {
				url,
				method,
				baseURL: this.api.baseURL,
				transformResponse: null,
				headers: mergedHeaders,
				params: method === 'GET' ? data : null,
				data: method !== 'GET' ? qs.stringify(data) : null,
				timeout: this.timeout,
			};
		
		if (this.debugMode) {
			console.log('Sending ' + url, options);
		}
		
		this.lastSendOptions = options;
		
		return this.axios(options)
					.catch(error => {
						if (this.debugMode) {
							console.log(url + ' error', error);
							console.log('response:', error.response);
						}
						// BEGIN MOD
						if (error && error.response && error.response.status === 401) {
							this.emit('logout');
							console.log('logout');
							return false;
						}
						// END MOD
						
						this.throwError(error);
						return;
					});
	}

	/**
	 * Helper for reloadEntity.
	 * @private
	 */
	_getReloadEntityParams(entity) {
		const params = { conditions: {}, };
		params.conditions[entity.schema.name + '.id'] = entity.id;
		return params;
	}

	/**
	 * Sets "conditions" param.
	 * OneBuild uses a single, multi-dimentional param for filtering.
	 * Refreshes entities.
	 */
	_onChangeFilters() {
		// Clear existing "conditions" params
		if (!_.isEmpty(this._params)) {
			this._params = _.omitBy(this._params, (value, key) => {
				return key.match(/^conditions/) || _.includes(nonConditionFilters, key);
			});
		}

		const oThis = this;
		_.each(this.filters, (filter, ix) => {
			if (_.includes(nonConditionFilters, filter.name)) {
				oThis.setParam(filter.name, filter.value);
			} else {
				oThis.setParam('conditions[' + filter.name + ']', filter.value);
			}
		});

		if (this.isAutoLoad && this.isLoaded && !this.eventsPaused) {
			if (this.isTree) {
				return this.loadRootNodes(1);
			} else {
				return this.reload();
			}
		}
	}

	/**
	 * Sets "order" param.
	 * OneBuild uses a single order param, rather than separate name & direction params.
	 * Refreshes entities.
	 */
	_onChangeSorters() {
		let sorterStrings = [];
		_.each(this.sorters, (sorter) => {
			sorterStrings.push(sorter.name + ' ' + sorter.direction);
		});

		if (!_.isEmpty(sorterStrings)) {
			this.setBaseParam('order', sorterStrings.join(','));
		}
		
		if (!this.eventsPaused) {
			if (this.isLoaded && this.isAutoLoad) {
				if (this.isTree) {
					return this.loadRootNodes(1).then(() => {
						this.emit('changeSorters');
					});
				} else {
					return this.reload().then(() => {
						this.emit('changeSorters');
					});
				}
			} else {
				this.emit('changeSorters');
			}
		}
	}

	/**
	 * Helper for _send.
	 * Handles server's response to _send().
	 * This is basically just looking for errors.
	 * @fires error
	 * @private
	 */
	_processServerResponse(result) {

		const retNull = {
			root: null,
			success: false,
			total: 0,
			message: null,
		};

		if (result === false) { // e.g. 401 error
			return retNull;
		}

		// use try/catch in case the response is not JSON
		let response;
		try {
			response = _.isPlainObject(result.data) ? result.data : this.reader.read(result.data);
		} catch(e) {
			return retNull;
		}

		const
			root = response[this.rootProperty],
			success = response[this.successProperty],
			total = response[this.totalProperty],
			message = response[this.messageProperty];
		
		if (message === 'You do not have authorization to access this area.') {
			this.emit('logout');
		}

		if (!success) {
			this.throwError(message, root);
		}

		return {
			root,
			success,
			total,
			message
		};
	}

	
	/**
	 * Integrates with RestTrait::reorder in OneBuild API
	 * @param {entity|array} dragRecordOrIds - which entity or ids were being dragged
	 * @param {entity} dropRecord - which entity it was dropped on to
	 * @param {string} dropPosition - position in which it was dropped; could be 'before' or 'after'
	 * @return {Promise}
	 */
	reorder(dragRecordOrIds, dropRecord, dropPosition) {

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		let ids;
		if (_.isArray(dragRecordOrIds)) {
			ids = dragRecordOrIds;
		} else if (dragRecordOrIds?.id) {
			ids = [dragRecordOrIds.id];
		} else {
			throw Error('dragRecordOrIds must be an entity or array of ids')
		}

		const data = {
			url: this._getModel() + '/' + this.api.reorder,
			data: qs.stringify({
				ids,
				dropPosition,
				dropRecord_id: dropRecord.id,
			}),
			method: 'POST',
			baseURL: this.api.baseURL,
		};

		if (this.debugMode) {
			console.log('reorder', data);
		}

		return this.axios(data)
			.then((result) => {
				if (this.debugMode) {
					console.log('reorder response', result);
				}

				const response = result.data;
				if (!response.success) {
					this.throwError(response.data);
					return;
				}

				// Reload the repository, so updated sort_order values can be retrieved
				this.reload();

			});
	}

	async remoteDuplicate(entity) {
		
		this.markLoading();

		const
			url = this._getModel() + '/' + this.api.duplicate,
			id = entity.id,
			result = await this._send('POST', url, { id });
		
		if (!result) {
			this.markLoading(false);
			this.throwError('error duplicating on server');
			return;
		}

		const {
			root,
			success,
			total,
			message
		} = this._processServerResponse(result);

		if (!success) {
			this.markLoading(false);
			throw Error(message);
		}

		// Click duplicateId. The new row appears directly above the one that was duplicated
		// The new duplicate is selected
		// The display field should read "{old name} (duplicate)"

		
		const duplicateEntity = await this.createStandaloneEntity(root, true, true);
		if (entity.isRemotePhantomMode) {
			entity.isRemotePhantom = true;
		}
		this._insertBefore(duplicateEntity, entity);

		this.markLoading(false);
		return duplicateEntity;
	}

	async loadOneAdditionalEntity(id) {
		const entity = await this.getSingleEntityFromServer(id);
		if (!entity) {
			this.throwError('entity not found');
			return;
		}

		this._relayEntityEvents(entity);
		this.entities.push(entity);
		this.total++;
		this._setPaginationVars();
		this.emit('changeData', this.entities);
	}

	async getSingleEntityFromServer(id) {
		if (this.isDestroyed) {
			this.throwError('this.getSingleEntityFromServer is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.api.get) {
			this.throwError('No "get" api endpoint defined.');
			return;
		}

		if (!id) {
			return null;
		}

		this.markLoading();

		const idPropertyName = this.getSchema().model.idProperty;
		const params = {};
		params['conditions[' + idPropertyName + ']'] = id;

		const
			url = this._getModel() + '/' + this.api.get,
			data = _.merge(params, this._baseParams);

		if (this.debugMode) {
			console.log('getSingleEntityFromServer', data);
		}

		return this._send(this.methods.get, url, data)
					.then(result => {
						if (this.debugMode) {
							console.log('Response for getSingleEntityFromServer for ' + this.name, result);
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

						if (!root[0]) {
							return null;
						}

						const entity = this.createStandaloneEntity(root[0]);
						entity.isPersisted = true;
						entity.isRemotePhantom = false;
						return entity;
					})
					.finally(() => {
						this.markLoading(false);
					});

	}

	async getLastModifiedDate() {
		if (this.isDestroyed) {
			this.throwError('this.getLastModifiedDate is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.api.getLastModifiedDate) {
			this.throwError('No "getLastModifiedDate" api endpoint defined.');
			return;
		}

		this.markLoading();

		if (this.debugMode) {
			console.log('getLastModifiedDate');
		}

		const url = this._getModel() + '/' + this.api.getLastModifiedDate;

		return this._send(this.methods.get, url, this._baseParams)
					.then(result => {
						if (this.debugMode) {
							console.log('Response for getLastModifiedDate for ' + this.name, result);
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

						if (!success) {
							this.throwError(message);
							return;
						}
						return root;
					})
					.finally(() => {
						this.markLoading(false);
					});

	}

	/**
	 * Login to OneBuild API
	 * @param {object} creds - object with two properties:
	 * - username,
	 * - password,
	 * @return {Promise}
	 */
	login(creds) {

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const data = {
			url: 'apiLogin',
			data: qs.stringify(creds),
			method: 'POST',
			baseURL: this.api.baseURL,
		};

		if (this.debugMode) {
			console.log('login', data);
		}

		return this.axios(data)
			.then((result) => {
				if (this.debugMode) {
					console.log('login response', result);
				}

				const response = result.data;
				if (!response.success) {
					this.throwError(response.data); // TODO: Fix back-end, so OneBuild submits the error message on response.message, not response.data
					return false;
				}

				const userData = response.data;
				return userData;
			});
	}

	/**
	 * Logout from OneBuild API
	 * @return {Promise}
	 */
	logout() {

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const data = {
			url: 'Users/apiLogout',
			method: 'POST',
			baseURL: this.api.baseURL,
			headers: _.merge({
				'Content-Type': 'application/json',
				Accept: 'application/json',
			}, this.headers),
			timeout: this.timeout,
		};

		if (this.debugMode) {
			console.log('logout', data);
		}

		return this.axios(data)
			.then((result) => {
				if (this.debugMode) {
					console.log('logout response', result);
				}
				const response = result.data;
				if (!response.success) {
					this.throwError(response.data);
					return;
				}
				return true;
			});
	}

	forgotPassword(email = null, username = null) {

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const data = {
			url: 'forgotPassword',
			data: qs.stringify({
				email,
				username,
			}),
			method: 'POST',
			baseURL: this.api.baseURL,
		};

		if (this.debugMode) {
			console.log('forgotPassword', data);
		}

		return this.axios(data)
			.then((result) => {
				if (this.debugMode) {
					console.log('forgotPassword response', result);
				}

				const response = result.data;
				if (!response.success) {
					this.throwError(response.data);
					return;
				}

				return response;
			});
	}

}


OneBuildRepository.className = 'OneBuild';
OneBuildRepository.type = 'onebuild';

export default OneBuildRepository;
