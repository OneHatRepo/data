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

	it('createSchema', async function() {
		await beforeEach(this);

		expect(this.schema.name).to.be.eq('bar');
		const sizeBefore = _.size(this.oneHatData.schemas);

		const newSchema = this.oneHatData.createSchema({
			name: 'bazCreateSchema',
			model: {
				idProperty: 'id',
				displayProperty: 'name',
				properties: [
					{ name: 'id' },
					{ name: 'name' },
				],
			},
			repository: 'memory',
		});

		expect(newSchema.name).to.be.eq('bazCreateSchema');
		expect(_.size(this.oneHatData.schemas)).to.be.eq(sizeBefore +1);

		afterEach(this);
	});

	it('createSchemas', async function() {
		await beforeEach(this);
		const sizeBefore = _.size(this.oneHatData.schemas);

		this.oneHatData.createSchemas([
			{ name: 'fooCreateSchemas' },
			{ name: 'bazCreateSchemas' },
		]);
		expect(this.oneHatData.hasSchemaWithName('fooCreateSchemas')).to.be.true;
		expect(this.oneHatData.hasSchemaWithName('bazCreateSchemas')).to.be.true;
		expect(_.size(this.oneHatData.schemas)).to.be.eq(sizeBefore +2);

		afterEach(this);
	});

	it('hasSchemaWithName', async function() {
		await beforeEach(this);

		const name = this.schema.name;
		expect(this.oneHatData.hasSchemaWithName(name)).to.be.true;

		afterEach(this);
	});

	it('deleteSchema', async function() {
		await beforeEach(this);

		const name = this.schema.name;
		this.oneHatData.deleteSchema(name);
		expect(this.oneHatData.hasSchemaWithName(name)).to.be.false;

		afterEach(this);
	});

	it('getSchema', async function() {
		await beforeEach(this);

		const name = this.schema.name,
		schema = this.oneHatData.getSchema(name);
		expect(schema).to.be.eq(this.schema);

		afterEach(this);
	});

	it('getSchemasBy', async function() {
		await beforeEach(this);

		const name = this.schema.name,
		result = this.oneHatData.getSchemasBy((schema) => {
			return schema.name === name;
		});
		expect(result[0]).to.be.eq(this.schema);

		afterEach(this);
	});

	it('createRepository', async function() {
		await beforeEach(this);

		expect(this.repository.id).to.be.eq('foo');

		afterEach(this);
	});

	it('createRepository - unique', async function() {
		await beforeEach(this);

		const repository = await this.oneHatData.createRepository('bar');
		expect(repository.id).to.be.not.eq(this.repository.id);

		afterEach(this);
	});

	it('createRepositories', async function() {
		await beforeEach(this);

		const oneHatData = new OneHatData();
		oneHatData.createSchemas([
			{ name: 'foo', },
			{ name: 'bar', },
			{ name: 'baz', },
		]);
		const schemas = oneHatData.schemas;
		await oneHatData.createRepositories(schemas);

		const result = oneHatData.getAllRepositories();
		expect(_.size(result)).to.be.eq(_.size(schemas));

		afterEach(this);
	});

	it('createBoundRepositories', async function() {
		await beforeEach(this);

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

		expect(bound).to.be.eq(_.size(schemas));

		afterEach(this);
	});

	it('destroyBoundRepositories', async function() {
		await beforeEach(this);

		const oneHatData = new OneHatData();
		oneHatData.createSchemas([
			{ name: 'fooDestroyBoundRepositories', },
			{ name: 'barDestroyBoundRepositories', },
		]);
		await oneHatData.createBoundRepositories();

		expect(_.size(oneHatData.getAllRepositories())).to.be.greaterThan(0);

		await oneHatData.destroyBoundRepositories();

		expect(_.size(oneHatData.getAllRepositories())).to.be.eq(0);
		expect(oneHatData.getSchema('fooDestroyBoundRepositories').getBoundRepository()).to.be.null;
		expect(oneHatData.getSchema('barDestroyBoundRepositories').getBoundRepository()).to.be.null;

		oneHatData.destroy();
		afterEach(this);
	});

	it('deleteRepository', async function() {
		await beforeEach(this);

		const id = this.repository.id;
		this.oneHatData.deleteRepository(id);
		expect(this.oneHatData.hasRepositoryWithId(id)).to.be.false;

		afterEach(this);
	});

	it('hasRepository', async function() {
		await beforeEach(this);

		const oneHatData = new OneHatData();
		oneHatData.createSchemas([
			{ name: 'foo', },
		]);
		await oneHatData.createBoundRepositories();
		expect(oneHatData.hasRepository('foo')).to.be.true;

		afterEach(this);
	});

	it('Entity.getAssociatedRepository', async function() {
		await beforeEach(this);

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

		afterEach(this);
	});

	it('hasRepositoryWithId', async function() {
		await beforeEach(this);

		expect(this.oneHatData.hasRepositoryWithId('foo')).to.be.true;

		afterEach(this);
	});

	it('getAllRepositories', async function() {
		await beforeEach(this);

		const result = this.oneHatData.getAllRepositories();
		expect(_.size(result)).to.be.eq(1);

		afterEach(this);
	});

	it('getRepository', async function() {
		await beforeEach(this);

		const result = this.oneHatData.getRepository('bar');
		expect(result).to.be.eq(this.repository);

		afterEach(this);
	});

	it('getUniqueRepository', async function() {
		await beforeEach(this);
		const that = this;

		const
			repo1 = that.oneHatData.getRepository('bar'),
			repo2 = await that.oneHatData.getUniqueRepository('bar');
		expect(repo1 !== repo2).to.be.true;
		expect(repo2.isInitialized).to.be.true;

		afterEach(this);
	});

	it('getRepository(name, true) throws migration error', async function() {
		await beforeEach(this);
		const that = this;

		expect(() => that.oneHatData.getRepository('bar', true)).to.throw('Use await this.getUniqueRepository(name) instead.');

		afterEach(this);
	});

	it('getUniqueRepository returns initialized unique repository', async function() {
		await beforeEach(this);
		const that = this;

		const repository = await that.oneHatData.getUniqueRepository('bar');

		expect(repository).to.be.ok;
		expect(repository.isUnique).to.be.true;
		expect(repository.isInitialized).to.be.true;

		afterEach(this);
	});

	it('getRepository unique keeps filters isolated from bound repository', async function() {
		await beforeEach(this);
		const that = this;

		const
			boundRepository = that.oneHatData.getRepository('bar'),
			uniqueRepository = await that.oneHatData.getUniqueRepository('bar');

		boundRepository.filter('key', 'bound-only');
		expect(boundRepository.hasFilterValue('key', 'bound-only')).to.be.true;
		expect(uniqueRepository.hasFilter('key')).to.be.false;

		uniqueRepository.filter('key', 'unique-only');
		expect(uniqueRepository.hasFilterValue('key', 'unique-only')).to.be.true;
		expect(boundRepository.hasFilterValue('key', 'bound-only')).to.be.true;
		expect(boundRepository.hasFilterValue('key', 'unique-only')).to.be.false;

		afterEach(this);
	});

	it('getUniqueRepository allows setBaseParams for Ajax repositories', async function() {
		await beforeEach(this);
		const that = this;

		that.oneHatData.createSchema({
			name: 'meters',
			model: {
				idProperty: 'id',
				displayProperty: 'name',
				properties: [
					{ name: 'id' },
					{ name: 'name' },
				],
			},
			repository: {
				type: 'ajax',
				api: {
					get: 'meters',
				},
			},
		});
		await that.oneHatData.createRepository('meters', true);

		const uniqueRepository = await that.oneHatData.getUniqueRepository('meters');

		expect(() => {
			uniqueRepository.setBaseParams({
				foo: 'bar',
			});
		}).to.not.throw();

		expect(uniqueRepository.getBaseParam('foo')).to.be.eq('bar');

		afterEach(this);
	});

	it('getOrCreateUniqueRepository reuses existing mapped repository', async function() {
		await beforeEach(this);
		const that = this;

		const repository1 = await that.oneHatData.getOrCreateUniqueRepository('partsMap', 'bar');
		const repository2 = await that.oneHatData.getOrCreateUniqueRepository('partsMap', 'bar');

		expect(repository1).to.be.eq(repository2);
		expect(repository1.isUnique).to.be.true;

		afterEach(this);
	});

	it('getOrCreateUniqueRepository recreates repository when mapped id is stale', async function() {
		await beforeEach(this);
		const that = this;

		const repository1 = await that.oneHatData.getOrCreateUniqueRepository('partsMap', 'bar');
		const originalId = repository1.id;

		that.oneHatData.deleteRepository(originalId);

		const repository2 = await that.oneHatData.getOrCreateUniqueRepository('partsMap', 'bar');

		expect(repository2).to.be.ok;
		expect(repository2.id).to.not.eq(originalId);
		expect(that.oneHatData.uniqueRepositoryIdsMap.partsMap).to.be.eq(repository2.id);

		afterEach(this);
	});

	it('getRepositoriesBy', async function() {
		await beforeEach(this);
		const that = this;

		const result = this.oneHatData.getRepositoriesBy((repository) => {
			return repository.id === 'foo';
		});
		expect(result[0]).to.be.eq(this.repository);

		afterEach(this);
	});

	it('getRepositoriesBy - first', async function() {
		await beforeEach(this);
		const that = this;

		const result = this.oneHatData.getRepositoriesBy((repository) => {
			return repository.id === 'foo';
		}, true);
		expect(result).to.be.eq(this.repository);

		afterEach(this);
	});

	it('getRepositoryById', async function() {
		await beforeEach(this);
		const that = this;

		const result = this.oneHatData.getRepositoryById('foo');
		expect(result).to.be.eq(this.repository);

		afterEach(this);
	});

	it('getRepositoriesByType', async function() {
		await beforeEach(this);

		await this.oneHatData.createRepository('bar');

		const repositories = this.oneHatData.getRepositoriesByType('memory');
		expect(_.size(repositories)).to.be.eq(2);

		const firstRepository = this.oneHatData.getRepositoriesByType('memory', true);
		expect(firstRepository).to.be.ok;
		expect(firstRepository.type).to.be.eq('memory');

		afterEach(this);
	});

	it('getRepositoriesBySchema', async function() {
		await beforeEach(this);
		const that = this;

		const oneHatData = this.oneHatData;
		await oneHatData.createRepository('bar');
		await oneHatData.createRepository('bar');
		await oneHatData.createRepository('bar');
		const result = oneHatData.getRepositoriesBySchema(this.schema);
		expect(_.size(result)).to.be.eq(4);

		afterEach(this);
	});

	it('createGlobalErrorHandler', async function() {
		await beforeEach(this);

		let message = null;
		this.oneHatData.createGlobalErrorHandler((error) => {
			message = error.message;
		});

		this.repository.throwError('Test here');
		expect(message).to.be.eq('Test here');

		afterEach(this);
	});

	it('setGlobalErrorHandler', async function() {
		await beforeEach(this);

		let message = null;
		this.oneHatData.setGlobalErrorHandler((error) => {
			message = error.message;
		});

		this.repository.throwError('Test here 2');
		expect(message).to.be.eq('Test here 2');

		afterEach(this);
	});

	it('registerRepositoryType', async function() {
		await beforeEach(this);

		class CustomMemoryRepository extends this.repository.constructor {}
		CustomMemoryRepository.type = 'customMemorySingle';
		CustomMemoryRepository.className = 'CustomMemorySingle';

		this.oneHatData.registerRepositoryType(CustomMemoryRepository);
		this.oneHatData.createSchema({
			name: 'customRepositoryTypeSingle',
			model: {
				idProperty: 'key',
				displayProperty: 'value',
				properties: [
					{ name: 'key', type: 'int', },
					{ name: 'value', },
				],
			},
			repository: 'customMemorySingle',
		});

		await this.oneHatData.createRepository('customRepositoryTypeSingle', true);

		const customRepository = this.oneHatData.getRepository('customRepositoryTypeSingle');
		expect(customRepository).to.be.ok;
		expect(customRepository.type).to.be.eq('customMemorySingle');
		expect(customRepository.className).to.be.eq('CustomMemorySingle');

		afterEach(this);
	});

	it('registerRepositoryTypes', async function() {
		await beforeEach(this);

		class CustomMemoryRepositoryA extends this.repository.constructor {}
		CustomMemoryRepositoryA.type = 'customMemoryA';
		CustomMemoryRepositoryA.className = 'CustomMemoryA';

		class CustomMemoryRepositoryB extends this.repository.constructor {}
		CustomMemoryRepositoryB.type = 'customMemoryB';
		CustomMemoryRepositoryB.className = 'CustomMemoryB';

		this.oneHatData.registerRepositoryTypes([
			CustomMemoryRepositoryA,
			CustomMemoryRepositoryB,
		]);

		this.oneHatData.createSchema({
			name: 'customRepositoryTypeB',
			model: {
				idProperty: 'key',
				displayProperty: 'value',
				properties: [
					{ name: 'key', type: 'int', },
					{ name: 'value', },
				],
			},
			repository: 'customMemoryB',
		});

		await this.oneHatData.createRepository('customRepositoryTypeB', true);

		const customRepository = this.oneHatData.getRepository('customRepositoryTypeB');
		expect(customRepository).to.be.ok;
		expect(customRepository.type).to.be.eq('customMemoryB');
		expect(customRepository.className).to.be.eq('CustomMemoryB');

		afterEach(this);
	});

	it('setOptionsOnAllRepositories', async function() {
		await beforeEach(this);
		const that = this;

		const oneHatData = this.oneHatData;
		oneHatData.setOptionsOnAllRepositories({
			test: 1,
		});
		const repository = oneHatData.getRepository('bar');
		expect(repository.test).to.be.eq(1);

		afterEach(this);
	});

	it('setIsOnline', async function() {
		await beforeEach(this);
		const that = this;

		const oneHatData = this.oneHatData;

		oneHatData.setIsOnline(true);
		expect(oneHatData.isOnline).to.be.true;

		oneHatData.setIsOnline(false);
		expect(oneHatData.isOnline).to.be.false;

		afterEach(this);
	});

	it('isEntity', async function() {
		await beforeEach(this);
		const
			that = this,
			oneHatData = this.oneHatData,
			isEntity = oneHatData.isEntity,
			repository = oneHatData.getRepository('bar');
		const entity = await repository.add({ key: 1, value: 'value', });

		expect(isEntity(entity)).to.be.true;
		expect(isEntity({})).to.be.false;
		expect(isEntity(2)).to.be.false;
		expect(isEntity([1,2])).to.be.false;

		afterEach(this);
	});

	it('destroy', async function() {
		await beforeEach(this);
		const that = this;

		this.oneHatData.destroy();
		const result = this.oneHatData.isDestroyed;
		expect(result).to.be.true;

		afterEach(this);
	});

	it('chains creation of schemas and repos', async function() {
		await beforeEach(this);
		const that = this;

		const oneHatData = new OneHatData();

		await oneHatData.createSchemas([
				{ name: 'foo', },
				{ name: 'bar', },
				{ name: 'baz', },
			])
			.createBoundRepositories();
		
		// NOTE: Can't chain getAllRepositories() because we have to wait for createBoundRepositories to finish
		const repositories = oneHatData.getAllRepositories();
		expect(_.size(repositories)).to.be.eq(_.size(oneHatData.schemas));

		afterEach(this);
	});

	it('real-world example', async function() {
		await beforeEach(this);
		const that = this;

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

		afterEach(this);
	});

	it('createRepository - LFR', async function() {
		const oneHatData = new OneHatData();
		await oneHatData
			.setRepositoryGlobals({
				debugMode: true,
			})
			.createSchemas({
				name: 'bar',
				repository: {
					type: 'lfr',
					isAutoSync: true,
					local: {
						type: 'memory',
						isAutoLoad: false,
						isRemote: false,
						isLocal: true,
					},
					remote: {
						type: 'memory',
						isAutoLoad: false,
						isRemote: true, // hack
						isLocal: false,
					},
				}
			})
			.createBoundRepositories();

		const repository = oneHatData.getRepository('bar');
		expect(repository.name).to.be.eq('bar');

		oneHatData.destroy();
	});

});