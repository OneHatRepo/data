import OfflineRepository from '@onehat/data/src/Repository/Offline';
import * as SecureStore from 'expo-secure-store'; // see: https://docs.expo.io/versions/latest/sdk/securestore/
import _ from 'lodash';

/**
 * Repository representing Expo's SecureStore
 * Uses expo-secure-store package
 */
class SecureStoreRepository extends OfflineRepository {

	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);
	}

	_storageGetValue = async (name) => {
		try {
			
			if (this.debugMode) {
				console.log(this.name, 'SecureStore.get', name);
			}

			const result = await SecureStore.getItemAsync(this._namespace(name));

			if (this.debugMode) {
				console.log(this.name, 'SecureStore.get results', name, result);
			}

			let value;
			if (!_.isNil(result)) {
				try {
					value = JSON.parse(result);
				} catch (e) {
					value = result; // Invalid JSON, just return raw result
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

	_storageSetValue = async (name, value) => {
		try {
			if (!_.isString(value)) {
				value = JSON.stringify(value);
			}
			if (this.debugMode) {
				console.log(this.name, 'SecureStore.set', name, value);
			}

			const result = await SecureStore.setItemAsync(this._namespace(name), value);

			// if (this.debugMode) {
			// 	console.log(this.name, 'SecureStore.set results', name, result);
			// }
			return result;
		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	_storageDeleteValue = async (name) => {
		try {
			if (this.debugMode) {
				console.log(this.name, 'SecureStore.delete', name);
			}

			const result = await SecureStore.deleteItemAsync(this._namespace(name));

			// if (this.debugMode) {
			// 	console.log(this.name, 'SecureStore.delete results', name, result);
			// }
			return result;
		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

};

SecureStoreRepository.className = 'SecureStore';
SecureStoreRepository.type = 'secure';

export default SecureStoreRepository;