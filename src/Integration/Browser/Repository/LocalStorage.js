/** @module Repository */

import OfflineRepository from '@onehat/data/src/Repository/Offline.js';
import store from 'store2'; // see: https://github.com/nbubna/store#readme
import _ from 'lodash';
import { CROSS_TAB_CHANNEL_NAME, CROSS_TAB_MESSAGE_TYPE, CROSS_TAB_EVENT_NAME } from './crossTabConstants.js';

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

		// crossTabSync defaults
		this._crossTabSyncEnabled = config.crossTabSync === true;
		this._crossTabChannelName = config.crossTabChannelName || CROSS_TAB_CHANNEL_NAME;
		this._crossTabChannel = null;
		this._onCrossTabStorageEvent = null;
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
	 * Initialises cross-tab change notification.
	 * Prefers BroadcastChannel (direct messaging, all modern browsers) and falls back to
	 * the native window 'storage' event, which browsers fire in every *other* tab whenever
	 * localStorage is mutated.
	 */
	_setupCrossTabSync() {
		if (!this._crossTabSyncEnabled || typeof window === 'undefined') {
			return;
		}

		if (typeof BroadcastChannel !== 'undefined') {
			this._crossTabChannel = new BroadcastChannel(this._crossTabChannelName);
			this._onCrossTabMessageEvent = this._handleBroadcastMessage.bind(this);
			this._crossTabChannel.addEventListener('message', this._onCrossTabMessageEvent);
			return;
		}

		if (_.isFunction(window.addEventListener)) {
			this._onCrossTabStorageEvent = this._handleStorageEvent.bind(this);
			window.addEventListener('storage', this._onCrossTabStorageEvent);
		}
	}

	/**
	 * _teardownCrossTabSync
	 * 
	 * Removes all cross-tab listeners and closes the BroadcastChannel.
	 * Called from destroy() to prevent memory leaks and stale event handlers after
	 * the repository is no longer in use.
	 */
	_teardownCrossTabSync() {
		if (typeof window !== 'undefined' && _.isFunction(window.removeEventListener) && this._onCrossTabStorageEvent) {
			window.removeEventListener('storage', this._onCrossTabStorageEvent);
			this._onCrossTabStorageEvent = null;
		}

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
	 * 
	 * Returns the fully-qualified storage key that store2 uses for a given entry name.
	 * store2 namespaces keys with a prefix derived from the schema name, so the raw
	 * key and the actual localStorage key differ. Broadcasting the namespaced key lets
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
	 * Filters out messages that are not storage-change notifications, messages
	 * originating from this same repository instance (echo prevention), and messages
	 * intended for a different repository, then re-emits the change locally.
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
	 * _handleStorageEvent
	 * 
	 * Handles the native window 'storage' event, which fires in every tab *except*
	 * the one that made the change. Used as a fallback when BroadcastChannel is
	 * unavailable. Filters to keys belonging to this repository's store2 namespace,
	 * then derives the operation from whether the new value is null (delete) or not.
	 */
	_handleStorageEvent(event) {
		if (!event || !event.key) {
			return;
		}
		const namespace = this._store?._ns;
		if (!namespace || !event.key.startsWith(namespace)) {
			return;
		}

		const key = event.key.replace(namespace, '');
		if (!key) {
			return;
		}

		this._emitCrossTabStorageChange({
			source: 'storage',
			operation: _.isNil(event.newValue) ? 'delete' : 'set',
			key,
			namespacedKey: event.key,
			timestamp: Date.now(),
		});
	}

	/**
	 * Posts a structured message to the BroadcastChannel so other tabs can react
	 * to a storage mutation made in this tab. Only called when BroadcastChannel is
	 * available; the storage-event fallback path does not require an explicit broadcast
	 * because the browser fires the 'storage' event automatically.
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

			const result = this._store(name, value);
			this._broadcastStorageChange(name, 'set');
			return result;

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

			const result = this._store.remove(name);
			this._broadcastStorageChange(name, 'delete');
			return result;

		} catch (error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		}
	}

	clearAll() {
		const result = this._store.clearAll();
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

LocalStorageRepository.className = 'LocalStorage';
LocalStorageRepository.type = 'local';

export default LocalStorageRepository;