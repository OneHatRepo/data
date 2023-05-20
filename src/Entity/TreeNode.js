/** @module Entity */

import Entity from './Entity.js';
import _ from 'lodash';

/**
 * Class represents a TreeNode which adds Tree methods to Entity
 * TreeNode is hierarchical, so other TreeNodes can appear in this.children
 * 
 * @extends Entity
 */
class TreeNode extends Entity {
	constructor(schema, rawData = {}, repository = null, originalIsMapped = false, isDelayedSave = false, isRemotePhantomMode = false, isRoot = false) {
		super(...arguments);

		if (!schema.model.parentIdProperty) {
			throw new Error('parentIdProperty cannot be empty');
		}

		/**
		 * @member {boolean} isTreeNode - Whether this Entity is a TreeNode
		 */
		this.isTreeNode = true;

		/**
		 * @member {boolean} isRoot - Whether this TreeNode is the root TreeNode
		 */
		this.isRoot = isRoot;

		/**
		 * @member {TreeNode} parent - The parent TreeNode for this TreeNode
		 */
		this.parent = null;

		/**
		 * @member {array} children - Contains any children of this TreeNode
		 */
		this.children = [];
		
		/**
		 * @member {boolean} isChildrenLoaded - Whether child TreeNodes have loaded for this TreeNode
		 */
		this.isChildrenLoaded = false;


		// UI State
		this.isVisible = false;

		this.isExpanded = false;
	}

	/**
	 * Gets the "parentId" Property object for this TreeNode.
	 * This is the Property whose value represents the id for the parent TreeNode.
	 * @return {Property} parentId Property
	 */
	getParentIdProperty = () => {
		if (this.isDestroyed) {
			throw Error('this.getParentIdProperty is no longer valid. TreeNode has been destroyed.');
		}
		const parentIdProperty = this.getSchema().model.parentIdProperty;
		if (!parentIdProperty) {
			throw new Error('No parentIdProperty found for ' + schema.name);
		}
		return this.getProperty(parentIdProperty);
	}

	/**
	 * Gets the parentId for this TreeNode.
	 * @return {any} parentId - The parentId
	 */
	getParentId = () => {
		if (this.isDestroyed) {
			throw Error('this.getParentId is no longer valid. TreeNode has been destroyed.');
		}
		return this.geParentIdProperty().getSubmitValue();
	}

	/**
	 * Getter of the parentId for this TreeNode.
	 * @return {any} parentId - The parentId
	 */
	get parentId() {
		return this.getParentId();
	}

	/**
	 * Getter of hasParent
	 * Returns true if this.parent is truthy
	 * @return {boolean} hasParent
	 */
	get hasParent() {
		return !!this.parent;
	}

	getParent = () => {
		if (this.isDestroyed) {
			throw Error('this.getParent is no longer valid. TreeNode has been destroyed.');
		}
		return this.parent;
	}

	/**
	 * Getter of hasChildren
	 * @return {boolean} hasParent
	 */
	get hasChildren() {
		return !_.isEmpty(this.children);
	}

	getChildren = async () => {
		if (this.isDestroyed) {
			throw Error('this.getChildren is no longer valid. TreeNode has been destroyed.');
		}
		if (!this.isChildrenLoaded) {
			await this.loadChildren();
		}
		return this.children;
	}

	loadChidren = async () => {
		if (this.isDestroyed) {
			throw Error('this.loadChidren is no longer valid. TreeNode has been destroyed.');
		}
		this.children = await this.repository.loadChildTreeNodes(this); // populates the children with a reference to this in child.parent
		this.isChildrenLoaded = true;
	}

	getPrevousSibling = async () => {
		if (this.isDestroyed) {
			throw Error('this.getPrevousSibling is no longer valid. TreeNode has been destroyed.');
		}
		const 
			parent = this.getParent(),
			siblings = await parent.getChildren();
		let previous;
		_.each(siblings, (treeNode) => {
			if (treeNode === this) {
				return false;
			}
			previous = treeNode;
		})
		return previous;
	}

	getNextSibling = async () => {
		if (this.isDestroyed) {
			throw Error('this.getNextSibling is no longer valid. TreeNode has been destroyed.');
		}
		const 
			parent = this.getParent(),
			siblings = await parent.getChildren();
		let returnNext = false,
			next = null;
		_.each(siblings, (treeNode) => {
			if (returnNext) {
				next = treeNode;
				return false;
			}
			if (treeNode === this) {
				returnNext = true;
			}
		})
		return next;
	}

	getChildAt = (ix) => {
		if (this.isDestroyed) {
			throw Error('this.getChildAt is no longer valid. TreeNode has been destroyed.');
		}
		return this.children[ix];
	}

	getFirstChild = () => {
		if (this.isDestroyed) {
			throw Error('this.getFirstChild is no longer valid. TreeNode has been destroyed.');
		}
		return this.children[0];
	}

	getLastChild = () => {
		if (this.isDestroyed) {
			throw Error('this.getLastChild is no longer valid. TreeNode has been destroyed.');
		}
		return this.children.slice(-1)[0]
	}

}

export default TreeNode;
