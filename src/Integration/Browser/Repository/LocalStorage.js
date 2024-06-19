/** @module Repository */

import OfflineRepository from '@onehat/data/src/Repository/Offline.js';
import store from 'store2'; // see: https://github.com/nbubna/store#readme
import _ from 'lodash';

/**
 * Repository representing a browser's LocalStorage implementation
 * Uses store2 package
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

	_storageGetValue(name){
		try {
			
			if (this.debugMode) {
				console.log(this.name, 'LocalStorage.get', name);
			}

			const result = this._store(name);
			
			if (this.debugMode) {
				console.log(this.name, 'LocalStorage.get results', name, result);
			}

			let value = null;
			if (!_.isNil(result)) {
				try {
					value = JSON.parse(result);
				} catch (e) {
					// Invalid JSON, just return raw result
					value = result;
				}
			}
			return value;
		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	_storageSetValue(name, value) {
		try {
			if (this.debugMode) {
				console.log(this.name, 'LocalStorage.set', name, value);
			}
			if (!_.isString(value)) {
				value = JSON.stringify(value);
			}

			return this._store(name, value);

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	_storageDeleteValue(name) {
		try {
			if (_.isNil(name) || (_.isString(name) && name === '')) {
				return;
			}

			if (this.debugMode) {
				console.log(this.name, 'LocalStorage.delete', name);
			}

			return this._store.remove(name);

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	clearAll() {
		return this._store.clearAll();
	}

};

LocalStorageRepository.className = 'LocalStorage';
LocalStorageRepository.type = 'local';

export default LocalStorageRepository;