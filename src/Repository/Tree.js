/** @module Repository */

import OneBuildRepository from './OneBuild.js';
import _ from 'lodash';


/**
 * This class is used for OneBuild Trees
 * that contain multiple node types.
 * 
 * @extends TreeRepository
 */
class TreeRepository extends OneBuildRepository {
	constructor(config = {}) {
		super(...arguments);

		const defaults = {

			isTree: true,
			rootNodeType: this._getModel(), // e.g. 'Fleets'

			api: {
				getNodes: 'getNodes',
				moveNode: 'moveNode',
				searchNodes: 'searchNodes',
			},

			// TODO: modify all tree methods to handle multiple node types
			// SOME are updated, but many are not.
			// I'll need to modify all generated models to use TreeRepository instead of OneBuild with isTree: true.

		};
		_.merge(this, defaults, config);

	}

	async initialize() {

		this.registerEvents([
			'loadRootNodes',
		]);

		await super.initialize();
	}

	getModelFromTreeNode(treeNode) {
		return treeNode.nodeType || this.rootNodeType;
	}

	/**
	 * Loads the root nodes of this tree.
	 */
	loadRootNodes(depth) {
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

		const
			data = _.merge({ depth }, this._baseParams, this._params),
			url = this.rootNodeType + '/' + this.api.getNodes;

		if (this.debugMode) {
			console.log('loadRootNodes', data);
		}

		return this._send('POST', url, data)
			.then((result) => {
				if (this.debugMode) {
					console.log('Response for loadRootNodes', result);
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
				const oThis = this;
				this.entities = _.map(root, (data) => {
					const entity = Repository._createEntity(oThis.schema, data, this, true);
					oThis._relayEntityEvents(entity);
					return entity;
				});

				this.assembleTreeNodes();
				
				// Set the total records that pass filter
				this.total = total;
				this._setPaginationVars();

				this.areRootNodesLoaded = true;

				
				// Don't emit events for root nodes...
				this.rehash();
				this.emit('loadRootNodes', this);
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
	loadNode(treeNode, depth = 1) {
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
			_.each(treeNode.children, (child) => {
				treeNode.repository.removeTreeNode(child);
			});
			treeNode.children = [];
		}
		
		this.markLoading();

		const
			data = _.merge({ depth, nodeId: treeNode.id, }, this._baseParams, this._params),
			url = this.getModelFromTreeNode(treeNode) + '/' + this.api.getNodes;

		if (this.debugMode) {
			console.log('loadNode', data);
		}

		return this._send('POST', url, data)
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
				const oThis = this;
				const children = _.map(root, (data) => {
					const entity = Repository._createEntity(oThis.schema, data, this, true);
					oThis._relayEntityEvents(entity);
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
	 * alias for backward compatibility
	 */ 
	loadChildNodes(treeNode, depth = 1) {
		return this.loadNode(treeNode, depth);
	}

	/**
	 * Override the AjaxRepository to we can reload a treeNode if needed
	 */
	reloadEntity(entity, callback = null) {
		if (!entity.isTree) {
			return super.reloadEntity(entity, callback);
		}

		return this.loadNode(entity, 1);
	}

	/**
	 * Searches all nodes for the supplied text.
	 * This basically takes the search query and returns whatever the server sends
	 */
	searchNodes(q) {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.searchNodes is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const
			data = _.merge({ q, }, this._baseParams, this._params),
			url = this.rootNodeType + '/' + this.api.searchNodes;

		if (this.debugMode) {
			console.log('searchNodes', data);
		}

		return this._send('POST', url, data)
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
	 * Moves the supplied treeNode to a new position on the tree
	 * @returns id of common ancestor node 
	 */
	moveTreeNode(treeNode, newParentId) {
		this.ensureTree();
		if (this.isDestroyed) {
			this.throwError('this.moveTreeNode is no longer valid. Repository has been destroyed.');
			return;
		}
		if (!this.isOnline) {
			this.throwError('Offline');
			return;
		}

		const
			oldParentId = treeNode.parent?.id,
			data = _.merge({ nodeId: treeNode.id, parentId: newParentId, }, this._baseParams, this._params),
			url = this.rootNodeType + '/' + this.api.moveNode;

		// NOTE: The rootNodeType controller needs to know about all the possible nodeTypes,
		// so any particular node can move all around the tree.
		
		if (this.debugMode) {
			console.log('moveTreeNode', data);
		}

		return this._send('POST', url, data)
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

}


TreeRepository.className = 'Tree';
TreeRepository.type = 'tree';

export default TreeRepository;
