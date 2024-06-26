/** @module Repository */

import Repository from './Repository.js';
import Entity from '../Entity/Entity.js';
import _ from 'lodash';

/**
 * *Does not store anything!*
 * It implements all required methods of Repository,
 * but only in the most minimal (and non-functional) way.
 * Can be used as a template for new Repository types,
 * or for unit testing purposes.
 * @extends Repository
 */
class NullRepository extends Repository {

	constructor(config = {}) { // Need this constructor so custom overrides apply to this, and not parent.
		super(...arguments);
		_.merge(this, config);
	}

	initialize() {
		this.addListeners([
			'changePage',
			'changePageSize',
		], () => this._setPaginationVars());

		this.addListeners([
			'add',
		], () => this._updateSize());

		this.addListeners([
			'save',
		], () => this.emit('changeData'));

		return super.initialize();
	}
	
	/**
	 * Tells storage medium to load data
	 * @param {object} data - Data to immediately load
	 * @fires load
	 */
	load(data = this.data) {
		if (this.isDestroyed) {
			this.throwError('this.load is no longer valid. Repository has been destroyed.');
			return;
		}
		this.emit('beforeLoad');
		this.markLoading();

		if (data) {
			let entities = data;
			if (data[0] instanceof Entity === false) {
				const repository = this;
				entities = _.map(data, (item) => {
					const entity = Repository._createEntity(repository.schema, item, repository, true);
					repository._relayEntityEvents(entity);
					return entity;
				});
			}
			
			this._destroyEntities();
			this.entities = entities;
		}

		this._updateSize();

		this.markLoaded();
		this.emit('changeData', this.entities);
		this.emit('load', this);
	}

	/**
	 * Helper for load().
	 * @private
	 */
	_updateSize() {
		this.total = _.size(this.entities);
	}

	/**
	 * Helper for save().
	 * Tells storage medium to add entity to storage medium
	 * @private
	 */
	_doAdd(entity) {
		entity.markSaved();
		return true;
	}

	/**
	 * Helper for save().
	 * Marks entity as saved
	 * @param {object} entity - Entity
	 * @private
	 */
	_doEdit(entity) { // standard function notation
		if (this.isDestroyed) {
			this.throwError('this._doEdit is no longer valid. Repository has been destroyed.');
			return;
		}
		entity.markSaved();
		return {
			operation: 'edit',
			success: true,
			entity,
		};
	}

	/**
	 * Helper for save().
	 * Tells storage medium to delete entity from storage medium
	 * @private
	 */
	_doDelete(entity) {
		entity.destroy();
		return true;
	}

	_doDeleteNonPersisted(entity) {
		return this._doDelete(entity);
	}

};

NullRepository.className = 'Null';
NullRepository.type = 'null';

export default NullRepository;