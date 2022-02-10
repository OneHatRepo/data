import RepositoryTypes from '../../../src/Repository';
import Schema from '../../../src/Schema';

describe('Repository Base', function() {
	beforeEach(function() {
		this.schema = new Schema({
			name: 'bar',
			model: {
				idProperty: 'key',
				displayProperty: 'value',
				properties: [
					{ name: 'key', type: 'int' },
					{ name: 'value' },
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
			autoLoad: true,
			autoSave: true,
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
			expect(this.repository.autoSave).to.be.true;
			this.repository.setAutoSave(false);
			expect(this.repository.autoSave).to.be.false;
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
			this.repository.filter({
				name: 'key',
				value: '1',
			});
			const filter = this.repository.filters[0];
			expect(filter.name).to.be.eq('key');
			expect(filter.value).to.be.eq('1');
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

	describe('options', function() {
		it('setOptions', function() {

			this.repository.setOptions({
				api: {
					baseURL: 'test123',
				},
			});
			
			expect(this.repository.api.baseURL).to.be.eq('test123');
		});
	});

	it('toString', function() {
		const str = this.repository.toString();
		expect(str).to.be.eq('NullRepository {bar} - foo');
	});

});

