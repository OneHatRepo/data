import { OneHatData } from '../../src/OneHatData.js';
import GroupsDefinition from '../fixtures/Definitions/Groups.js';
import GroupsUsersDefinition from '../fixtures/Definitions/GroupsUsers.js';
import UsersDefinition from '../fixtures/Definitions/Users.js';
import groupsUserData from '../fixtures/Data/GroupsUser.js';
import KeyValues from '../../src/Schema/KeyValues.js';


// NOTE: Cypress can't handle async functions for beforeEach,
// so we have to manually apply it to every test. Ugh!
async function beforeEach(that) {
	that.oneHatData = new OneHatData();
	that.schema = that.oneHatData.createSchema({
		name: 'bar',
		model: {
			idProperty: 'key',
			displayProperty: 'value',
			properties: [
				{ name: 'key', },
				{ name: 'value', },
			],
		},
		repository: 'memory',
	});
	await that.oneHatData.createRepository({
		id: 'foo',
		schema: that.schema,
	}, true);
	that.repository = that.oneHatData.getRepositoryById('foo');
}
function afterEach(that) {
	that.oneHatData.destroy();
}

describe('OneHatData', function() {

	it('createSchema', function() {
		(async function() {
			await beforeEach();
	
			expect(this.schema.name).to.be.eq('bar');
			const result = this.oneHatData.schemas;
			expect(_.size(result)).to.be.eq(1);
			
			afterEach();
		})();
	});

	it('createSchemas', function() {
		(async function() {
			await beforeEach();

			this.oneHatData.createSchemas([
				{ name: 'foo', },
				// { name: 'bar', }, // already exists
				{ name: 'baz', },
			]);
			const result = this.oneHatData.schemas;
			expect(_.size(result)).to.be.eq(3);

			afterEach();
		})();
	});

	it('hasSchemaWithName', function() {
		(async function() {
			await beforeEach();

			const name = this.schema.name;
			expect(this.oneHatData.hasSchemaWithName(name)).to.be.true;

			afterEach();
		})();
	});

	it('deleteSchema', function() {
		(async function() {
			await beforeEach();

			const name = this.schema.name;
			this.oneHatData.deleteSchema(name);
			expect(this.oneHatData.hasSchemaWithName(name)).to.be.false;

			afterEach();
		})();
	});

	it('getSchema', function() {
		(async function() {
			await beforeEach();

			const name = this.schema.name,
			schema = this.oneHatData.getSchema(name);
			expect(schema).to.be.eq(this.schema);

			afterEach();
		})();
	});

	it('getSchemasBy', function() {
		(async function() {
			await beforeEach();

			const name = this.schema.name,
			result = this.oneHatData.getSchemasBy((schema) => {
				return schema.name === name;
			});
			expect(result[0]).to.be.eq(this.schema);

			afterEach();
		})();
	});

	it('createRepository', function() {
		(async function() {
			await beforeEach();

			expect(this.repository.id).to.be.eq('foo');

			afterEach();
		})();
	});

	it('createRepository - unique', function() {
		(async function() {
			await beforeEach();

			const repository = await this.oneHatData.createRepository('bar');
			expect(repository.id).to.be.not.eq(this.repository.id);

			afterEach();
		})();
	});

	it('createRepositories', function() {
		(async function() {
			await beforeEach();

			const oneHatData = new OneHatData();
			oneHatData.createSchemas([
				{ name: 'foo', },
				{ name: 'bar', },
				{ name: 'baz', },
			]);
			const schemas = oneHatData.schemas;
			await oneHatData.createRepositories(schemas);
	
			const result = oneHatData.getAllRepositories();
			expect(_.size(result)).to.be.eq(3);

			afterEach();
		})();
	});

	it('createBoundRepositories', function() {
		(async function() {
			await beforeEach();

			const oneHatData = new OneHatData();
			oneHatData.createSchemas([
				{ name: 'foo', },
				{ name: 'bar', },
				{ name: 'baz', },
			]);
			await oneHatData.createBoundRepositories();
	
			const schemas = oneHatData.schemas;
			let bound = 0;
			_.each(schemas, (schema) => {
				if (schema.getBoundRepository()) {
					bound++;
				}
			});
	
			expect(bound).to.be.eq(3);

			afterEach();
		})();
	});

	it('deleteRepository', function() {
		(async function() {
			await beforeEach();

			const id = this.repository.id;
			this.oneHatData.deleteRepository(id);
			expect(this.oneHatData.hasRepositoryWithId(id)).to.be.false;

			afterEach();
		})();
	});

	it('hasRepository', function() {
		(async function() {
			await beforeEach();

			const oneHatData = new OneHatData();
			oneHatData.createSchemas([
				{ name: 'foo', },
			]);
			await oneHatData.createBoundRepositories();
			expect(oneHatData.hasRepository('foo')).to.be.true;

			afterEach();
		})();
	});

	it('Entity.getAssociatedRepository', function() {
		(async function() {
			await beforeEach();

			const oneHatData = new OneHatData();

			await oneHatData.createSchemas([
				GroupsDefinition,
				GroupsUsersDefinition,
				UsersDefinition,
			]);
			await oneHatData.createBoundRepositories();
			const GroupsUsers = oneHatData.getRepository('GroupsUsers');
			const groupsUser = await GroupsUsers.add(groupsUserData);
			const Users = groupsUser.getAssociatedRepository('Users');

			expect(Users).to.be.not.null;

			afterEach();
		})();
	});

	it('hasRepositoryWithId', function() {
		(async function() {
			await beforeEach();

			expect(this.oneHatData.hasRepositoryWithId('foo')).to.be.true;

			afterEach();
		})();
	});

	it('getAllRepositories', function() {
		(async function() {
			await beforeEach();

			const result = this.oneHatData.getAllRepositories();
			expect(_.size(result)).to.be.eq(1);

			afterEach();
		})();
	});

	it('getRepository', function() {
		(async function() {

			await beforeEach();

			const result = that.oneHatData.getRepository('bar');
			expect(result).to.be.eq(that.repository);

			afterEach();
		})();
	});

	it('getUniqueRepository', function() {
		(async () => {
			const that = {};
			await beforeEach(that);

			const
				repo1 = that.oneHatData.getRepository('bar'),
				repo2 = that.oneHatData.getRepository('bar', true);
			expect(repo1 !== repo2).to.be.true;

			afterEach(that);
		})();
	});

	it('getRepositoriesBy', function() {
		(async function() {
			await beforeEach();

			const result = this.oneHatData.getRepositoriesBy((repository) => {
				return repository.id === 'foo';
			});
			expect(result[0]).to.be.eq(this.repository);

			afterEach();
		})();
	});

	it('getRepositoriesBy - first', function() {
		(async function() {
			await beforeEach();

			const result = this.oneHatData.getRepositoriesBy((repository) => {
				return repository.id === 'foo';
			}, true);
			expect(result).to.be.eq(this.repository);

			afterEach();
		})();
	});

	it('getRepositoryById', function() {
		(async function() {
			await beforeEach();

			const result = this.oneHatData.getRepositoryById('foo');
			expect(result).to.be.eq(this.repository);

			afterEach();
		})();
	});

	it('getRepositoriesBySchema', function() {
		(async function() {
			await beforeEach();

			const oneHatData = this.oneHatData;
			await oneHatData.createRepository('bar');
			await oneHatData.createRepository('bar');
			await oneHatData.createRepository('bar');
			const result = oneHatData.getRepositoriesBySchema(this.schema);
			expect(_.size(result)).to.be.eq(4);

			afterEach();
		})();
	});

	// it('createGlobalErrorHandler', function() {
	// 	(async function() {
	// 		await beforeEach();

	// 		let message = '';
	// 		const oneHatData = this.oneHatData,
	// 			errorHandler = (a, b) => {
	// 				debugger;
	// 			};
	// 		oneHatData.createGlobalErrorHandler(errorHandler);
	// 		oneHatData.emitError();
	// 		expect(message).to.be.eq('Test here');

	// 		afterEach();
	// 	})();
	// });

	it('setOptionsOnAllRepositories', function() {
		(async function() {
			await beforeEach();

			const oneHatData = this.oneHatData;
			oneHatData.setOptionsOnAllRepositories({
				test: 1,
			});
			const repository = oneHatData.getRepository('bar');
			expect(repository.test).to.be.eq(1);

			afterEach();
		})();
	});

	it('isEntity', async function() {
		(async function() {
			await beforeEach();
			const oneHatData = this.oneHatData;
			const repository = oneHatData.getRepository('bar');
			const entity = await repository.add({ key: 1, value: 'value', });

			expect(isEntity(entity)).to.be.true;
			expect(isEntity({})).to.be.false;
			expect(isEntity(2)).to.be.false;
			expect(isEntity([1,2])).to.be.false;

			afterEach();
		})();
	});

	it('destroy', function() {
		(async function() {
			await beforeEach();

			this.oneHatData.destroy();
			const result = this.oneHatData.isDestroyed;
			expect(result).to.be.true;

			afterEach();
		})();
	});

	it('chains creation of schemas and repos', function() {
		(async function() {
			await beforeEach();

			const oneHatData = new OneHatData();

			await oneHatData.createSchemas([
					{ name: 'foo', },
					{ name: 'bar', },
					{ name: 'baz', },
				])
				.createBoundRepositories();
			
			// NOTE: Can't chain getAllRepositories() because we have to wait for createBoundRepositories to finish
			const repositories = oneHatData.getAllRepositories();
			expect(_.size(repositories)).to.be.eq(3);

			afterEach();
		})();
	});

	it('real-world example', function() {
		(async function() {
			await beforeEach();

			const oneHatData = new OneHatData(),
				data = [
					{ key: '1', value: 'one', },
					{ key: '2', value: 'two', },
					{ key: '3', value: 'three', },
					{ key: '4', value: 'four', },
					{ key: '5', value: 'five', },
				],
				repository = await oneHatData.createRepository({
					schema: KeyValues,
					data,
				});

			// See if initial data load was successful,
			// and parsedData matches initial data
			repository.sort('key');
			let parsedData = repository.getRawValues();
			expect(_.isEqual(data, parsedData)).to.be.true;


			// this.repository.setAutoSave(true);
			let firedChangeData = false;
			repository.on('changeData', () => {
				firedChangeData = true;
			});

			repository.getById(2).value = 'Test'

			expect(firedChangeData).to.be.true;


			parsedData = repository.getRawValues();
			expect(_.isEqual([
				{ key: '1', value: 'one', },
				{ key: '2', value: 'Test', },
				{ key: '3', value: 'three', },
				{ key: '4', value: 'four', },
				{ key: '5', value: 'five', },
			], parsedData)).to.be.true;

			afterEach();
		})();
	});

	it('createRepository - LFR', async function() {
		const oneHatData = new OneHatData();
		oneHatData
			.setRepositoryGlobals({
				debugMode: true,
			})
			.createSchemas({
				name: 'bar',
				repository: {
					type: 'lfr',
					autoSync: true,
					local: {
						type: 'memory',
						autoLoad: false,
						isRemote: false,
						isLocal: true,
					},
					remote: {
						type: 'memory',
						autoLoad: false,
						isRemote: true, // hack
						isLocal: false,
					},
				}
			})
			.createBoundRepositories()
			.then(() => {
				const repository = oneHatData.getRepository('bar');
				expect(repository.name).to.be.eq('bar');
			});
	});

});