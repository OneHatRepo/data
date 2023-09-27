/** @module Repository */

import LocalStorageRepository from '@onehat/data/src/Integration/Browser/Repository/LocalStorage';
import AES from 'crypto-js/aes';
import _ from 'lodash';

/**
 * Repository representing an encrypted version of the browser's LocalStorage implementation
 * Requires crypto-js - https://www.npmjs.com/package/crypto-js
 * @extends LocalStorageRepository
 */
class SecureLocalStorageRepository extends LocalStorageRepository {

	constructor(config = {}) {
		super(...arguments);

		if (_.isEmpty(config.passphrase)) {
			throw new Error('SecureLocalStorageRepository requires a passphrase!');
		}

		this.passphrase = config.passphrase;
	}

	_storageGetValue = (name) => {
		try {
			
			if (this.debugMode) {
				console.log(this.name, 'LocalStorage.get', name);
			}

			// BEGIN MOD
			let result = this._store(name);
			result = AES.decrypt(result, this.passphrase);
			// END MOD
			
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

	_storageSetValue = (name, value) => {
		try {
			if (this.debugMode) {
				console.log(this.name, 'LocalStorage.set', name, value);
			}
			if (!_.isString(value)) {
				value = JSON.stringify(value);
			}

			value = AES.encrypt(value, this.passphrase); // MOD

			return this._store(name, value);

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

};

SecureLocalStorageRepository.className = 'SecureLocalStorage';
SecureLocalStorageRepository.type = 'secureLocal';

export default SecureLocalStorageRepository;