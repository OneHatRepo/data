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
		if (!schema.model.hasChildrenProperty) {
			throw new Error('hasChildrenProperty cannot be empty');
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
		this.children = this._originalData.children && !_.isEmpty(this._originalData.children) ? this._originalData.children : [];
		
		/**
		 * @member {boolean} isChildrenLoaded - Whether child TreeNodes have loaded for this TreeNode
		 */
		this.isChildrenLoaded = this._originalData.isChildrenLoaded || false;
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
		return this.getProperty(parentIdProperty);
	}

	/**
	 * Gets the parentId for this TreeNode.
	 * It does this by getting the parentId property's submitValue.
	 * It doesn't look at some value created by client on the TreeNode.
	 * @return {any} parentId - The parentId
	 */
	getParentId = () => {
		if (this.isDestroyed) {
			throw Error('this.getParentId is no longer valid. TreeNode has been destroyed.');
		}
		return this.geParentIdProperty().getSubmitValue();
	}

	/**
	 * Getter of parentId for this TreeNode.
	 * @return {any} parentId - The parentId
	 */
	get parentId() {
		return this.getParentId();
	}

	/**
	 * Getter of hasParent
	 * Returns true if this is not a root node
	 * @return {boolean} hasParent
	 */
	get hasParent() {
		return !this.isRoot;
	}

	/**
	 * Gets the "hasChildren" Property object for this TreeNode.
	 * This is the Property whose value represents whether this TreeNode has any children.
	 * @return {Property} parentId Property
	 */
	getHasChildrenProperty = () => {
		if (this.isDestroyed) {
			throw Error('this.getHasChildrenProperty is no longer valid. TreeNode has been destroyed.');
		}
		const hasChildrenProperty = this.getSchema().model.hasChildrenProperty;
		return this.getProperty(hasChildrenProperty);
	}

	/**
	 * Gets the hasChildren value for this TreeNode.
	 * It does this by getting the hasChildren property's submitValue.
	 * It doesn't look at some value created by client on the TreeNode.
	 * @return {any} parentId - The parentId
	 */
	getHasChildren = () => {
		if (this.isDestroyed) {
			throw Error('this.getHasChildren is no longer valid. TreeNode has been destroyed.');
		}
		return this.getHasChildrenProperty().getSubmitValue();
	}

	/**
	 * Getter of hasChildren for this TreeNode.
	 * @return {any} parentId - The parentId
	 */
	get hasChildren() {
		return this.getHasChildren();
	}

	/**
	 * Getter of parent TreeNode for this TreeNode.
	 * @return {TreeNode} parent - The parent TreeNode
	 */
	getParent = () => {
		if (this.isDestroyed) {
			throw Error('this.getParent is no longer valid. TreeNode has been destroyed.');
		}
		if (!this.hasParent) {
			return null;
		}
		return this.parent;
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

	loadChildren = async () => {
		if (this.isDestroyed) {
			throw Error('this.loadChildren is no longer valid. TreeNode has been destroyed.');
		}
		if (this.repository.loadChildren) {
			this.children = await this.repository.loadChildren(this); // populates the children with a reference to this in child.parent
			this.isChildrenLoaded = true;
		}
	}

	reloadChildren = () => { // alias
		return this.loadChildren();
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
