/** @module Repository */

import AjaxRepository from './Ajax.js';
import _ from 'lodash';

/**
 * This class contains overrides of default methods in
 * AjaxRepository that are appropriate for REST APIs.
 * 
 * @extends AjaxRepository
 */
class RestRepository extends AjaxRepository {
	constructor(config = {}) {
		super(...arguments);

		const defaults = {
			methods: {
				add: 'POST',
				get: 'GET',
				edit: 'PUT',
				delete: 'DELETE',
			},
		};
		
		_.merge(this, defaults, config);
	}
}

RestRepository.className = 'Rest';
RestRepository.type = 'rest';

export default RestRepository;
