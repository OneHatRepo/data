/** @module Repository */

import Repository from './Repository.js';
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
			isAutoSave: false,

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
							// 'Content-Type': 'application/json', // Stops axios from using 'application/x-www-form-urlencoded'
							Accept: 'application/json',
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

		if (this.isLoaded && !this.eventsPaused) {
			if (this.isTree) {
				return this.getRootNodes(1);
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
				if (this.isTree) {
					return this.getRootNodes(1).then(() => {
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
	_processServerResponse = (result) => {

		if (result === false) { // e.g. 401 error
			return {
				root: null,
				success: false,
				total: 0,
				message: null,
			};
		}

		const
			response = _.isPlainObject(result.data) ? result.data : this.reader.read(result.data),
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

	remoteDuplicate = async (entity) => {
		
		this.markLoading();

		const
			Model = this.getSchema().name,
			id = entity.id,
			result = await this._send('POST', Model + '/duplicate', { id });
		
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

	loadOneAdditionalEntity = async (id) => {
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

	getSingleEntityFromServer = async (id) => {
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

		const data = _.merge(params, this._baseParams);

		if (this.debugMode) {
			console.log('getSingleEntityFromServer', data);
		}

		return this._send(this.methods.get, this.api.get, data)
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
						entity.isRemotePhantom = false;
						return entity;
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

		const headers = _.merge({
							'Content-Type': 'application/json',
							Accept: 'application/json',
						}, this.headers);

		return this.axios({
				url: 'Users/apiLogout',
				method: 'POST',
				baseURL: this.api.baseURL,
				headers,
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


	//   ______
	//  /_  __/_______  ___  _____
	//   / / / ___/ _ \/ _ \/ ___/
	//  / / / /  /  __/  __(__  )
	// /_/ /_/   \___/\___/____/

	/**
	 * Loads the root nodes of this tree.
	 */
	loadRootNodes = (depth) => {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.setRootNode is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		this.emit('beforeLoad'); // TODO: canceling beforeLoad will cancel the load operation
		this.markLoading();

		const data = _.merge({ depth }, this._baseParams, this._params);

		if (this.debugMode) {
			console.log('loadRootNodes', data);
		}

		return this._send('POST', this.name + '/getNodes', data)
			.then((result) => {
				if (this.debugMode) {
					console.log('Response for getRootNodes', result);
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

				this._destroyEntities();

				// Set the current entities
				this.entities = _.map(root, (data) => {
					const entity = Repository._createEntity(this.schema, data, this, true);
					this._relayEntityEvents(entity);
					return entity;
				});

				this.assembleTreeNodes();
				
				// Set the total records that pass filter
				this.total = total;
				this._setPaginationVars();

				this.areRootNodesLoaded = true;

				
				// Don't emit events for root nodes...
				this.rehash();
				this.emit('load', this);
				// this.emit('changeData', this.entities);

				return this.getBy((entity) => {
					return entity.isRoot;
				});
			})
			.finally(() => {
				this.markLoading(false);
			});
	}

	/**
	 * Loads (or reloads) the supplied treeNode
	 */
	loadNode = (treeNode, depth = 1) => {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.loadNode is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		// If children already exist, remove them from the repository
		// This way, we can reload just a portion of the tree
		if (!_.isEmpty(treeNode.children)) {
			const children = treeNode.children;
			treeNode.children = [];

			_.each(children, (child) => {
				this.removeEntity(child);
			});
		}
		
		this.markLoading();

		const data = _.merge({ depth, nodeId: treeNode.id, }, this._baseParams, this._params);

		if (this.debugMode) {
			console.log('loadNode', data);
		}

		return this._send('POST', this.name + '/getNodes', data)
			.then((result) => {
				if (this.debugMode) {
					console.log('Response for loadNode', result);
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
				
				// Set the current entities
				const children = _.map(root, (data) => {
					const entity = Repository._createEntity(this.schema, data, this, true);
					this._relayEntityEvents(entity);
					return entity;
				});

				this.entities = this.entities.concat(children);

				this.assembleTreeNodes();
				
				this._setPaginationVars();

				this.rehash();
				// this.emit('changeData', this.entities);
				this.emit('load', this);

				return children;
			})
			.finally(() => {
				this.markLoading(false);
			});
	}

	/**
	 * Loads (or reloads) the children of the supplied treeNode
	 */
	loadChildNodes = (treeNode, depth = 1) => {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.loadChildNodes is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		// If children already exist, remove them from the repository
		// This way, we can reload just a portion of the tree
		if (!_.isEmpty(treeNode.children)) {
			const children = treeNode.children;
			treeNode.children = [];

			_.each(children, (child) => {
				this.removeEntity(child);
			});
		}
		
		this.markLoading();

		const data = _.merge({ depth, parentId: treeNode.id, }, this._baseParams, this._params);

		if (this.debugMode) {
			console.log('loadChildNodes', data);
		}

		return this._send('POST', this.name + '/getNodes', data)
			.then((result) => {
				if (this.debugMode) {
					console.log('Response for loadChildNodes', result);
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
				
				// Set the current entities
				const children = _.map(root, (data) => {
					const entity = Repository._createEntity(this.schema, data, this, true);
					this._relayEntityEvents(entity);
					return entity;
				});

				this.entities = this.entities.concat(children);

				this.assembleTreeNodes();
				
				this._setPaginationVars();

				this.rehash();
				// this.emit('changeData', this.entities);
				this.emit('load', this);

				return children;
			})
			.finally(() => {
				this.markLoading(false);
			});
	}

	/**
	 * Override the AjaxRepository to we can reload a treeNode if needed
	 */
	reloadEntity = (entity, callback = null) => {
		if (!entity.isTree) {
			return super.reloadEntity(entity, callback);
		}

		return this.loadNode(entity, 1);
	}

	/**
	 * Searches all nodes for the supplied text.
	 * This basically takes the search query and returns whatever the server sends
	 */
	searchNodes = (q) => {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.searchNodes is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const data = _.merge({ q, }, this._baseParams, this._params);

		if (this.debugMode) {
			console.log('searchNodes', data);
		}

		return this._send('POST', this.name + '/searchNodes', data)
			.then((result) => {
				if (this.debugMode) {
					console.log('Response for searchNodes', result);
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
	 * Alias for loadChildren
	 */
	reloadChildren = (treeNode, depth) => {
		return this.loadChildren(treeNode, depth);
	}

	/**
	 * Moves the supplied treeNode to a new position on the tree
	 * @returns id of common ancestor node 
	 */
	moveTreeNode = (treeNode, newParentId) => {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.moveTreeNode is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const oldParentId = treeNode.parent?.id;

		const data = _.merge({ nodeId: treeNode.id, parentId: newParentId, }, this._baseParams, this._params);
		
		if (this.debugMode) {
			console.log('moveTreeNode', data);
		}

		return this._send('POST', this.name + '/moveNode', data)
			.then((result) => {
				if (this.debugMode) {
					console.log('Response for searchNodes', result);
				}

				if (this.isDestroyed) {
					// If this repository gets destroyed before it has a chance
					// to process the Ajax request, just ignore the response.
					return;
				}

				const {
					root: {
						commonAncestorId,
						oldParent,
						newParent,
						node,
					},
					success,
					total,
					message
				} = this._processServerResponse(result);

				if (!success) {
					this.throwError(message);
					return;
				}

				// move it from oldParent.children to newParent.children
				const
					oldParentRecord = this.getById(oldParentId),
					newParentRecord = this.getById(newParentId);

				oldParentRecord?.loadOriginalData(oldParent);
				newParentRecord.loadOriginalData(newParent);
				treeNode.loadOriginalData(node);

				this.assembleTreeNodes();

				return commonAncestorId;
			})
			.finally(() => {
				this.markLoading(false);
			});
	}

}


OneBuildRepository.className = 'OneBuild';
OneBuildRepository.type = 'onebuild';

export default OneBuildRepository;
