/**
 * This file is categorized as "Proprietary Framework Code"
 * and is subject to the terms and conditions defined in
 * file 'LICENSE.txt', which is part of this source code package.
 */
import OfflineRepository from '@onehat/data/src/Repository/Offline.js';
import * as SecureStore from 'expo-secure-store'; // see: https://docs.expo.io/versions/latest/sdk/securestore/
import _ from 'lodash';

const CHUNK_SEPARATOR = 'CHUNK';

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


			// Check if we need to assemble chunks
			const
				record = await SecureStore.getItemAsync(this._namespace(name)),
				regex = new RegExp('^' + CHUNK_SEPARATOR + '([\\d]+)$'),
				matches = record.match(regex);
			let result;
			if (matches && matches[1]) {
				const
					totalChunks = matches[1],
					chunks = [];
				let n,
					recName;
				for (n = 0; n < totalChunks; n++) {
					recName = this._namespace(name) + CHUNK_SEPARATOR + n;
					result = await SecureStore.getItemAsync(recName);
					chunks.push(result);
				}
				result = chunks.join('');

			} else {
				result = await SecureStore.getItemAsync(this._namespace(name));
			}

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
			// if (this.debugMode) {
			// 	const msg = error && error.message;
			// 	debugger;
			// }
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

			const
				totalSize = new Blob([value]).size,
				maxSize = 2000;
			let result;
			if (totalSize > maxSize) {
				// value is too big (values cannot be > 2048 bytes https://docs.expo.dev/versions/latest/sdk/securestore/)
				// so we need to chunk the value
				const totalChunks = Math.ceil(totalSize / maxSize),
					chunks = new Array(totalChunks);
				let i, o, n,
					chunkValue,
					recName;
				for (i = 0, o = 0; i < totalChunks; ++i, o += maxSize) {
					chunks[i] = value.substr(o, maxSize)
				}

				// Save a header into the normal value, which stores the number of chunks, and tells the repository to get the chunks next time it's read
				recName = this._namespace(name);
				result = await SecureStore.setItemAsync(recName, CHUNK_SEPARATOR + totalChunks);

				// now save the actual chunks
				for (n = 0; n < chunks.length; n++) {
					chunkValue = chunks[n];
					recName = this._namespace(name) + CHUNK_SEPARATOR + n;
					await SecureStore.setItemAsync(recName, chunkValue);
				}
			} else {
				result = await SecureStore.setItemAsync(this._namespace(name), value);
			}

			// if (this.debugMode) {
			// 	console.log(this.name, 'SecureStore.set results', name, result);
			// }
			return result;
		} catch (error) {
			// if (this.debugMode) {
			// 	const msg = error && error.message;
			// 	debugger;
			// }
		}
	}

	_storageDeleteValue = async (name) => {
		try {
			if (this.debugMode) {
				console.log(this.name, 'SecureStore.delete', name);
			}


			// Check if we need to delete chunks
			const
				record = await SecureStore.getItemAsync(this._namespace(name)),
				regex = new RegExp('^' + CHUNK_SEPARATOR + '([\\d]+)$'),
				matches = record.match(regex);
			let result;
			if (matches && matches[1]) {
				const totalChunks = matches[1];
				let n,
					recName;
				for (n = 0; n < totalChunks; n++) {
					recName = this._namespace(name) + CHUNK_SEPARATOR + n;
					result = await SecureStore.deleteItemAsync(recName);
				}
			} else {
				result = await SecureStore.deleteItemAsync(this._namespace(name));
			}

			// if (this.debugMode) {
			// 	console.log(this.name, 'SecureStore.delete results', name, result);
			// }
			return result;
		} catch (error) {
			// if (this.debugMode) {
			// 	const msg = error && error.message;
			// 	debugger;
			// }
		}
	}

	clearAll = async () => {
		await this.load([]);
	}

};

SecureStoreRepository.className = 'SecureStore';
SecureStoreRepository.type = 'secure';

export default SecureStoreRepository;