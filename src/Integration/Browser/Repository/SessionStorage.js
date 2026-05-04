/** @module Repository */

import OfflineRepository from '@onehat/data/src/Repository/Offline.js';
import store from 'store2'; // see: https://github.com/nbubna/store#readme
import _ from 'lodash';
import { CROSS_TAB_CHANNEL_NAME, CROSS_TAB_MESSAGE_TYPE, CROSS_TAB_EVENT_NAME } from './crossTabConstants.js';

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

		// crossTabSync defaults
		this._crossTabSyncEnabled = config.crossTabSync === true;
		this._crossTabChannelName = config.crossTabChannelName || CROSS_TAB_CHANNEL_NAME;
		this._crossTabChannel = null;
		this._onCrossTabMessageEvent = null;

		this.registerEvent(CROSS_TAB_EVENT_NAME);

		if (this._store.isFake()) {
			throw new Error('store2 error: persistent storage not established.');
		}

		this._setupCrossTabSync();
	}

	/**
	 * _setupCrossTabSync
	 * 
	 * Initialises cross-tab change notification via BroadcastChannel.
	 * Unlike LocalStorage, there is no window 'storage' event fallback here because
	 * browsers never fire that event for sessionStorage mutations. If BroadcastChannel
	 * is unavailable, cross-tab sync simply does nothing.
	 */
	_setupCrossTabSync() {
		if (!this._crossTabSyncEnabled || typeof window === 'undefined') {
			return;
		}
		if (typeof BroadcastChannel === 'undefined') {
			return;
		}
		this._crossTabChannel = new BroadcastChannel(this._crossTabChannelName);
		this._onCrossTabMessageEvent = this._handleBroadcastMessage.bind(this);
		this._crossTabChannel.addEventListener('message', this._onCrossTabMessageEvent);
	}

	/**
	 * _teardownCrossTabSync
	 * 
	 * Removes the BroadcastChannel message listener and closes the channel.
	 * Called from destroy() to prevent memory leaks and stale handlers.
	 */
	_teardownCrossTabSync() {
		if (this._crossTabChannel) {
			if (this._onCrossTabMessageEvent) {
				this._crossTabChannel.removeEventListener('message', this._onCrossTabMessageEvent);
				this._onCrossTabMessageEvent = null;
			}
			this._crossTabChannel.close();
			this._crossTabChannel = null;
		}
	}

	/**
	 * _getNamespacedKey
	 * 
	 * Returns the fully-qualified storage key that store2 uses for a given entry name.
	 * store2 namespaces keys with a prefix derived from the schema name, so the raw
	 * key and the actual sessionStorage key differ. Broadcasting the namespaced key lets
	 * recipients correlate messages with what they see in raw storage APIs.
	 */
	_getNamespacedKey(name) {
		if (!this._store || !_.isFunction(this._store._in)) {
			return name;
		}
		return this._store._in(name);
	}

	/**
	 * _emitCrossTabStorageChange
	 * 
	 * Emits the crossTabStorageChange event on this repository instance.
	 * Attaches standard repository identity fields so listeners always know which
	 * repository triggered the change, regardless of how many are registered.
	 */
	_emitCrossTabStorageChange(data = {}) {
		this.emit(CROSS_TAB_EVENT_NAME, {
			repositoryId: this.id,
			repositoryName: this.name,
			repositoryType: this.type,
			...data,
		});
	}

	/**
	 * _handleBroadcastMessage
	 * 
	 * Handles an incoming BroadcastChannel message from another tab.
	 * Filters out non-storage-change messages, echoes from this same instance,
	 * and messages for unrelated repositories, then re-emits the change locally.
	 */
	_handleBroadcastMessage(event) {
		const data = event?.data;
		if (!data || data.type !== CROSS_TAB_MESSAGE_TYPE) {
			return;
		}
		if (data.repositoryId === this.id) {
			return;
		}
		if (data.repositoryName !== this.name) {
			return;
		}
		this._emitCrossTabStorageChange({
			source: 'broadcast',
			operation: data.operation,
			key: data.key,
			namespacedKey: data.namespacedKey,
			timestamp: data.timestamp,
		});
	}

	/**
	 * _broadcastStorageChange
	 * 
	 * Posts a structured message to the BroadcastChannel so other tabs can react
	 * to a sessionStorage mutation made in this tab.
	 */
	_broadcastStorageChange(name, operation) {
		if (!this._crossTabSyncEnabled || !this._crossTabChannel) {
			return;
		}
		this._crossTabChannel.postMessage({
			type: CROSS_TAB_MESSAGE_TYPE,
			repositoryId: this.id,
			repositoryName: this.name,
			operation,
			key: name || null,
			namespacedKey: _.isNil(name) ? null : this._getNamespacedKey(name),
			timestamp: Date.now(),
		});
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
		const result = this._store.session(name, value);
		this._broadcastStorageChange(name, 'set');
		return result;
	}

	_storageDeleteValue(name) {
		const result = this._store.session.remove(name);
		this._broadcastStorageChange(name, 'delete');
		return result;
	}

	clearAll() {
		const result = this._store.session.clearAll();
		this._broadcastStorageChange(null, 'clearAll');
		return result;
	}

	/**
	 * Cleans up cross-tab sync resources before delegating to the parent destroy.
	 * Ensures the BroadcastChannel is closed and event listeners are removed so the
	 * repository does not continue to react to storage events after disposal.
	 */
	destroy() {
		this._teardownCrossTabSync();
		super.destroy();
	}

};

SessionStorageRepository.className = 'SessionStorage';
SessionStorageRepository.type = 'session';

export default SessionStorageRepository;