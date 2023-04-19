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
	'join',
	'where',
	'matching',
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
			isAutoSave: true,

			api: {
				get: this.name + '/get',
				add: this.name + '/add',
				edit: this.name + '/edit',
				delete: this.name + '/delete',
				batchAdd: this.name + '/batchAdd',
				batchEdit: this.name + '/batchEdit',
				batchDelete: this.name + '/batchDelete',
			},

			methods: {
				get: 'POST',
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
	_send = (method, url, data) => {

		if (!url) {
			this.throwError('No url submitted');
			return;
		}

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
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
	_onChangeFilters = () => {
		// Clear existing "conditions" params
		if (!_.isEmpty(this._params)) {
			this._params = _.omitBy(this._params, (value, key) => {
				return key.match(/^conditions/) || _.includes(nonConditionFilters, key);
			});
		}

		_.each(this.filters, (filter, ix) => {
			if (_.includes(nonConditionFilters, filter.name)) {
				this.setParam(filter.name, filter.value);
			} else {
				this.setParam('conditions[' + filter.name + ']', filter.value);
			}
		});

		if (this.isLoaded && this.isAutoLoad && !this.eventsPaused) {
			return this.reload();
		}
	}

	/**
	 * Sets "order" param.
	 * OneBuild uses a single order param, rather than separate name & direction params.
	 * Refreshes entities.
	 */
	_onChangeSorters = () => {
		let sorterStrings = [];
		_.each(this.sorters, (sorter) => {
			sorterStrings.push(sorter.name + ' ' + sorter.direction);
		});

		if (!_.isEmpty(sorterStrings)) {
			this.setBaseParam('order', sorterStrings.join(','));
		}
		
		if (!this.eventsPaused) {
			if (this.isLoaded && this.isAutoLoad) {
				return this.reload().then(() => {
					this.emit('changeSorters');
				});
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
	_processServerResponse = (result) => {

		if (result === false) { // e.g. 401 error
			return {
				root: null,
				success: false,
				total: 0,
				message: null,
			};
		}

		const response = this.reader.read(result.data),
			root = response[this.rootProperty],
			success = response[this.successProperty],
			total = response[this.totalProperty],
			message = response[this.messageProperty];
		
		if (!success) {
			this.emit('error', message, root);
		}

		if (message === 'You do not have authorization to access this area.') {
			this.emit('logout');
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
	 * @param {entity} dragRecord - which entity was being dragged
	 * @param {entity} dropRecord - which entity it was dropped on to
	 * @param {string} dropPosition - position in which it was dropped; could be 'before' or 'after'
	 * @return {Promise}
	 */
	reorder = (dragRecord, dropRecord, dropPosition) => {

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}
		
		const data = {
			url: this.name + '/reorder',
			data: qs.stringify({
				ids: dragRecord.id,
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

	/**
	 * Login to OneBuild API
	 * @param {object} creds - object with two properties:
	 * - username,
	 * - password,
	 * @return {Promise}
	 */
	login = (creds) => {

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
	logout = () => {

		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		if (this.debugMode) {
			console.log('logout');
		}

		return this.axios({
				url: 'Users/apiLogout',
				method: 'POST',
				baseURL: this.api.baseURL,
				headers: this.headers,
				timeout: this.timeout,
			})
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

	forgotPassword = (email = null, username = null) => {

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
