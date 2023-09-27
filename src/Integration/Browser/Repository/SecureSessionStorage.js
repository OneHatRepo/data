/** @module Repository */

import SessionStorageRepository from '@onehat/data/src/Integration/Browser/Repository/SessionStorage';
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

	_storageGetValue = (name) => {
		const
			result = this._store.session(name),
			decrypted = AES.decrypt(result, this.passphrase); // MOD

		let value;
		try {
			value = JSON.parse(decrypted);
		} catch (e) {
			// Invalid JSON, just return raw result
			value = decrypted;
		}
		return value;
	}

	_storageSetValue = (name, value) => {
		if (!_.isString(value)) {
			value = JSON.stringify(value);
		}

		const encrypted = AES.encrypt(value, this.passphrase); // MOD
		return this._store.session(name, encrypted);
	}

};

SecureSessionStorageRepository.className = 'SecureSessionStorage';
SecureSessionStorageRepository.type = 'secureSession';

export default SecureSessionStorageRepository;