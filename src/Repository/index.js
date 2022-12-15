/** @module Repository */

import AjaxRepository from './Ajax.js';
import CommandRepository from './LocalFromRemote/CommandRepository.js';
import LocalFromRemoteRepository from './LocalFromRemote/index.js';
import MemoryRepository from './Memory.js';
import NullRepository from './Null.js';
import OneBuildRepository from './OneBuild.js';
import RestRepository from './Rest.js';

const CoreRepositoryTypes = {
	[AjaxRepository.type]: AjaxRepository,
	[CommandRepository.type]: CommandRepository,
	[LocalFromRemoteRepository.type]: LocalFromRemoteRepository,
	[MemoryRepository.type]: MemoryRepository,
	[NullRepository.type]: NullRepository,
	[OneBuildRepository.type]: OneBuildRepository,
	[RestRepository.type]: RestRepository,
};

export default CoreRepositoryTypes;
