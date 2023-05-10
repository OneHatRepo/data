/** @module Repository */

import OfflineRepository from '@onehat/data/src/Repository/Offline.js';
import IDBStorage from 'idbstorage';
import _ from 'lodash';

const store = new IDBStorage(); // Singleton used for all connections

/**
 * Repository representing a browser's IndexedDB implementation
 * Uses idbstorage package
 * @extends OfflineRepository
 */
class IndexedDBRepository extends OfflineRepository {

	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);
	}

	_storageGetValue = (name) => {
		const result = store.getItem(this._namespace(name));
		let value;
		try {
			value = JSON.parse(result);
		} catch (e) {
			// Invalid JSON, just return raw result
			value = result;
		}
		return value;
	}

	_storageSetValue = (name, value) => {
		if (!_.isString(value)) {
			value = JSON.stringify(value);
		}
		return store.setItem(this._namespace(name), value);
	}

	_storageDeleteValue = (name) => {
		return store.removeItem(this._namespace(name));
	}

	_clearAll = async () => {
		store.clear();
		this._keyedEntities = {};
		this.reload();
	}
};

IndexedDBRepository.className = 'IndexedDB';
IndexedDBRepository.type = 'async';

export default IndexedDBRepository;