/** @module Repository */

import EventEmitter from '@onehat/events';
import Repository from '../Repository.js';
import Command from './Command.js';
import moment from 'relative-time-parser'; // Notice this version of moment is imported from 'relative-time-parser', and may be out of sync with our general 'moment' package
import {
	v4 as uuid,
} from 'uuid';
import _ from 'lodash';

export const MODE_LOCAL_MIRROR = 'MODE_LOCAL_MIRROR';
export const MODE_COMMAND_QUEUE = 'MODE_COMMAND_QUEUE';
export const MODE_REMOTE_WITH_OFFLINE = 'MODE_REMOTE_WITH_OFFLINE';

/**
 * Class representing a (pseudo) Repository that has two sides: local, and remote.
 * Local can be any subclass of Repository where isLocal === true.
 * Remote can be any subclass of Repository where isRemote === true.
 * The most common use is for local to be an OfflineRepository and remote to be 
 * an AjaxRepository.
 * 
 * Note: This is not a true subclass of Repository. Instead, its properties
 * and methods are Proxy'd from the "ActiveRepository", either the local or remote,
 * depending upon operating mode.
 * 
 * Multiple operating modes:
 * - MODE_LOCAL_MIRROR
 * 	- This mode is for keeping local copies of data that doesn't change very often.
 * 	- *Add/Edit/Delete operations are disabled.*
 * 	- First time in use, it loads its data from remote.
 * 	- From then on, it primarily depends upon local.
 * 	- Keeps track of the last time it pulled down from remote.
 * 	- Can be set to reload its local data periodically, to make sure its data doesn't get too stale.
 * 
 * - MODE_COMMAND_QUEUE
 * 	- This mode provides the ability to send remote commands when isConnected,
 * and to queue them up in an offline manner when !isConnected.
 * 	- Items added locally are automatically transmitted to back-end when isConnected.
 * 	- Data only goes from local --> remote; not the other way around. 
 * However, we do get a response from the server on the returned object.
 * 	- Remote only uses C, not RUD
 * 	- Sort by date, transmit by date
 * 
 * NOTE: This mode is able to send commands of many different types, and have
 * specialized event handlers for each separate type. In order to do that,
 * this Repository becomes nothing more than a generic data transport pipeline between
 * client and server. The Entities it returns are representative of what was returned
 * from the server (raw payload, response info). In order to use these entities in any
 * kind of meaningful way, we process them into Command objects. Each Command type
 * can have its own set of processing handlers.
 * 
 * As a result, when operating in this mode, OneHatData::_createRepository forces this
 * Repository's remote repository type to be a CommandRepository.
 * 
 * 
 * - MODE_REMOTE_WITH_OFFLINE
 * 	- This mode provides an offline backup to the normal operation of remote.
 * 	- Normally uses remote, but automatically switches to local if necessary (i.e. if offline).
 * 	- Any changes made while offline will be saved to a queue, and then replayed to remote
 * when the remote source becomes available again
 * 
 * @extends EventEmitter
 */
class LocalFromRemoteRepository extends EventEmitter {

	constructor(config = {}) {
		super(...arguments);

		if (!config.local || !(config.local instanceof Repository)) {
			this.throwError('No local repository defined.');
			return;
		}
		if (!config.local.isLocal) {
			this.throwError('Local repository is not configured to be a local type.');
			return;
		}
		if (!config.remote || !(config.remote instanceof Repository)) {
			this.throwError('No remote repository defined.');
			return;
		}
		if (!config.remote.isRemote) {
			this.throwError('Remote repository is not configured to be a remote type.');
			return;
		}
		
		const defaults = {
			/**
			 * @member {string} id - Must be unique, if supplied. Defaults to UUID
			 */
			id: uuid(),

			/**
			 * @member {string} mode - The mode this Repository will operate in.
			 * Options: MODE_LOCAL_MIRROR || MODE_REMOTE_WITH_OFFLINE || MODE_COMMAND_QUEUE
			 * Defaults to MODE_LOCAL_MIRROR
			 */
			mode: MODE_LOCAL_MIRROR,

			/**
			 * @member {boolean} isAutoSync - Whether to auto sync this repository on initialization
			 */
			isAutoSync: false,

			/**
			 * @member {string} syncRate - Interval with which to sync local with remote.
			 * Format must be a relative time frame parseable with relative-time-parser's relativeTime() function.
			 * Examples: '+10 minutes', '+6 hours', '+1 day', '+1 week'
			 */
			syncRate: '+1 day',

			/**
			 * @member {string} retryRate - Interval with which to re-try syncing local with remote after a failure.
			 * Format must be a relative time frame parseable with relative-time-parser's relativeTime() function.
			 * Examples: '+10 minutes', '+6 hours', '+1 day', '+1 week'
			 */
			retryRate: '+1 minute',

			/**
			 * @member {boolean} useLongTimers - Whether to set "long" timers in JS. Sometimes React Native-Android has issues with this.
			 */
			useLongTimers: true,

			/**
			 * @member {boolean} isOnline - Whether the remote storage medium is available.
			 * This must be managed by outside software, calling setIsOnline at appropriate times.
			 * @private
			 */
			isOnline: true,

			/**
			 * Config var to be used in MODE_COMMAND_QUEUE mode
			 * This tells the LFR repository which commands will be initialized
			 * @member {array} commands - Names of commands
			 * @private
			 */
			commands: [],

		};
		_.merge(this, defaults, config);

		
		if (this.mode !== MODE_LOCAL_MIRROR && 
			this.mode !== MODE_REMOTE_WITH_OFFLINE && 
			this.mode !== MODE_COMMAND_QUEUE) {
			this.throwError('Mode not recognized.');
			return;
		}

		this.registerEvents([
			'beginSync',
			'endSync',
			'destroy',
			'error',
		]);

		/**
		 * @member {boolean} isSyncing - Whether this Repository is currently syncing
		 * @private
		 */
		this.isSyncing = false;

		/**
		 * @member {date} lastSync - Date of last sync operation between local and remote
		 * @private
		 */
		this.lastSync = null;


		// This ES6 Proxy allows us to create magic getters for all properties and methods
		// of the active Repository (local or remote)
		const oThis = this;
		this._proxy = new Proxy(this, {
			get (target, name, receiver) {
				if (name === 'then') { // special case, otherwise Promises break
					return Reflect.get(target, name, receiver);
				}
				if (!Reflect.has(target, name)) {
					const activeRepo = oThis._getActiveRepository();
					return activeRepo[name];
				}
				return Reflect.get(target, name, receiver);
			},
		});

		return this._proxy; // Return the Proxy, not 'this'
	}

	/**
	 * Initializes the Repository.
	 * - Relays all events from sub-repositories
	 */
	async initialize() {
		this.relayEventsFrom(this.remote, this.remote.getRegisteredEvents(), 'remote_');
		this.relayEventsFrom(this.local, this.local.getRegisteredEvents(), 'local_');

		// Relay events from activeRepository directly, without prefix
		const activeRepository = this._getActiveRepository();
		this.relayEventsFrom(activeRepository, activeRepository.getRegisteredEvents());

		// Set up and initialize commands
		if (this.mode === MODE_COMMAND_QUEUE) {
			this.setCheckReturnValues();
			const commands = this.commands; // copy config array into local var
			this.commands = {}; // reset the local var as an object, so we can index commands by name
			this.registerCommands(commands);
		}

		if (this.isAutoSync) {
			this._doAutoSync();
		}
	}

	/**
	 * Registers multiple commands for when syncing in MODE_COMMAND_QUEUE mode.
	 */
	registerCommands(commands, useDefaultHandler = true) {
		const oThis = this;
		_.each(commands, (name) => {
			if (!oThis.isRegisteredCommand(name)) {
				const command = new Command(name);
				if (useDefaultHandler) {
					command.useDefaultHandler();
				}
				oThis.commands[name] = command;
			}
		});
	}

	/**
	 * Adds a handler to a registered command.
	 * @param {string} name - The command name
	 * @return {function} handler - The handler function
	 */
	registerCommandHandler(name, handler) {
		const command = this.getCommand(name);
		if (!command) {
			return false;
		}

		command.registerHandler(handler);
	}


	/**
	 * Removes a handler from a registered command.
	 * @param {string} name - The command name
	 * @return {function} handler - The handler function
	 */
	unregisterCommandHandler(name, handler) {
		const command = this.getCommand(name);
		if (!command) {
			return false;
		}

		command.unregisterHandler(handler);
	}

	/**
	 * Checks to see if command has been registered.
	 * @param {string} name - The command name
	 * @return {boolean} isRegisteredCommand
	 */
	isRegisteredCommand(name) {
		return _.indexOf(this.commands, name) !== -1;
	}

	/**
	 * Gets a registered command.
	 * @param {string} name - The command name
	 * @return {boolean} isRegisteredCommand
	 */
	getCommand(name) {
		return this.commands[name] || null;
	}

	/**
	 * Adds a hook into the normal Repository.add() method,
	 * so we can sync immediately after add for MODE_COMMAND_QUEUE mode.
	 */
	async add(data) {
		// NORMAL PROCESS, basically call super()
		// This adds to the local repository, so we can sync later,
		// if needed.
		const normalAdd = await this._getActiveRepository().add(data);
		if (this.mode !== MODE_COMMAND_QUEUE || !this.isOnline) {
			return normalAdd;
		}
		
		// MODE_COMMAND_QUEUE -- try to sync now!
		return await this.sync(normalAdd);
	}

	/**
	 * Syncs local and remote repositories, based on operation mode.
	 */
	async sync(entity, callback = null) {

		if (this.debugMode) {
			console.log('sync');
		}

		try {
			if (!this.isOnline) {
				this._doAutoSync(true);
				return;
			}

			this.isSyncing = true;
			this.emit('beginSync', this);

			let remoteData;

			switch (this.mode) {
				case MODE_LOCAL_MIRROR:
		
					// Load remote data into local
					// Local <-- Remote
					if (!this.remote.isAutoLoad) {
						await this.remote.load();
					}

					remoteData = this.remote.getOriginalData();
					await this.local.load(remoteData);

					if (!this.local.isAutoSave) {
						await this.local.save();
					}
					
					await this._setLastSync();

					break;

				case MODE_COMMAND_QUEUE:
					const localItems = entity ? [entity] : this.local.getBy(entity => !entity.response);
					let i, localItem;
					for (i = 0; i < localItems.length; i++) {
						localItem = localItems[i];

						let command = this.commands[localItem.command];

						if (!command) {
							this.throwError('Command ' + localItem.command + ' not registered');
							return;
						}
						if (!command.hasHandlers()) {
							this.throwError('No command handler registered for ' + localItem.command);
							return;
						}

						// local --> remote
						const remoteItem = await this.remote.add(localItem.getOriginalData());
						if (!this.remote.isAutoSave) {
							await this.remote.save();
						}
	
						// local <-- remote
						await localItem.loadOriginalData(remoteItem.getOriginalData());
						this.remote.clear();

						// Handle the server's response
						await command.processResponse(localItem);

						// let shouldDelete = true;
						// try {
						// 	shouldDelete = await handler.call(this, localItem);
						// } catch(error) {
						// 	this.emit('error', error.message);
						// }
						// if (shouldDelete) {
						// 	await this.local.delete(localItem);
						// }
					}
					
					await this._setLastSync();

					if (entity) {
						return entity;
					}
					break;

				case MODE_REMOTE_WITH_OFFLINE:

					this.throwError('Not implemented');
					return;

					// Load remote data into local
					// Local <-- Remote
					if (!this.remote.isAutoLoad) {
						await this.remote.load();
					}

					remoteData = this.remote.getOriginalData();
					await this.local.load(remoteData);

					if (!this.local.isAutoSave) {
						await this.local.save();
					}
					
					await this._setLastSync();

					break;
				
					// Load remote
		
					// Compare it to local
		
					// Find all local new, edited, and deleted records.
					// Should we push these changes to server immediately?
					// How do we know which to use as master (local or remote)?
					// i.e. What do we do if they get out of sync?
		
					// If no changes to push, just reload remote and then save
					
			}

		} catch(error) {
			if (this.debugMode) {
				const msg = error && error.message;
				debugger;
			}
		} finally {
			this.isSyncing = false;
			this.emit('endSync', this);
			if (callback) {
				callback();
			}
		}
	
	}

	/**
	 * Sync on a regular schedule.
	 * Two operating modes: isRetry or !isRetry.
	 * If !isRetry, then we're just doing a regular autoSync.
	 * This will schedule the next sync based on nextDue.
	 * 
	 * if isRetry, we are retrying to sync, due to being offline.
	 * This will schedule the next sync based on nextRetryDate.
	 */
	async _doAutoSync(isRetry = false) {

		const now = moment(),
			nowMs = now.valueOf();
		let lastSync = await this.getLastSync(),
			nextSync = this.getNextSync(),
			nextSyncMs = nextSync.valueOf(),
			nextRetry = this.getNextRetry(),
			nextRetryMs = nextRetry.valueOf(),
			ms = (isRetry ? nextRetryMs : nextSyncMs) - nowMs,
			hours = ms / 1000 / 60 / 60;
		
		if (ms < 0) {
			// Sync now
			await this.sync();

			// Now figure out the NEXT sync time
			lastSync = await this.getLastSync();
			nextSync = this.getNextSync();
			nextSyncMs = nextSync.valueOf();
			nextRetry = this.getNextRetry();
			nextRetryMs = nextRetry.valueOf();
			ms = (isRetry ? nextRetryMs : nextSyncMs) - nowMs;
			hours = ms / 1000 / 60 / 60;
		}

		// console.log({
		// 	ms,
		// 	hours,
		// 	now: now.format('lll'),
		// 	nowMs,
		// 	lastSync: lastSync && lastSync.format('lll'),
		// 	nextSync: nextSync.format('lll'),
		// 	nextSyncMs,
		// 	nextRetry: nextRetry.format('lll'),
		// 	nextRetryMs,
		// });

		if (this._timeout) {
			clearTimeout(this._timeout);
		}

		if (ms < 0) {
			// It just synced. Should not need to sync again right now!
			// This is basically an error condition, but we suppress this error
			// and simply don't sync.
			return;
		}

		if (ms < 60000 || this.useLongTimers) {
			this._timeout = setTimeout(async () => {
				// await this.sync();
				if (!isRetry) {
					this._doAutoSync(); // Set up next autosync timer
				}
			}, ms);
		}
	}

	/**
	 * Gets lastSync from private variable, 
	 * or from local storage medium, if possible.
	 */
	async getLastSync() {
		if (!this.lastSync && this.local.getLastSync) {
			const lastSync = await this.local.getLastSync();
			// const lastSync = null;
			if (lastSync) {
				this.lastSync = lastSync;
			}
		}
		return this.lastSync;
	}

	getLastModifiedDate() {
		return this.remote.getLastModifiedDate();
	}

	/**
	 * Sets lastSync to now and saves to local storage medium, if possible.
	 * @private
	 */
	async _setLastSync() {
		if (!this.local.entities.length) {
			return; // don't set sync date if nothing was synced
		}

		const now = moment();
		this.lastSync = now;
		if (this.local.setLastSync) {
			await this.local.setLastSync(now.format());
		}
	};

	getNextRetry() {
		const date = moment().relativeTime(this.retryRate);
		if (!isNaN(date) && date.isValid()) {
			return date;
		}
		return null;
	}

	getNextSync() {
		const oneMinuteAgo = moment().relativeTime('-1 minute');
		if (!this.lastSync) {
			return oneMinuteAgo;
		}
		if (this.isOnline && this.needsSync) {
			return oneMinuteAgo;
		}

		const date = this.lastSync.relativeTime(this.syncRate);
		if (!isNaN(date) && date.isValid()) {
			return date;
		}
		return null;
	}

	get needsSync() {
		if (this.mode === MODE_LOCAL_MIRROR) {
			if (!_.isEmpty(this.local.getNonPersisted()) || 
				!_.isEmpty(this.local.getDirty()) || 
				!_.isEmpty(this.local.getDeleted())
			) {
				return true;
			}
		}

		if (this.mode === MODE_COMMAND_QUEUE) {
			const unsynced = this.local.getBy(entity => !entity.response);
			if (unsynced.length) {
				return true;
			}
		}

		return this.nextSyncDate < moment();
	}

	/**
	 * Gets the active Repository, based on this.mode
	 * @return {object} repository
	 * @private
	 */
	_getActiveRepository() {
		switch(this.mode) {
			case MODE_LOCAL_MIRROR:
			case MODE_COMMAND_QUEUE:
				return this.local;
			case MODE_REMOTE_WITH_OFFLINE:
				if (this.isOnline) {
					return this.remote;
				}
				return this.local;
		}
	}

	/**
	 * Sets autoSync. If autoSync is enabled, it immediately starts autosync process.
	 */
	async setAutoSync(isAutoSync) {
		let isChanged = false
		if (this.isAutoSync !== isAutoSync) {
			isChanged = true;
			this.isAutoSync = isAutoSync;
			if (isAutoSync) {
				await this._doAutoSync();
			} else {
				clearTimeout(this._timeout);
			}
		}
		return isChanged;
	}

	/**
	 * Sets options on the repositories.
	 */
	setOptions(options) {
		this.local.setOptions(options);
		this.remote.setOptions(options);
	}

	/**
	 * Sets isOnline. If isOnline and autoSync is enabled, it immediately starts isAutosync process.
	 */
	setIsOnline(isOnline) {
		this.isOnline = !!isOnline; // force convert type to boolean
		if (isOnline && this.isAutoSync) {
			this._doAutoSync();
		}
	}

	get className() {
		return this.__proto__.constructor.className;
	}

	get type() {
		return this.__proto__.constructor.type;
	}

	/**
	 * Destroy this object.
	 * - Removes child objects
	 * - Removes event listeners
	 * @fires destroy
	 */
	destroy() {
		this.local.destroy();
		this.remote.destroy();
		if (this._timeout) {
			clearTimeout(this._timeout);
		}
		_.each(this.commands, (command) => {
			command.destroy();
		});

		this.emit('destroy');
		this.isDestroyed = true;
		
		this.removeAllListeners();
	}

};

LocalFromRemoteRepository.className = 'LocalFromRemote';
LocalFromRemoteRepository.type = 'lfr';

export default LocalFromRemoteRepository;