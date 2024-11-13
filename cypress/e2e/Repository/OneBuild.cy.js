import { OneHatData } from '../../../src/OneHatData.js';
import UsersDefinition from '../../fixtures/Definitions/Users.js';
import GroupsDefinition from '../../fixtures/Definitions/Groups.js';
import UserData from '../../fixtures/Data/User.js';
import _ from 'lodash';

const baseURL = Cypress.env('baseURL'),
	creds = {
		username: Cypress.env('username'),
		password: Cypress.env('password'),
	};

describe('OneBuildRepository', function() {
	beforeEach(function() {
		this.oneHatData = new OneHatData();
		this.oneHatData
			.setRepositoryGlobals({
				api: {
					baseURL,
				},
			})
			.createSchemas([
				UsersDefinition,
				GroupsDefinition,
			]);

		return cy.wrap((async () => {
			await this.oneHatData.createBoundRepositories();
		})()).then(() => {
			this.repository = this.oneHatData.getRepository('Users');
		});
	});

	// Don't auto-destroy after each test. It was causing all kinds of weird bugs,
	// because tests are async, and some events were firing after destroy()
	// afterEach(function() {
	// 	this.oneHatData.destroy();
	// });

	// function login() {
	// 	const oThis = this;
	// 	return new Promise((resolve) => {
	// 		oThis.repository.ons(['login', 'err'], (result) => {
	// 			resolve(result);
	// 		});
	// 		oThis.repository.login(creds);
	// 	});
	// }

	it('_onChangeFilters combines two filters correctly for params', function() {
		this.repository.filter([
			{
				name: 'key1',
				value: '1',
			},
			{
				name: 'key2',
				value: '2',
			},
		]);
		const p = this.repository._params;
		
		expect(p.conditions.key1).to.be.eq('1');
		expect(p.conditions.key2).to.be.eq('2');
	});

	it('merge from lodash', function() {
		const
			a = {
				test: true,
			},
			b = {
				foo: true,
			};
		let c;
		const bar = _.merge({}, a, b, c);

		expect(_.isEqual(a, { test: true })).to.be.true;
		expect(_.isEqual(b, { foo: true })).to.be.true;
		expect(_.isEqual(bar, { test: true, foo: true })).to.be.true;
	});

	it.skip('401', function() {
		cy.wrap((async () => {

			let loggedOut = false,
				isError = false;
			this.oneHatData.on('logout', function() { // NOTE: We are listening to the global oneHatData object, not just the individual repository
				loggedOut = true;
			});
			try {
				await this.repository.load();
			} catch(e) {
				isError = true;
			}
			if (!isError) {
				expect(loggedOut).to.be.true;
			} else {
				throw Error('404 error! Maybe set baseUrl?')
			}

		})());
	});

	describe.skip('load', function() {

		it('login', function() {
			(async () => {
				
				const userData = await this.repository.login(creds);
				expect(userData.id).to.be.eq(1);

			})();
		});

		it('load all', function() {
			const repository = this.repository;
			(async () => {
				await repository.load();
				expect(_.size(repository.entities)).to.be.eq(10);
				expect(repository.page).to.be.eq(1);
			})();
		});

		it('load size 4', function() {
			const repository = this.repository;
			(async () => {
				repository.setPageSize(4);
				await repository.load();
				expect(_.size(this.repository.entities)).to.be.eq(4);
			})();
		});

		it('load page 2, size 7, then next page', function() {
			let repository;
			(async () => {
				repository = await this.oneHatData.createRepository({
					schema: 'Users',
					page: 2,
					pageSize: 7,
				});
				await repository.load();
				expect(_.size(repository.entities)).to.be.eq(7);
				expect(repository.page).to.be.eq(2);

				await repository.nextPage();
				expect(_.size(repository.entities)).to.be.eq(7);
				expect(repository.page).to.be.eq(3);
			})();

		});

		it('filter', function() {
			const repository = this.repository;
			(async () => {
				repository.filter('users__first_name', 'Josh');
				await repository.load();
				expect(_.size(repository.entities)).to.be.eq(1);
			})();
		});

		it('logout', function() {
			const repository = this.repository;
			(async () => {
				repository.filter('users__first_name', 'Josh');
				const result = await repository.logout();
				expect(result).to.be.true;
			})();
		});

	});

	describe.skip('CRUD', function() {

		const repository = this.repository;
		let id;

		it('login', function() {
			(async () => {
				debugger;
				const userData = await repository.login(creds);
				expect(userData.id).to.be.eq(1);
			})();
		});

		it('add', function() {
			(async () => {
				
				expect(_.size(repository.entities)).to.be.eq(0);
				const entity = await repository.add(UserData);
				id = entity.id; // Save new ID for use in later tests

				expect(_.size(repository.entities)).to.be.eq(1);

			})();
		});

		it('edit', function() {
			(async () => {
				
				// Load Remote Data
				await repository.setPageSize(100);
				await repository.load();

				// Edit the data
				const entity = repository.getById(id);
				expect(!!entity).to.be.true;
				await entity.setValue('users__first_name', 'Bob');

				const entity2 = repository.getById(id);
				expect(entity2.users__first_name).to.be.eq('Bob');

			})();
		});

		it('delete', function() {
			(async () => {
				
				// Load Remote Data
				await repository.setPageSize(100);
				await repository.load();

				// Delete the data
				const entity = repository.getById(id);
				await entity.delete();

				const result = repository.getById(id);
				expect(result).to.be.null;
			})();
		});

	});

});