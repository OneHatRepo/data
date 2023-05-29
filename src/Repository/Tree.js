/** @module Repository */

import Repository from './Repository.js';
import _ from 'lodash';

/**
 * This class adds methods to Repository that are appropriate for TreeNodes.
 * 
 * @extends Repository
 */
class TreeRepository extends Repository {
	constructor(config = {}) {
		super(...arguments);

		/**
		 * @member {boolean} isTree - Whether this Repository contains TreeNodes
		 * @readonly
		 */
		this.isTree = true;

		/**
		 * @member {boolean} isPaginated - Whether this Repository is paginated
		 */
		this.isPaginated = false;




	}

	/**
	 * Sets the root node of this tree.
	 */
	setRootNode = (treeNode) => {
		if (this.isDestroyed) {
			this.throwError('this.setRootNode is no longer valid. Repository has been destroyed.');
			return;
		}
		


	}

	/**
	 * Loads child nodes of the given TreeNode
	 * Populates the children with a reference to treeNode in child.parent.
	 * This would only be in OneBuildTreeRepository
	 */
	loadChildren = async (treeNode) => {
		if (this.isDestroyed) {
			this.throwError('this.loadChildren is no longer valid. Repository has been destroyed.');
			return;
		}



	}

}

TreeRepository.className = 'Tree';
TreeRepository.type = 'tree';

export default TreeRepository;
