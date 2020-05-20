/** @module Repository */

import AjaxRepository from './Ajax';
import qs from 'qs';
import _ from 'lodash';

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

			autoLoad: false,
			autoSave: true,

			api: {
				add: this.name + '/extAdd',
				get: this.name + '/get',
				edit: this.name + '/extEdit',
				delete: this.name + '/extDelete',
			},

			methods: {
				get: 'POST',
			},
			
			rootProperty: 'data',
			successProperty: 'success',
			totalProperty: 'total',
			messageProperty: 'message',

			allowsMultiSort: true,

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

	/**
	 * Sets "conditions" param.
	 * OneBuild uses a single, multi-dimentional param for filtering.
	 * Refreshes entities.
	 */
	_onChangeFilters = () => {
		// Clear existing "conditions" params
		if (!_.isEmpty(this._params)) {
			this._params = _.omitBy(this._params, (value, key) => {
				return key.match(/^conditions/);
			});
		}

		_.each(this.filters, (filter) => {
			this.setParam('conditions[' + filter.name + ']', filter.value);
		});

		if (this.isLoaded) {
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

		this.setParam('order', sorterStrings.join(','));
		
		if (this.isLoaded) {
			return this.reload();
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
		const response = this.reader.read(result.data),
			root = response[this.rootProperty],
			success = response[this.successProperty],
			total = response[this.totalProperty],
			message = response[this.messageProperty];
		
		if (!success) {
			this.emit('err', message, root);
		}

		return {
			root,
			success,
			total,
			message
		};
	}

	/**
	 * Login to OnBuild API
	 * @param {object} creds - object with two properties:
	 * - username,
	 * - password,
	 * @return {Promise}
	 */
	login = (creds) => {
		if (this.debugMode) {
			console.log('login', creds);
		}

		return this.axios({
				url: 'Users/apiLogin',
				data: qs.stringify(creds),
				method: 'POST',
				baseURL: this.api.baseURL,
			})
			.then((result) => {
				if (this.debugMode) {
					console.log('login result', result);
				}

				const response = result.data;
				if (!response.success) {
					throw new Error(response.data); // TODO: Fix back-end, so OneBuild submits the error message on response.message, not response.data
				}

				const userData = response.data;
				return userData;
			});
	}

	/**
	 * Logout from OnBuild API
	 * @return {Promise}
	 */
	logout = () => {
		if (this.debugMode) {
			console.log('logout');
		}
		return this.axios({
				url: 'Users/apiLogout',
				method: 'POST',
				baseURL: this.api.baseURL,
			})
			.then((result) => {
				if (this.debugMode) {
					console.log('logout result', result);
				}
				const response = result.data;
				if (!response.success) {
					throw new Error(response.data);
				}
				return true;
			});
	}

}


OneBuildRepository.className = 'OneBuild';
OneBuildRepository.type = 'onebuild';

export default OneBuildRepository;
