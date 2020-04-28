/** @module Repository */

import OneBuildRepository from '../OneBuild';
import _ from 'lodash';

/**
 * This class is for sending commands to OneBuild apps.
 * It is intended for use only as the 'remote' portion of a
 * LocalFromRemoteRepository
 * 
 * @extends OneBuildRepository
 */
class CommandRepository extends OneBuildRepository {
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			api: {
				add: 'api/command',
				get: null,
				edit: null,
				delete: null,
			},
		};
		_.merge(this, defaults, config);
	}

	/**
	 * Override Ajax._finalizeSave because we *don't* want to automatically
	 * reload after the save.
	 */
	_finalizeSave = (promises) => {
		return this.axios.all(promises);
	}

}


CommandRepository.className = 'Command';
CommandRepository.type = 'command';

export default CommandRepository;
