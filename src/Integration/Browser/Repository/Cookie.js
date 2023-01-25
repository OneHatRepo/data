/** @module Repository */

import OfflineRepository from '@onehat/data/src/Repository/Offline.js';
import Cookies from 'js-cookie'; // see: https://github.com/js-cookie/js-cookie
import _ from 'lodash';

const CHUNK_SEPARATOR = 'CHUNK';

/**
 * Repository representing a browser's cookie implementation
 * Uses js-cookie package
 * @extends OfflineRepository
 */
class CookieRepository extends OfflineRepository {

	constructor(config = {}) {
		super(...arguments);
		_.merge(this, config);
	}

	_storageGetValue = (name) => {
		try {
			
			if (this.debugMode) {
				console.log(this.name, 'Cookie.get', name);
			}


			// Check if we need to assemble chunks
			const record = Cookies.get(this._namespace(name)),
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
					result = Cookies.get(recName);
					chunks.push(result);
				}
				result = chunks.join('');

			} else {
				result = Cookies.get(this._namespace(name));
			}

			if (this.debugMode) {
				console.log(this.name, 'Cookie.get results', name, result);
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

	_storageSetValue = (name, value) => {
		try {
			if (!_.isString(value)) {
				value = JSON.stringify(value);
			}
			if (this.debugMode) {
				console.log(this.name, 'Cookie.set', name, value);
			}

			const totalSize = new Blob([value]).size;
			let result;
			const maxSize = 4000;
			if (totalSize > maxSize) {
				// value is too big (values cannot be > 2048 bytes https://docs.expo.dev/versions/latest/sdk/securestore/)
				// so we need to chunk the value
				const totalChunks = Math.ceil(totalSize / maxSize),
					chunks = new Array(totalChunks);
				let i,
					o,
					n,
					chunkValue,
					recName;
				for (i = 0, o = 0; i < totalChunks; ++i, o += maxSize) {
					chunks[i] = value.substr(o, maxSize)
				}

				// Save a header into the normal value, which stores the number of chunks, and tells the repository to get the chunks next time it's read
				recName = this._namespace(name);
				result = Cookies.set(recName, CHUNK_SEPARATOR + totalChunks);

				// now save the actual chunks
				for (n = 0; n < chunks.length; n++) {
					chunkValue = chunks[n];
					recName = this._namespace(name) + CHUNK_SEPARATOR + n;
					Cookies.set(recName, chunkValue);
				}
			} else {
				result = Cookies.set(this._namespace(name), value);
			}

			// if (this.debugMode) {
			// 	console.log(this.name, 'Cookie.set results', name, result);
			// }
			return result;
		} catch (error) {
			// if (this.debugMode) {
			// 	const msg = error && error.message;
			// 	debugger;
			// }
		}
	}

	_storageDeleteValue = (name) => {
		try {
			if (this.debugMode) {
				console.log(this.name, 'Cookie.delete', name);
			}


			// Check if we need to delete chunks
			const record = Cookies.get(this._namespace(name)),
				regex = new RegExp('^' + CHUNK_SEPARATOR + '([\\d]+)$'),
				matches = record.match(regex);
			let result;
			if (matches && matches[1]) {
				const totalChunks = matches[1];
				let n,
					recName;
				for (n = 0; n < totalChunks; n++) {
					recName = this._namespace(name) + CHUNK_SEPARATOR + n;
					result = Cookies.remove(recName);
				}
			} else {
				result = Cookies.remove(this._namespace(name));
			}

			// if (this.debugMode) {
			// 	console.log(this.name, 'Cookie.delete results', name, result);
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

CookieRepository.className = 'Cookie';
CookieRepository.type = 'cookie';

export default CookieRepository;