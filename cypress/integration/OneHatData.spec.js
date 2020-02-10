import { OneHatData } from '../../src/OneHatData';

describe('OneHatData', function() {
	beforeEach(function() {
		this.oneHatData = new OneHatData();
		this.schema = this.oneHatData.createSchema({
			name: 'bar',
		});
		this.oneHatData.createRepository({
			id: 'foo',
			schema: this.schema,
		}, true);
		this.repository = this.oneHatData.getRepositoryById('foo');
	});

	afterEach(function() {
		this.oneHatData.destroy();
	});

	it('createSchema', function() {
		expect(this.schema.name).to.be.eq('bar');
		const result = this.oneHatData.schemas;
		expect(_.size(result)).to.be.eq(2); // Also includes KeyValue
	});

	it('createSchemas', function() {
		this.oneHatData.createSchemas([
			{ name: 'foo', },
			// { name: 'bar', }, // already exists
			{ name: 'baz', },
		]);
		const result = this.oneHatData.schemas;
		expect(_.size(result)).to.be.eq(4); // Also includes KeyValue
	});

	it('hasSchemaWithName', function() {
		const name = this.schema.name;
		expect(this.oneHatData.hasSchemaWithName(name)).to.be.true;
	});

	it('deleteSchema', function() {
		const name = this.schema.name;
		this.oneHatData.deleteSchema(name);
		expect(this.oneHatData.hasSchemaWithName(name)).to.be.false;
	});

	it('getSchema', function() {
		const name = this.schema.name,
			schema = this.oneHatData.getSchema(name);
		expect(schema).to.be.eq(this.schema);
	});

	it('createRepository', function() {
		expect(this.repository.id).to.be.eq('foo');
	});

	it('createRepository - unique', function() {
		const repository = this.oneHatData.createRepository('bar');
		expect(repository.id).to.be.not.eq(this.repository.id);
	});

	it('createRepositories', function() {
		const oneHatData = new OneHatData();
		oneHatData.createSchemas([
			{ name: 'foo', },
			{ name: 'bar', },
			{ name: 'baz', },
		]);
		const schemas = oneHatData.schemas;
		oneHatData.createRepositories(schemas);

		const result = oneHatData.getAllRepositories();
		expect(_.size(result)).to.be.eq(4); // Also includes KeyValue
	});

	it('createBoundRepositories', function() {
		const oneHatData = new OneHatData();
		oneHatData.createSchemas([
			{ name: 'foo', },
			{ name: 'bar', },
			{ name: 'baz', },
		]);
		oneHatData.createBoundRepositories();

		const schemas = oneHatData.schemas;
		let bound = 0;
		_.each(schemas, (schema) => {
			if (schema.getBoundRepository()) {
				bound++;
			}
		});

		expect(bound).to.be.eq(4); // Also includes KeyValue
	});

	it('deleteRepository', function() {
		const id = this.repository.id;
		this.oneHatData.deleteRepository(id);
		expect(this.oneHatData.hasRepositoryWithId(id)).to.be.false;
	});

	it('hasRepositoryWithId', function() {
		expect(this.oneHatData.hasRepositoryWithId('foo')).to.be.true;
	});

	it('getAllRepositories', function() {
		const result = this.oneHatData.getAllRepositories();
		expect(_.size(result)).to.be.eq(1);
	});

	it('getRepository', function() {
		const result = this.oneHatData.getRepository('bar');
		expect(result).to.be.eq(this.repository);
	});

	it('getRepositoriesBy', function() {
		const result = this.oneHatData.getRepositoriesBy((repository) => {
			return repository.id === 'foo';
		});
		expect(result[0]).to.be.eq(this.repository);
	});

	it('getRepositoriesBy - first', function() {
		const result = this.oneHatData.getRepositoriesBy((repository) => {
			return repository.id === 'foo';
		}, true);
		expect(result).to.be.eq(this.repository);
	});

	it('getRepositoryById', function() {
		const result = this.oneHatData.getRepositoryById('foo');
		expect(result).to.be.eq(this.repository);
	});

	it('getRepositoriesBySchema', function() {
		const oneHatData = this.oneHatData;
		oneHatData.createRepository('bar');
		oneHatData.createRepository('bar');
		oneHatData.createRepository('bar');
		const result = oneHatData.getRepositoriesBySchema(this.schema);
		expect(_.size(result)).to.be.eq(4);
	});

	it('destroy', function() {
		this.oneHatData.destroy();
		const result = this.oneHatData.isDestroyed;
		expect(result).to.be.true;
	});

	it('chains creation of schemas and repos', function() {
		const oneHatData = new OneHatData();
		const repositories = oneHatData.createSchemas([
				{ name: 'foo', },
				{ name: 'bar', },
				{ name: 'baz', },
			])
			.createBoundRepositories()
			.getAllRepositories();

		expect(_.size(repositories)).to.be.eq(4); // Also includes KeyValue
	});

	it('real-world example', function() {

		const oneHatData = new OneHatData(),
			data = [
				{ key: '1', value: 'one', },
				{ key: '2', value: 'two', },
				{ key: '3', value: 'three', },
				{ key: '4', value: 'four', },
				{ key: '5', value: 'five', },
			],
			repository = oneHatData.createRepository({
				schema: 'KeyValues',
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
	});

	it.only('createRepository - LFR', function() {
		const oneHatData = new OneHatData();
		oneHatData
			.setRepositoryGlobals({
				debugMode: true,
			})
			.createSchemas([{
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
			}])
			.createBoundRepositories();

		const repository = oneHatData.getRepository('bar');
		expect(repository.name).to.be.eq('bar');
	});

});