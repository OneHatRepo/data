import RepositoryTypes from '../../../src/Repository/index.js';
import Schema from '../../../src/Schema/index.js';

describe('Repository Base', function() {
	beforeEach(function() {
		this.schema = new Schema({
			name: 'bar',
			model: {
				idProperty: 'key',
				displayProperty: 'value',
				properties: [
					{ name: 'key', type: 'int', },
					{ name: 'value', },
					{ name: 'json', type: 'json', },
				],
				associations: {
					hasMany: [
						'bar'
					],
				},
			},
			repository: 'null',
		});
		this.Repository = RepositoryTypes.null;
		this.repository = new this.Repository({
			id: 'foo',
			schema: this.schema,
			isAutoLoad: true,
			isAutoSave: true,
			isPaginated: true,
			data: [
				{ key: 1, value: 'one', },
				{ key: 2, value: 'two', },
				{ key: 3, value: 'three', },
				{ key: 4, value: 'four', },
				{ key: 5, value: 'five', },
			],
		});
		this.repository.initialize();
		this.schema.setBoundRepository(this.repository);
	});

	afterEach(function() {
		this.schema.destroy();
		this.repository.destroy();
	});

	describe('initialization', function() {
		it('constructor', function() {
			expect(this.repository.id).to.be.eq('foo');
		});

		it('constructor without schema fails', function() {
			let failed = false,
				message;
			try {
				const repository = new this.Repository();
			} catch (e) {
				failed = true;
				message = e.message;
			}
			expect(failed).to.be.true;
			expect(message).to.be.eq('Schema cannot be empty');
		});

		it('constructor creates new ID if none supplied', function() {
			const repository = new this.Repository({ 
				schema: this.schema,
			})
			expect(repository.id).to.be.not.eq('foo');
		});

		it('_createMethods', async function() {

			// There is no test method by default
			expect(this.repository.testMethod).to.not.exist;

			// Set up custom repository with testMethod
			const schema1 = new Schema({
					name: 'baz',
					model: {
						idProperty: 'key',
						displayProperty: 'value',
						properties: [
							{ name: 'key', type: 'int' },
							{ name: 'value' },
						],
					},
					repository: {
						type: 'null',
						methods: {
							testMethod: function() {
								this.bar = 'test me';
							},
						},
					},
				}),
				repository = new this.Repository({
					schema: schema1,
					data: [],
				});
			await repository.initialize();
			schema1.setBoundRepository(repository);

			// Perform testMethod test
			repository.testMethod();
			expect(repository.bar).to.be.eq('test me');
		});
	});

	describe('loading', function() {

		it('load', function() {
			let didFireLoad = false;
			this.repository.on('changeData', () => {
				didFireLoad = true;
			});
			this.repository.load([
				{ key: 1, value: 'one', },
				{ key: 2, value: 'two', },
				{ key: 3, value: 'three', },
			]);
			
			expect(didFireLoad).to.be.true;

			const entities = this.repository.entities;
			expect(entities[0].key).to.be.eq(1);
			expect(entities[1].key).to.be.eq(2);
			expect(entities[2].key).to.be.eq(3);
			expect(entities[3]).to.be.undefined;
		});

		it('reload', function() {
			this.repository.reload();
			const entities = this.repository.entities;
			
			expect(entities[0].key).to.be.eq(1);
			expect(entities[1].key).to.be.eq(2);
			expect(entities[2].key).to.be.eq(3);
			expect(entities[3].key).to.be.eq(4);
			expect(entities[4].key).to.be.eq(5);
		});

		it('setAutoSave', function() {
			expect(this.repository.isAutoSave).to.be.true;
			this.repository.setAutoSave(false);
			expect(this.repository.isAutoSave).to.be.false;
		});

		it('markLoaded', function() {

			const repository = new this.Repository({
				id: 'foo',
				schema: this.schema,
				isAutoLoad: false,
				isAutoSave: true,
				isPaginated: true,
				data: [
					{ key: 1, value: 'one', },
					{ key: 2, value: 'two', },
					{ key: 3, value: 'three', },
					{ key: 4, value: 'four', },
					{ key: 5, value: 'five', },
				],
			});
			repository.initialize();

			expect(repository.isLoading).to.be.false;
			expect(repository.isLoaded).to.be.false;
			expect(repository.lastLoaded).to.be.null;

			repository.markLoaded();
			
			expect(repository.isLoading).to.be.false;
			expect(repository.isLoaded).to.be.true;
			expect(repository.lastLoaded).to.be.not.null;
		});

		it('markUnloaded', function() {

			const repository = new this.Repository({
				id: 'foo',
				schema: this.schema,
				isAutoLoad: false,
				isAutoSave: true,
				isPaginated: true,
				data: [
					{ key: 1, value: 'one', },
					{ key: 2, value: 'two', },
					{ key: 3, value: 'three', },
					{ key: 4, value: 'four', },
					{ key: 5, value: 'five', },
				],
			});
			repository.initialize();

			repository.isLoading = true;
			repository.isLoaded = true;
			repository.lastLoaded = true;

			repository.markUnloaded();
			
			expect(repository.isLoading).to.be.false;
			expect(repository.isLoaded).to.be.false;
			expect(repository.lastLoaded).to.be.null;
		});

	});

	describe('sorting', function() {

		it('hasSorters & clearSort', function() {
			expect(this.repository.hasSorters).to.be.true;
			this.repository.clearSort();
			expect(this.repository.hasSorters).to.be.false;
		});

		it('sort - default && getDefaultSorters', function() {
			this.repository.sort();
			const sorter = this.repository.sorters[0];
			
			expect(sorter.name).to.be.eq('value');
			expect(sorter.direction).to.be.eq('ASC');
		});

		it('sort - one arg', function() {
			this.repository.sort('key');
			const sorter = this.repository.sorters[0];
			
			expect(sorter.name).to.be.eq('key');
			expect(sorter.direction).to.be.eq('ASC');
		});

		it('sort - two args', function() {
			this.repository.sort('key', 'DESC');
			const sorter = this.repository.sorters[0];
			
			expect(sorter.name).to.be.eq('key');
			expect(sorter.direction).to.be.eq('DESC');
		});

		it('sort - object', function() {
			this.repository.sort({
				name: 'key',
				direction: 'DESC',
			});
			const sorter = this.repository.sorters[0];
			
			expect(sorter.name).to.be.eq('key');
			expect(sorter.direction).to.be.eq('DESC');
		});

		it('sort - array', function() {
			this.repository.sort([
				{
					name: 'key',
					direction: 'DESC',
				},
				{
					name: 'value',
					direction: 'ASC',
				},
			]);
			const sorters = this.repository.sorters;
			
			expect(sorters[0].name).to.be.eq('key');
			expect(sorters[0].direction).to.be.eq('DESC');
			expect(sorters[1].name).to.be.eq('value');
			expect(sorters[1].direction).to.be.eq('ASC');
		});

		it('getDefaultSorters', function() {
			const sorters = this.repository.getDefaultSorters(),
				expected = {
					direction: 'ASC',
					name: 'value',
					fn: 'default',
				};
			expect(_.isEqual(sorters[0], expected)).to.be.true;
		});

		it('setSorters emits changeSorters', function() {
			let didFireChangeSorters = false;
			this.repository.on('changeSorters', () => {
				didFireChangeSorters = true;
			});
			this.repository.clearSort();
			
			expect(didFireChangeSorters).to.be.true;
		});

		it('sort by non-existant field', function() {
			let failed = false,
				message;

			this.repository.on('error', (msg) => {
				failed = true;
				message = msg;
			});
			this.repository.sort('foo');

			expect(failed).to.be.true;
			expect(message).to.be.match(/Sorting property does not exist/);
		});

		it('sort by non-sortable field', function() {

			let failed = false,
				message;

			this.repository.on('error', (msg) => {
				failed = true;
				message = msg;
			});
			this.repository.sort('json');

			expect(failed).to.be.true;
			expect(message).to.be.match(/Sorting property type is not sortable/);
		});

		it('getSortField', function() {
			const sortField = this.repository.getSortField();
			expect(sortField).to.be.eq('value');
		});

		it('getSortDirection', function() {
			const sortDirection = this.repository.getSortDirection();
			expect(sortDirection).to.be.eq('ASC');
		});

		it('getSortFn', function() {
			this.repository.setSorters([{
				name: 'value',
				direction: 'ASC',
				fn: 'natsort',
			}]);

			const sortFn = this.repository.getSortFn();
			expect(sortFn).to.be.eq('natsort');
		});

	});

	describe('filtering', function() {
		
		it('hasFilters', function() {
			expect(this.repository.hasFilters).to.be.false;
			this.repository.filter('key', '1');
			expect(this.repository.hasFilters).to.be.true;
		});
		
		it('hasFilter', function() {
			expect(this.repository.hasFilter('key', '1')).to.be.false;
			this.repository.filter('key', '1');
			expect(this.repository.hasFilter('key', '1')).to.be.true;
		});
		
		it('hasFilterValue', function() {
			expect(this.repository.hasFilterValue('key', '1')).to.be.false;
			this.repository.filter('key', '1');
			expect(this.repository.hasFilterValue('key', '1')).to.be.true;

			this.repository.filter('key', [1,2,4,]);
			expect(this.repository.hasFilterValue('key', [1,2,4,])).to.be.true;
			expect(this.repository.hasFilterValue('key', [1,4,2,])).to.be.true; // order is different
		});

		it('filter - none', function() {
			this.repository.filter();
			expect(_.size(this.repository.filters)).to.be.eq(0);

			this.repository.filters = ['test', 'test'];
			expect(_.size(this.repository.filters)).to.be.eq(2);

			this.repository.filter();
			expect(_.size(this.repository.filters)).to.be.eq(0);
		});
	
		it('filter - two args', function() {
			this.repository.filter('key', '1');
			const filter = this.repository.filters[0];
			expect(filter.name).to.be.eq('key');
			expect(filter.value).to.be.eq('1');
		});
	
		it('filter - object', function() {
			// two possible ways to call filter with an object
			// 1. filter({ name: 'key', value: '1' });
			this.repository.filter({
				name: 'key',
				value: '1',
			});
			const filter1 = this.repository.filters[0];
			expect(filter1.name).to.be.eq('key');
			expect(filter1.value).to.be.eq('1');

			// 2. filter({ key: '1' });
			this.repository.filter({
				key: '1',
			});
			const filter2 = this.repository.filters[0];
			expect(filter2.name).to.be.eq('key');
			expect(filter2.value).to.be.eq('1');
		});
	
		it('filter - array', function() {
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
			const filters = this.repository.filters;
			
			expect(filters[0].name).to.be.eq('key1');
			expect(filters[0].value).to.be.eq('1');
			expect(filters[1].name).to.be.eq('key2');
			expect(filters[1].value).to.be.eq('2');
		});
	
		it('filter - clearFirst arg', function() {
			this.repository.filter('key1', '1');
			this.repository.filter('key2', '2');
			let filters = this.repository.filters;
			
			expect(filters[0].name).to.be.eq('key2');
			expect(filters[0].value).to.be.eq('2');

			this.repository.filter('key3', '3', false);
			filters = this.repository.filters;
			expect(filters[1].name).to.be.eq('key3');
			expect(filters[1].value).to.be.eq('3');
		});
	
		it('filter - clearFilters', function() {
			this.repository.filter({
				name: 'a',
				value: '1',
			});
			this.repository.clearFilters();
			expect(this.repository.filters.length).to.be.eq(0);

			this.repository.filter([
				{
					name: 'a',
					value: '1',
				},
				{
					name: 'b',
					value: '2',
				},
			]);
			this.repository.clearFilters('a');
			expect(this.repository.filters[0].name).to.be.eq('b');
			expect(this.repository.filters[0].value).to.be.eq('2');

			this.repository.filter([
				{
					name: 'a',
					value: '1',
				},
				{
					name: 'b',
					value: '2',
				},
			]);
			this.repository.clearFilters(['a','b']);
			expect(this.repository.filters.length).to.be.eq(0);

		});
	
		it('filter - setFilters', function() {
			this.repository.setFilters({
				a: '1',
				b: '2',
			});
			const filters = this.repository.filters;
			
			expect(filters[0].name).to.be.eq('a');
			expect(filters[0].value).to.be.eq('1');
			expect(filters[1].name).to.be.eq('b');
			expect(filters[1].value).to.be.eq('2');
		});
	
		it('filter - setFilters modifying existing', function() {
			this.repository.setFilters({
				a: '1',
			});
			let filters = this.repository.filters;
			expect(filters[0].name).to.be.eq('a');
			expect(filters[0].value).to.be.eq('1');
			expect(filters.length).to.be.eq(1);

			this.repository.setFilters({
				a: '2',
			}, false);
			filters = this.repository.filters
			expect(filters.length).to.be.eq(1);
			expect(filters[0].name).to.be.eq('a');
			expect(filters[0].value).to.be.eq('2');
		});
	
		it('filter - setFilters, clearFirst arg', function() {
			this.repository.setFilters({
				a: '1',
			});
			expect(this.repository.filters.length).to.be.eq(1);

			this.repository.setFilters({
				b: '1',
				c: '2',
			});
			expect(this.repository.filters.length).to.be.eq(2);

			this.repository.setFilters({
				d: '1',
				e: '2',
				f: '3',
			}, false);
			expect(this.repository.filters.length).to.be.eq(5);
		});

		it('_setFilters emits changeFilters', function() {
			let didFireChangeFilters = false;
			this.repository.on('changeFilters', () => {
				didFireChangeFilters = true;
			});
			this.repository.filter('key', '1');
			
			expect(didFireChangeFilters).to.be.true;
		});

		it('changing filters resets pagination', function() {
			this.repository.isPaginated = true;
			this.repository.setPageSize(1);
			this.repository.setPage(3);

			this.repository.setFilters({
				b: '1',
				c: '2',
			});

			expect(this.repository.page).to.be.eq(1);
		});

	});

	describe('pagination', function() {

		it('various methods', function() {
			
			expect(this.repository.page).to.be.eq(1);
			
			// setPageSize
			this.repository.isPaginated = true;
			this.repository.setPageSize(1);
			expect(this.repository.pageSize).to.be.eq(1);
	
			// setPage
			this.repository.setPage(3);
			expect(this.repository.page).to.be.eq(3);

			// setPageSize resets page number to 1
			this.repository.setPageSize(50);
			expect(this.repository.page).to.be.eq(1);
	
			// prevPage
			this.repository.setPageSize(1);
			this.repository.setPage(3);
			this.repository.prevPage();
			expect(this.repository.page).to.be.eq(2);
	
			// nextPage
			this.repository.nextPage();
			expect(this.repository.page).to.be.eq(3);
	
			// out of range, high
			const currentPage = this.repository.page;
			this.repository.setPage(152);
			expect(this.repository.page).to.be.eq(currentPage);
	
			// out of range, low
			this.repository.setPage(-152);
			expect(this.repository.page).to.be.eq(currentPage);
		});

		it('_calculatePaginationVars', function() {
			let results;

			results = this.Repository._calculatePaginationVars(0, 1, 10);
			expect(results.page).to.be.eq(1);
			expect(results.pageSize).to.be.eq(10);
			expect(results.total).to.be.eq(0);
			expect(results.totalPages).to.be.eq(1);
			expect(results.pageStart).to.be.eq(0);
			expect(results.pageEnd).to.be.eq(0);
			expect(results.pageTotal).to.be.eq(0);

			results = this.Repository._calculatePaginationVars(15, 1, 10);
			expect(results.page).to.be.eq(1);
			expect(results.pageSize).to.be.eq(10);
			expect(results.total).to.be.eq(15);
			expect(results.totalPages).to.be.eq(2);
			expect(results.pageStart).to.be.eq(1);
			expect(results.pageEnd).to.be.eq(10);
			expect(results.pageTotal).to.be.eq(10);

			results = this.Repository._calculatePaginationVars(15, 2, 10);
			expect(results.page).to.be.eq(2);
			expect(results.pageSize).to.be.eq(10);
			expect(results.total).to.be.eq(15);
			expect(results.totalPages).to.be.eq(2);
			expect(results.pageStart).to.be.eq(11);
			expect(results.pageEnd).to.be.eq(15);
			expect(results.pageTotal).to.be.eq(5);

			results = this.Repository._calculatePaginationVars(15, 2, 5);
			expect(results.page).to.be.eq(2);
			expect(results.pageSize).to.be.eq(5);
			expect(results.total).to.be.eq(15);
			expect(results.totalPages).to.be.eq(3);
			expect(results.pageStart).to.be.eq(6);
			expect(results.pageEnd).to.be.eq(10);
			expect(results.pageTotal).to.be.eq(5);

			results = this.Repository._calculatePaginationVars(7, 2, 5);
			expect(results.page).to.be.eq(2);
			expect(results.pageSize).to.be.eq(5);
			expect(results.total).to.be.eq(7);
			expect(results.totalPages).to.be.eq(2);
			expect(results.pageStart).to.be.eq(6);
			expect(results.pageEnd).to.be.eq(7);
			expect(results.pageTotal).to.be.eq(2);

			results = this.Repository._calculatePaginationVars(15, 15, 1);
			expect(results.page).to.be.eq(15);
			expect(results.pageSize).to.be.eq(1);
			expect(results.total).to.be.eq(15);
			expect(results.totalPages).to.be.eq(15);
			expect(results.pageStart).to.be.eq(15);
			expect(results.pageEnd).to.be.eq(15);
			expect(results.pageTotal).to.be.eq(1);
		});

		it('reset pagination', function() {
			expect(this.repository.page).to.be.eq(1);
			
			this.repository.isPaginated = true;
			this.repository.setPageSize(1);
			this.repository.setPage(3);
			expect(this.repository.page).to.be.eq(3);

			this.repository.resetPagination();
			expect(this.repository.page).to.be.eq(1);
		});

		it('setIsPaginated', function() {
			
			this.repository.setIsPaginated(true);
			expect(this.repository.isPaginated).to.be.true;
			
			this.repository.setIsPaginated(false);
			expect(this.repository.isPaginated).to.be.false;
		});

	});

	describe('creating', function() {

		it('add', async function() {
			let didFireAdd = false;
			this.repository.on('add', () => {
				didFireAdd = true;
			});
			const entity = await this.repository.add({ key: 6, value: 'six' });
			expect(entity.id).to.be.eq(6);
			expect(_.size(this.repository.entities)).to.be.eq(6);
			expect(didFireAdd).to.be.true;
		});

		it('add already existing', async function() {
			const value = 'another one';
			await this.repository.add({ key: 6, value: 'six' });
			await this.repository.add({ key: 6, value });
			expect(_.size(this.repository.entities)).to.be.eq(6);

			const entity = this.repository.getById(6);
			expect(entity.value).to.be.eq(value);
		})

		it('add with an existing id', async function() {
			this.repository.isAutoSave = false;

			// ID suppied; should not be temp ID or phantom
			const entity = await this.repository.add({ key: 6, value: 'six' });
			expect(entity.isTempId).to.be.false;
			expect(entity.isPhantom).to.be.false;

			// No ID suppled. Make it phantom and temp ID
			const entity2 = await this.repository.add({ value: 'seven' });
			expect(entity2.isTempId).to.be.true;
			expect(entity2.isPhantom).to.be.true;
		});

		it('createStandaloneEntity', async function() {
			const entity = await this.repository.createStandaloneEntity({ key: 6, value: 'six' });
			expect(entity.id).to.be.eq(6);
			expect(_.size(this.repository.entities)).to.be.eq(5);
		});

		it('addMultiple', async function() {
			await this.repository.addMultiple([
				{ key: 6, value: 'six' },
				{ key: 7, value: 'seven', },
			]);
			const entities = this.repository.entities;
			expect(_.size(entities)).to.be.eq(7);
		});

		it('_createEntity', function() {
			const entity = this.Repository._createEntity(this.schema, { key: 6, value: 'six' }, this.repository); // NOTE: this.Repository has capital "R"
			expect(entity.id).to.be.eq(6);
		});

		it('_relayEntityEvents', async function() {
			let didFire = false;
			this.repository.on('entity_change', () => {
				didFire = true;
			});
			const entity = this.repository.getById(1);
			entity.value = 'Test';
			expect(didFire).to.be.true;
		});
		
	});

	describe('retrieving', function() {

		it('getSubmitValues', function() {
			const result = this.repository.getSubmitValues();
			expect(_.size(result)).to.be.eq(5);
		});

		it('getDisplayValues', function() {
			const result = this.repository.getDisplayValues();
			expect(_.size(result)).to.be.eq(5);
		});

		it('getRawValues', function() {
			const result = this.repository.getRawValues();
			expect(_.size(result)).to.be.eq(5);
		});

		it('getOriginalData', function() {
			const result = this.repository.getOriginalData();
			expect(_.size(result)).to.be.eq(5);
		});

		it('getRandomEntity', function() {
			const result = this.repository.getRandomEntity();
			expect(result.hasProperty('key')).to.be.true;
			assert.approximately(result.id, 3, 2);
		});

		it('getParsedValues', function() {
			const result = this.repository.getParsedValues();
			expect(_.size(result)).to.be.eq(5);
		});

		it('getByIx', function() {
			const result = this.repository.getByIx(2);
			expect(result.value).to.be.eq('three');
		});

		it('getById', function() {
			const result = this.repository.getById(3);
			expect(result.value).to.be.eq('three');
		});

		it('getIxById', function() {
			let ix = this.repository.getIxById(1);
			expect(ix).to.be.eq(0);

			ix = this.repository.getIxById(3);
			expect(ix).to.be.eq(2);
		});

		it('getBy', function() {
			const result = this.repository.getBy(entity => entity.id === 2 || entity.id === 3);
			expect(result.length).to.be.eq(2);
			expect(result[0].value).to.be.eq('two');
			expect(result[1].value).to.be.eq('three');
		});

		it('getFirstBy', function() {
			const result = this.repository.getFirstBy(entity => entity.id === 3);
			expect(result.value).to.be.eq('three');
		});

		it('getByRange', function() {
			const result = this.repository.getByRange(1, 4);
			expect(_.size(result)).to.be.eq(4);
			expect(result[0].value).to.be.eq('two');
			expect(result[3].value).to.be.eq('five');
		});

		it('getNonPersisted', async function() {
			this.repository.setAutoSave(false);
			const entity = await this.repository.add({ value: 'six' }),
				entities = this.repository.entities;

			let nonPersisted = this.repository.getNonPersisted();
			expect(_.isEqual(entity, nonPersisted[0])).to.be.true;
			
			nonPersisted = this.repository.getNonPersisted(entities);
			expect(_.isEqual(entity, nonPersisted[0])).to.be.true;
		});

		it('getPhantom', async function() {
			this.repository.setAutoSave(false);
			const entity = await this.repository.add({ value: 'six' }),
				phantom = this.repository.getPhantom();

			expect(_.isEqual(entity, phantom[0])).to.be.true;
		});

		it('getDirty', function() {
			this.repository.setAutoSave(false);
			const entity = this.repository.getByIx(0);
			
			entity.value = 'test';	
			const dirty = this.repository.getDirty();
			expect(_.isEqual(entity, dirty[0])).to.be.true;
		});

		it('isDirty', function() {
			expect(this.repository.isDirty).to.be.false;

			this.repository.setAutoSave(false);
			const entity = this.repository.getByIx(0);
			entity.value = 'test';	
			expect(this.repository.isDirty).to.be.true;
		});

		it('getDeleted', function() {
			this.repository.setAutoSave(false);
			const entity = this.repository.getByIx(0);
			
			entity.markDeleted();	
			const deleted = this.repository.getDeleted();
			expect(_.isEqual(entity, deleted[0])).to.be.true;
		});

		it('getStaged', function() {
			this.repository.setAutoSave(false);
			const entity = this.repository.getByIx(0);
			
			entity.isStaged = true;	
			const staged = this.repository.getStaged();
			expect(_.isEqual(entity, staged[0])).to.be.true;
		});

		it('isInRepository, hasId', function() {
			this.repository.setAutoSave(false);
			const id = 1,
				entity = this.repository.getById(id);

			let result = this.repository.isInRepository(entity);
			expect(result).to.be.true;

			result = this.repository.isInRepository(id);
			expect(result).to.be.true;

			result = this.repository.hasId(id);
			expect(result).to.be.true;
		});

		it('getIsBound', function() {

			// try with bound schema
			expect(this.repository.getIsBound()).to.be.true;

			// try with unbound schema
			const repository = new this.Repository({
				id: 'foo',
				schema: this.schema,
			});
			repository.initialize();
			expect(repository.getIsBound()).to.be.false;
			
		});

		it('isBound', function() {

			// try with bound schema
			expect(this.repository.isBound).to.be.true;

			// try with unbound schema
			const repository = new this.Repository({
				id: 'foo',
				schema: this.schema,
			});
			repository.initialize();
			expect(repository.isBound).to.be.false;
			
		});
	});

	describe('updating', function() {
		
		it('save', function() {

			this.repository.setAutoSave(true);
			
			let didFire = false;
			this.repository.on('save', () => {
				didFire = true;
			});
			this.repository.add({ value: 'six' });
			
			expect(didFire).to.be.true;

			// TODO: Need comprehensive test of save(), not just event firing

		});

		it('save by entity', async function() {
			const entity = await this.repository.add({ key: 6, value: 'six' });
			this.repository.setAutoSave(false);
			entity.key = 8;
			const result = await entity.save();
			expect(result[0].operation).to.eq('edit');
			expect(result[0].success).to.be.true;
			expect(result[0].entity.key).eq(8);
		});

	});

	describe('deleting', function() {

		it('clear', function() {
			this.repository.clear();
			expect(this.repository.entities.length).to.be.eq(0);
		});

		it('delete', function() {
			let didFire = false;
			this.repository.on('delete', () => {
				didFire = true;
			});

			this.repository.setAutoSave(false);
			const entity = this.repository.entities[1];
			this.repository.delete(entity);
			
			expect(didFire).to.be.true;
		});

		it('delete() / removeEntity', async function() {
			this.repository.setAutoSave(false);
			const entity = await this.repository.add({ value: 'six' });
			this.repository.delete(entity);
			expect(this.repository.entities.length).to.be.eq(5);
		});


		// I'm going to skip these, as they're just combinations of other, tested functions
		// deleteByIx
		// deleteByRange
		// deleteBy
		// deleteById
		// deleteDirty
		// deletePhantom
		// undeleteByIx
		// undeleteByRange
		// undeleteBy
		// undeleteById
		// undeleteDeleted

	});

	describe('events', function() {
	
		it('on, ons, off, offs', function() {
			const repository = new this.Repository({
				id: 'foo',
				schema: this.schema,
			});
			const handler = () => {};
			repository.on('add', handler);
			expect(repository.listenerCount('add')).to.be.eq(1);
			repository.off('add', handler);
			expect(repository.listenerCount('add')).to.be.eq(0);
			repository.ons(['add','load',], handler);
			expect(repository.listenerCount('add')).to.be.eq(1);
			expect(repository.listenerCount('load')).to.be.eq(1);
			repository.offs(['add','load',], handler);
			expect(repository.listenerCount('add')).to.be.eq(0);
			expect(repository.listenerCount('load')).to.be.eq(0);
		});

		it('add', function() {
			let add = 0,
				beforeLoad = 0,
				changeData = 0,
				changeFilters = 0,
				changePage = 0,
				changePageSize = 0,
				changeSorters = 0,
				reload = 0,
				didDelete = 0,
				save = 0;

			this.repository.on('add', () => { add++; });
			this.repository.on('beforeLoad', () => { beforeLoad++; });
			this.repository.on('changeData', () => { changeData++; });
			this.repository.on('changeFilters', () => { changeFilters++; });
			this.repository.on('changePage', () => { changePage++; });
			this.repository.on('changePageSize', () => { changePageSize++; });
			this.repository.on('changeSorters', () => { changeSorters++; });
			this.repository.on('reload', () => { reload++; });
			this.repository.on('delete', () => { didDelete++; });
			this.repository.on('save', () => { save++; });
	
			this.repository.setAutoSave(false);
			this.repository.add({ value: 'six' });
			this.repository.save();
			
			expect(add).to.be.eq(1);
			expect(beforeLoad).to.be.eq(0);
			expect(changeData).to.be.eq(1);
			expect(changeFilters).to.be.eq(0);
			expect(changePage).to.be.eq(0);
			expect(changePageSize).to.be.eq(0);
			expect(changeSorters).to.be.eq(0);
			expect(reload).to.be.eq(0);
			expect(didDelete).to.be.eq(0);
			expect(save).to.be.eq(1);
		});

		it('changeData', function() {
			let add = 0,
				beforeLoad = 0,
				changeData = 0,
				changeFilters = 0,
				changePage = 0,
				changePageSize = 0,
				changeSorters = 0,
				reload = 0,
				didDelete = 0,
				save = 0;

			this.repository.on('add', () => { add++; });
			this.repository.on('beforeLoad', () => { beforeLoad++; });
			this.repository.on('changeData', () => { changeData++; });
			this.repository.on('changeFilters', () => { changeFilters++; });
			this.repository.on('changePage', () => { changePage++; });
			this.repository.on('changePageSize', () => { changePageSize++; });
			this.repository.on('changeSorters', () => { changeSorters++; });
			this.repository.on('reload', () => { reload++; });
			this.repository.on('delete', () => { didDelete++; });
			this.repository.on('save', () => { save++; });
	
			this.repository.setAutoSave(false);
			const entity = this.repository.getByIx(0);
			entity.key = 15;
			this.repository.save();

			expect(add).to.be.eq(0);
			expect(beforeLoad).to.be.eq(0);
			expect(changeData).to.be.eq(1);
			expect(changeFilters).to.be.eq(0);
			expect(changePage).to.be.eq(0);
			expect(changePageSize).to.be.eq(0);
			expect(changeSorters).to.be.eq(0);
			expect(reload).to.be.eq(0);
			expect(didDelete).to.be.eq(0);
			expect(save).to.be.eq(1);
		});

		it('manual save', function() {
			let add = 0,
				beforeLoad = 0,
				changeData = 0,
				changeFilters = 0,
				changePage = 0,
				changePageSize = 0,
				changeSorters = 0,
				reload = 0,
				didDelete = 0,
				save = 0;

			this.repository.on('add', () => { add++; });
			this.repository.on('beforeLoad', () => { beforeLoad++; });
			this.repository.on('changeData', () => { changeData++; });
			this.repository.on('changeFilters', () => { changeFilters++; });
			this.repository.on('changePage', () => { changePage++; });
			this.repository.on('changePageSize', () => { changePageSize++; });
			this.repository.on('changeSorters', () => { changeSorters++; });
			this.repository.on('reload', () => { reload++; });
			this.repository.on('delete', () => { didDelete++; });
			this.repository.on('save', () => { save++; });
	
			this.repository.setAutoSave(false);
			const entity = this.repository.getByIx(0);
			entity.key = 15;
			this.repository.save();

			expect(add).to.be.eq(0);
			expect(beforeLoad).to.be.eq(0);
			expect(changeData).to.be.eq(1);
			expect(changeFilters).to.be.eq(0);
			expect(changePage).to.be.eq(0);
			expect(changePageSize).to.be.eq(0);
			expect(changeSorters).to.be.eq(0);
			expect(reload).to.be.eq(0);
			expect(didDelete).to.be.eq(0);
			expect(save).to.be.eq(1);
		});

		it('auto save', function() {
			let add = 0,
				beforeLoad = 0,
				changeData = 0,
				changeFilters = 0,
				changePage = 0,
				changePageSize = 0,
				changeSorters = 0,
				reload = 0,
				didDelete = 0,
				save = 0;

			this.repository.on('add', () => { add++; });
			this.repository.on('beforeLoad', () => { beforeLoad++; });
			this.repository.on('changeData', () => { changeData++; });
			this.repository.on('changeFilters', () => { changeFilters++; });
			this.repository.on('changePage', () => { changePage++; });
			this.repository.on('changePageSize', () => { changePageSize++; });
			this.repository.on('changeSorters', () => { changeSorters++; });
			this.repository.on('reload', () => { reload++; });
			this.repository.on('delete', () => { didDelete++; });
			this.repository.on('save', () => { save++; });
	
			this.repository.setAutoSave(true);
			const entity = this.repository.getByIx(0);
			entity.key = 15;

			expect(add).to.be.eq(0);
			expect(beforeLoad).to.be.eq(0);
			expect(changeData).to.be.eq(1);
			expect(changeFilters).to.be.eq(0);
			expect(changePage).to.be.eq(0);
			expect(changePageSize).to.be.eq(0);
			expect(changeSorters).to.be.eq(0);
			expect(reload).to.be.eq(0);
			expect(didDelete).to.be.eq(0);
			expect(save).to.be.eq(1);
		});

	});

	describe('utilities', function() {
		it('setOptions', function() {

			this.repository.setOptions({
				api: {
					baseURL: 'test123',
				},
			});
			
			expect(this.repository.api.baseURL).to.be.eq('test123');
		});

		it('unmapData', function() {

			// Setup
			const
				schema = new Schema({
					name: 'baz',
					model: {
						idProperty: 'foo',
						displayProperty: 'bar',
						properties: [
							{ name: 'foo', type: 'int' },
							{ name: 'bar' },
							{ name: 'baz', mapping: 'baz.test.val', type: 'bool', defaultValue: null, },
							{ name: 'boo', mapping: 'baz.test.boo', type: 'bool', defaultValue: null, },
						],
					},
				}),
				data = {
					foo: 1,
					bar: 'one',
					baz: {
						test: {
							val: true,
							boo: false,
						},
					},
				};
			this.repository.schema = schema;

			// Now do the test
			const unmapped = this.repository.unmapData({
				foo: 1,
				bar: 'one',
				baz: true,
				boo: false,
			});
			expect(unmapped).to.be.eql(data);
		});

		it('toString', function() {
			const str = this.repository.toString();
			expect(str).to.be.eq('NullRepository {bar} - foo');
		});

		it('_insertBefore', function() {
			
			const
				repository = this.repository,
				one = { id: 'one' },
				two =  { id: 'two' },
				three =  { id: 'three' };
			
			// insert into empty array
			repository.entities = [];
			repository._insertBefore(one);
			expect(repository.entities.length).to.be.eq(1);
			expect(repository.entities[0]).to.be.eq(one);

			// insert into array with one
			repository.entities = [two];
			repository._insertBefore(one, two);
			expect(repository.entities.length).to.be.eq(2);
			expect(repository.entities[0]).to.be.eq(one);
			expect(repository.entities[1]).to.be.eq(two);

			// insert into middle of array
			repository.entities = [one, three];
			repository._insertBefore(two, three);
			expect(repository.entities.length).to.be.eq(3);
			expect(repository.entities[0]).to.be.eq(one);
			expect(repository.entities[1]).to.be.eq(two);
			expect(repository.entities[2]).to.be.eq(three);

			repository.entities = []; // because the entities aren't real entities and we don't want a destory error
		});
	});

	describe('tree', function() {

		// Needed for all tree tests...
		const
			schema = new Schema({
				name: 'nodes',
				model: {
					idProperty: 'id',
					displayProperty: 'display',
					parentIdProperty: 'parent_id',
					depthProperty: 'depth',
					hasChildrenProperty: 'hasChildren',
					isTree: true,
					isClosureTable: true,
					properties: [
						{ name: 'id', type: 'int', },
						{ name: 'display', },
						{ name: 'parent_id', type: 'int', },
						{ name: 'depth', type: 'int', },
						{ name: 'hasChildren', type: 'bool', },
					],
				},
				repository: 'memory',
			}),
			Repository = RepositoryTypes.memory,
			data = [
				{
					id: 1,
					display: 'Root',
					parent_id: null,
					depth: 0,
					hasChildren: true,
					areChildrenLoaded: true,
				},
				{
					id: 2,
					display: 'Child 1',
					parent_id: 1,
					depth: 1,
					hasChildren: true,
					areChildrenLoaded: true,
				},
				{
					id: 3,
					display: 'Child 2',
					parent_id: 1,
					depth: 1,
					areChildrenLoaded: true,
				},
				{
					id: 4,
					display: 'Grandchild',
					parent_id: 2,
					depth: 2,
					areChildrenLoaded: true,
				},
			],
			creatRepository = async () => {
				const repository = new Repository({
					id: 'tree',
					schema,
					isAutoLoad: true,
					isAutoSave: true,
					isPaginated: true,
					data,
				});
				await repository.initialize();
				return repository;
			},
			destoryRepository = (repository) => {
				repository.destroy();
			};

		it('TreeNode (Entity) tests', function() {
			(async () => {
				const repository = await creatRepository();
				repository.assembleTreeNodes();

				const
					id1 = repository.getById(1),
					id2 = repository.getById(2),
					id3 = repository.getById(3),
					id4 = repository.getById(4);

				// hasChildren
				expect(id2.hasChildren).to.be.true;
				expect(id4.hasChildren).to.be.false;

				// getParent
				expect(id2.getParent()).to.be.eq(id1);
				expect(id1.getParent()).to.be.null;

				// getChildren
				let children = await id2.getChildren();
				expect(children).to.be.eql([id4]);
				
				children = await id3.getChildren();
				expect(children).to.be.empty;
				
				// hasThisChild
				let hasThisChild = await id2.hasThisChild(id3);
				expect(hasThisChild).to.be.false;
				
				hasThisChild = await id2.hasThisChild(id4);
				expect(hasThisChild).to.be.true;

				// loadChildren (& reloadChildren)
				// this needs to be on OneBuild spec

				// getPrevousSibling
				let sibling = await id2.getPrevousSibling();
				expect(sibling).to.be.null;

				sibling = await id3.getPrevousSibling();
				expect(sibling).to.be.eq(id2);

				sibling = await id3.getNextSibling();
				expect(sibling).to.be.null;

				sibling = await id2.getNextSibling();
				expect(sibling).to.be.eq(id3);

				// getChildAt
				let child = await id1.getChildAt(0);
				expect(child).to.be.eq(id2);
				
				child = await id1.getChildAt(1);
				expect(child).to.be.eq(id3);
				
				child = await id1.getChildAt(2);
				expect(child).to.be.null;
				
				// getFirstChild
				child = await id1.getFirstChild();
				expect(child).to.be.eq(id2);

				child = await id4.getFirstChild();
				expect(child).to.be.null;
				
				// getLastChild
				child = await id1.getLastChild();
				expect(child).to.be.eq(id3);

				child = await id4.getLastChild();
				expect(child).to.be.null;
				
				// getPath
				const path = id4.getPath();
				expect(path).to.be.eq('1/2/4');
				
				destoryRepository(repository);
			})();
		});

		it('loadRootNodes', function() {
			(async () => {
				const repository = await creatRepository();
				repository.assembleTreeNodes();

				const
					id1 = repository.getById(1);

				const rootNodes = repository.loadRootNodes();
				expect(rootNodes).to.be.eql([id1]);
				
				destoryRepository(repository);
			})();
		});

		it('assembleTreeNodes', function() {
			(async () => {
				const repository = await creatRepository();

				const
					id1 = repository.getById(1),
					id2 = repository.getById(2),
					id3 = repository.getById(3),
					id4 = repository.getById(4);

				// Verify no children or parents
				expect(id2.parent).to.be.null;
				expect(id2.children).to.be.empty;

				repository.assembleTreeNodes();

				// Now check that they are populated
				expect(id2.parent).to.be.eq(id1);
				expect(id2.children).to.be.eql([id4]);

				// Re-assemble them
				repository.assembleTreeNodes();

				// check them again
				expect(id2.parent).to.be.eq(id1);
				expect(id2.children).to.be.eql([id4]);
				
				destoryRepository(repository);
			})();
		});

		it('removeTreeNode', function() {
			(async () => {
				const repository = await creatRepository();
				repository.assembleTreeNodes();

				const
					id1 = repository.getById(1),
					id2 = repository.getById(2),
					id3 = repository.getById(3),
					id4 = repository.getById(4);

				const before = repository.getEntities();
				expect(before.length).to.be.eq(4);

				repository.removeTreeNode(id2);

				const after = repository.getEntities();
				expect(after.length).to.be.eq(2);
				
				destoryRepository(repository);
			})();
		});

	});

});

