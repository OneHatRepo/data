/** @module Repository */

import AjaxRepository from './Ajax';
import CommandRepository from './LocalFromRemote/CommandRepository';
import LocalFromRemoteRepository from './LocalFromRemote';
import MemoryRepository from './Memory';
import NullRepository from './Null';
import OneBuildRepository from './OneBuild';
import RestRepository from './Rest';

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
