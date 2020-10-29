/** @module Repository */

import OfflineRepository from '@onehat/data/src/Repository/Offline.js';
import AsyncStorage from '@react-native-community/async-storage';
import _ from 'lodash';

/**
 * Repository representing React Native AsyncStorage
 * Uses AsyncStorage package
 * @extends OfflineRepository
 */
class AsyncStorageRepository extends OfflineRepository {

	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);
	}

	_storageGetValue = async (name) => {
		try {
			
			if (this.debugMode) {
				console.log(this.name, 'AsyncStorage.get', name);
			}

			const result = await AsyncStorage.getItem(this._namespace(name));
			
			if (this.debugMode) {
				console.log(this.name, 'AsyncStorage.get results', name, result);
			}

			let value = null;
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

	_storageGetMultiple = async (keys) => {
		try {

			if (keys.length === 0) {
				return null;
			}
			
			if (this.debugMode) {
				console.log(this.name, 'AsyncStorage.multiGet', keys);
			}

			const results = await AsyncStorage.multiGet(this._namespace(keys));

			if (this.debugMode) {
				console.log(this.name, 'AsyncStorage.multiGet results', name, results);
			}

			let values = [];
			if (!_.isNil(results)) {
				_.each(results, ([key, value]) => {
					let parsed;
					try {
						parsed = JSON.parse(value);
					} catch (e) {
						parsed = value; // Invalid JSON, just return raw result
					}
					values.push(parsed);
				})
			}

			// if (this.debugMode && _.size(keys) < 20) {
			// 	console.log(this.name, 'AsyncStorage.multiGet results', values);
			// }
			return values;

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
				console.log(this.name, 'AsyncStorage.set', name, value);
			}

			return await AsyncStorage.setItem(this._namespace(name), value);

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	_storageSetMultiple = async (values) => {
		try {
			const converted = [],
				keys = [];

			_.forOwn(values, (value, key) => {
				keys.push(key);
				key = this._namespace(key);
				if (!_.isString(value)) {
					value = JSON.stringify(value);
				}
				converted.push([key, value]);
			});

			if (this.debugMode) {
				console.log(this.name, 'AsyncStorage.multiSet', keys);
			}

			return await AsyncStorage.multiSet(converted);

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	_storageDeleteValue = async (name) => {
		try {
			if (_.isNil(name) || (_.isString(name) && name === '')) {
				return;
			}

			if (this.debugMode) {
				console.log(this.name, 'AsyncStorage.delete', name);
			}

			return await AsyncStorage.removeItem(this._namespace(name));

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	_storageDeleteMultiple = async (keys) => {
		try {
			if (_.isNil(keys) || (_.isArray(keys) && !keys.length)) {
				return;
			}

			if (this.debugMode) {
				console.log(this.name, 'AsyncStorage.delete', keys);
			}

			return await AsyncStorage.multiRemove(this._namespace(keys));

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	_clearAll = async () => {
		await AsyncStorage.clear();
		this._keyedEntities = {};
		this.reload();
	}

	_getAllKeys = async () => {
		return await AsyncStorage.getAllKeys();
	}

};

AsyncStorageRepository.className = 'AsyncStorage';
AsyncStorageRepository.type = 'async';

export default AsyncStorageRepository;