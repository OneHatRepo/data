/** @module Repository */

import OfflineRepository from '@onehat/data/src/Repository/Offline.js';
import store from 'store2'; // see: https://github.com/nbubna/store#readme
import _ from 'lodash';

/**
 * Repository representing a browser's SessionStorage implementation
 * Uses store2 package
 * Note: SessionStorage is only active for the current browser session.
 * It does not persist across sessions. For that, use LocalStorage.
 * @extends OfflineRepository
 */
class SessionStorageRepository extends OfflineRepository {

	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);

		this._store = store.namespace(this.schema.name);
		
		if (this._store.isFake()) {
			throw new Error('store2 error: persistent storage not established.');
		}
	}

	_storageGetValue(name) {
		const result = this._store.session(name);
		let value;
		try {
			value = JSON.parse(result);
		} catch (e) {
			// Invalid JSON, just return raw result
			value = result;
		}
		return value;
	}

	_storageSetValue(name, value) {
		if (!_.isString(value)) {
			value = JSON.stringify(value);
		}
		return this._store.session(name, value);
	}

	_storageDeleteValue(name) {
		return this._store.session.remove(name);
	}

	clearAll() {
		return this._store.session.clearAll();
	}

};

SessionStorageRepository.className = 'SessionStorage';
SessionStorageRepository.type = 'session';

export default SessionStorageRepository;