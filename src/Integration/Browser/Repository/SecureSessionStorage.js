/** @module Repository */

import SessionStorageRepository from '@onehat/data/src/Integration/Browser/Repository/SessionStorage';
import CryptoJS from 'crypto-js';
import AES from 'crypto-js/aes';
import _ from 'lodash';

/**
 * Repository representing an encrypted version of the browser's SessionStorage implementation
 * Requires crypto-js - https://www.npmjs.com/package/crypto-js
 * @extends SessionStorageRepository
 */
class SecureSessionStorageRepository extends SessionStorageRepository {

	constructor(config = {}) {
		super(...arguments);

		if (_.isEmpty(config.passphrase)) {
			throw new Error('SecureSessionStorageRepository requires a passphrase!');
		}

		this.passphrase = config.passphrase;
	}

	_storageGetValue(name) {

		// BEGIN MOD
		let result = this._store.session(name);
		if (!_.isEmpty(result)) {
			result = AES.decrypt(result, this.passphrase).toString(CryptoJS.enc.Utf8);
		}
		// END MOD

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

		value = AES.encrypt(value, this.passphrase).toString(); // MOD
		
		return this._store.session(name, value);
	}

};

SecureSessionStorageRepository.className = 'SecureSessionStorage';
SecureSessionStorageRepository.type = 'secureSession';

export default SecureSessionStorageRepository;