import React, { useState, useEffect } from 'react';
import oneHatData from '@onehat/data';
import _ from 'lodash';

/**
 * NOTE: This file will *NOT* work as a direct import to your project,
 * since 'React' is not in scope within the @onehat/data module.
 * This file is provided as an example only!
 * You will need to copy this file into your own project and import it from there.
 */

/**
 * Custom React Hook.
 * Enables two-way communication between a React component and OneHatData.
 * @param {string|object} schemaName - The name of the Schema you want to use. 
 * Alternately, this can be a Repository config object, in which case a unique Repository will be created
 * @param {boolean} uniqueRepository - Create and use a unique Repository 
 * for just this one component, or get the Repository bound to the supplied Schema?
 * @return {array} [entities, repository] - *entities* contains the activeEntities 
 * of the repository. *repository* is the repository itself, which the component
 * can use to call actions on the repository, like refresh() or sort() or filter()
 */
export default function useOneHatData(schemaName, uniqueRepository = false) {

	const [repository, setRepository] = useState(),
		[entities, setEntities] = useState([]);

	useEffect(() => {

		let repository;
		if (uniqueRepository) {
			repository = oneHatData.createRepository(schemaName);
		} else if (_.isObject(schemaName)) {
			if (schemaName.id) {
				repository = oneHatData.getRepositoryById(schemaName.id);
			}
			if (!repository) {
				throw new Error('Not yet implemented.'); // createRepository needs to be async, but the rest of this useEffect needs to be syncronous. Need to rework it, but don't have the time now.
				repository = oneHatData.createRepository(schemaName)
			}
		} else {
			repository = oneHatData.getRepository(schemaName); // Get bound Repository for this schema
		}

		setRepository(repository);
		setEntities(repository.entities);

		// Create & assign event handler for 'changeData'
		const onChangeData = () => {
			setEntities(repository.entities); // Set new state in component
		};
		repository.on('changeData', onChangeData);

		return () => {
			repository.off('changeData', onChangeData);
			if (uniqueRepository) {
				oneHatData.deleteRepository(schemaName);
			}
		};
		
	}, []); // '[]' to make this effect run only once

	return [entities, repository];
}