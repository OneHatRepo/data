/** @module Repository */

import OfflineRepository from './Offline';
import store from 'store2'; // see: https://github.com/nbubna/store#readme
import _ from 'lodash';

/**
 * Repository representing a browser's LocalStorage implementation
 * Uses store2 package
 * Note: LocalStorage is only active for the current browser session.
 * It does not persist across sessions. For that, use SessionStorage.
 * @extends OfflineRepository
 */
class LocalStorageRepository extends OfflineRepository {

	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);

		this._store = store.namespace(this.schema.name);

		if (this._store.isFake()) {
			throw new Error('store2 error: persistent storage not established.');
		}
	}

	_storageGetValue = (name) => {
		const result = this._store(name);
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
		return this._store(name, value);
	}

	_storageDeleteValue = (name) => {
		return this._store.remove(name);
	}

	_clearAll = () => {
		return this._store.clearAll();
	}

};

LocalStorageRepository.className = 'LocalStorage';
LocalStorageRepository.type = 'local';

export default LocalStorageRepository;