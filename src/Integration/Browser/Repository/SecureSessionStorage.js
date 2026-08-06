/** @module Repository */

import SessionStorageRepository from '@onehat/data/src/Integration/Browser/Repository/SessionStorage';
import CryptoES from 'crypto-es';
import _ from 'lodash';

/**
 * Repository representing an encrypted version of the browser's SessionStorage implementation
 * Requires crypto-es - https://www.npmjs.com/package/crypto-es
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
			result = CryptoES.AES.decrypt(result, this.passphrase).toString(CryptoES.enc.Utf8);
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

		value = CryptoES.AES.encrypt(value, this.passphrase).toString(); // MOD

		const result = this._store.session(name, value);
		this._broadcastStorageChange(name, 'set');
		return result;
	}

};

SecureSessionStorageRepository.className = 'SecureSessionStorage';
SecureSessionStorageRepository.type = 'secureSession';

export default SecureSessionStorageRepository;