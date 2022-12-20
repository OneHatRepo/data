import RepositoryTypes from '../../../src/Repository';
import Schema from '../../../src/Schema';

describe('MemoryRepository', function() {
	beforeEach(function() {
		this.schema = new Schema({
			name: 'bar',
			model: {
				idProperty: 'key',
				displayProperty: 'value',
				sorters: [
					{
						name: 'key',
						direction: 'ASC',
					},
				],
				properties: [
					{ name: 'key', type: 'int' },
					{ name: 'value' },
				],
			},
		});
		this.Repository = RepositoryTypes.memory;
		this.repository = new this.Repository({
			id: 'foo',
			schema: this.schema,
			isPaginated: true,
			isSorted: true,
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

	describe('loading', function() {

		it('load', function() {
			this.repository.load([
				{ key: 'foo', value: 1, },
				{ key: 'bar', value: 2, },
				{ key: 'baz', value: 3, },
			]);
			expect(_.size(this.repository.entities)).to.be.eq(3);
		});

		it('reloadEntity', function() {
			let didFire1 = false,
				didFire2 = true;
			this.repository.on('reloadEntity', () => {
				didFire1 = true;
			});
			this.repository.load([
				{ key: 'foo', value: 1, },
				{ key: 'bar', value: 2, },
				{ key: 'baz', value: 3, },
			]);
			const entity = this.repository.getByIx(0);
			entity.on('reload', () => {
				didFire2 = true;
			});
			this.repository.reloadEntity(entity);
			expect(didFire1).to.be.true;
			expect(didFire2).to.be.true;
		});

		it.skip('check UUID as ID', async function() {
			const entity = await this.repository.add({ value: 1, });
			const found = this.repository.getById(entity.id);
			expect(!!found).to.be.true;
		});

	});

	describe('sorting', function() {

		it('_applySorters', function() {
			this.repository.sort('key', 'DESC');
			const before = this.repository.getRawValues();
			this.repository.sort('value', 'ASC');
			const after = this.repository.getRawValues();
			
			expect(_.isEqual(before, after)).to.be.false;
			expect(before[4].value).to.be.eq('one');
			expect(after[4].value).to.be.eq('two');
		});

		it('_getCompareFunction', function() {
			const sorter = this.repository.sorters[0],
				compare = this.Repository._getCompareFunction(sorter), // NOTE: Using this.Repository (capital "R"), bc this is a static function
				data = this.repository.data,
				result1 = compare(data[0], data[1]),
				result2 = compare(data[1], data[1]),
				result3 = compare(data[1], data[0]);
				
			expect(result1).to.be.eq(-1);
			expect(result2).to.be.eq(0);
			expect(result3).to.be.eq(1);
		});

	});

	describe('filtering', function() {

		it('_applyFilters - none', function() {
			this.repository.filter();
			const result = this.repository.getRawValues();
	
			expect(_.size(result)).to.be.eq(5);
		});
	
		it('_applyFilters - one', function() {
			this.repository.filter({
				name: 'key',
				value: 1,
			});
			const result = this.repository.getRawValues();
			expect(_.size(result)).to.be.eq(1);
		});

		it('_applyFilters - multiple', function() {
			this.repository.filter([
				{
					name: 'key',
					value: '1',
				},
				{
					name: 'value',
					value: '2',
				},
			]);
			const result = this.repository.getRawValues();
	
			expect(_.size(result)).to.be.eq(0);
		});

	});

	describe('pagination', function() {

		it('various methods', function() {

			// pageTotal
			expect(this.repository.pageTotal).to.be.eq(5);
	
			// setPageSize
			this.repository.setPageSize(2);
			this.repository.setPage(2);
			expect(this.repository.pageTotal).to.be.eq(2);
			let entitiesOnPage = this.repository.getEntitiesOnPage();
			expect(_.size(entitiesOnPage)).to.be.eq(2);

			expect(entitiesOnPage[0].id).to.be.eq(3);
			expect(entitiesOnPage[1].id).to.be.eq(4);
	
			// setPage
			this.repository.setPage(3);
			expect(this.repository.pageTotal).to.be.eq(1);
			entitiesOnPage = this.repository.getEntitiesOnPage();
			expect(_.size(entitiesOnPage)).to.be.eq(1);
	
			// prevPage
			this.repository.prevPage();
			expect(this.repository.pageTotal).to.be.eq(2);
	
			// nextPage
			this.repository.nextPage();
			expect(this.repository.pageTotal).to.be.eq(1);
		});

	});

	describe('creating', function() {

		it('_addEntity', async function() {
			let didFireAdd = false;
			this.repository.on('add', () => {
				didFireAdd = true;
			});
			const entity = await this.repository.add({ key: 6, value: 'six' });
			expect(entity.id).to.be.eq(6);
			expect(_.size(this.repository.entities)).to.be.eq(6);
			expect(didFireAdd).to.be.true;
		});
		
	});

	describe('retrieving', function() {

		it('getEntities', function() {
			const entities = this.repository.getEntities();
			expect(entities.length).to.be.eq(5);
		});

		it('getById', function() {
			let result = this.repository.getById(2);
			expect(result.value).to.be.eq('two');

			result = this.repository.getById(4);
			expect(result.value).to.be.eq('four');
		});

		it('getBy', function() {
			const results = this.repository.getBy((entity) => {
				return entity.id > 2;
			});
			expect(_.size(results)).to.be.eq(3);
		});

		it('getFirstBy', function() {
			const result = this.repository.getFirstBy((entity) => {
				return entity.id > 2;
			});
			expect(result.id).to.be.eq(3);
		});

		it('Repository.* retrieve methods, after delete/add', async function() {
			
			this.repository.sort('key', 'ASC');

			// Delete two records, add two more
			await this.repository.deleteBy((entity) => entity.id % 2 === 0); // delete entities with even numbered id's (there should be two)
			await this.repository.addMultiple([
				{ key: 6, value: 'six', },
				{ key: 7, value: 'seven', },
			], true);

			// Now check all Repository.* retrieve methods
			expect(_.size(this.repository.entities)).to.be.eq(5);
			expect(_.size(this.repository.getSubmitValues())).to.be.eq(5);
			expect(_.size(this.repository.getDisplayValues())).to.be.eq(5);
			expect(_.size(this.repository.getRawValues())).to.be.eq(5);
			expect(_.size(this.repository.getOriginalData())).to.be.eq(5);
			expect(_.size(this.repository.getParsedValues())).to.be.eq(5);
			expect(this.repository.getByIx(2).value).to.be.eq('five');
			expect(_.size(this.repository.getNonPersisted())).to.be.eq(0);
			expect(_.size(this.repository.getPhantom())).to.be.eq(0);
			expect(_.size(this.repository.getDirty())).to.be.eq(0);
			expect(_.size(this.repository.getDeleted())).to.be.eq(0);
			expect(_.size(this.repository.entities)).to.be.eq(5);
			const entity = this.repository.getByIx(0);
			expect(this.repository.isInRepository(entity)).to.be.true;

		});
	});

	describe('updating', function() {
		
		it('save', function() {
			this.repository.setAutoSave(false);

			let firedChangeData = false;
			this.repository.on('changeData', () => {
				firedChangeData = true;
			});

			// create a nonPersisted entity
			this.repository.add({ value: 'six' });

			// create a dirty entity
			this.repository.getById(2)
				.setValue('value', 'foo');

			// Check "before" state
			let nonPersistedEntities = this.repository.getNonPersisted(),
				dirtyEntities = this.repository.getDirty();
			expect(_.size(nonPersistedEntities)).to.be.eq(1);
			expect(_.size(dirtyEntities)).to.be.eq(1);

			this.repository.save();

			// Check "after" state
			nonPersistedEntities = this.repository.getNonPersisted();
			dirtyEntities = this.repository.getDirty();
			expect(_.size(nonPersistedEntities)).to.be.eq(0);
			expect(_.size(dirtyEntities)).to.be.eq(0);
			expect(_.size(this.repository.entities)).to.be.eq(6);
			expect(firedChangeData).to.be.true;
		});
		
		it.skip('sort, set direct value, fires event', function() {

			this.repository.sort('key');

			let firedChangeData = false;
			this.repository.on('changeData', () => {
				firedChangeData = true;
			});

			const entity = this.repository.getById(2);
			entity.value = 'Test';

			expect(firedChangeData).to.be.true;
		});

	});

	describe('events', function() {

		it('changeData - add, manual save', function() {
			let changeData = 0;
			this.repository.on('changeData', () => { changeData++; });
	
			this.repository.setAutoSave(false);
			this.repository.add({ value: 'six' });
			this.repository.save();
			
			expect(changeData).to.be.eq(1);
		});

		it('changeData - add, auto save', function() {
			let changeData = 0;
			this.repository.on('changeData', () => { changeData++; });
	
			this.repository.setAutoSave(true);
			this.repository.add({ value: 'six' });
			
			expect(changeData).to.be.eq(1);
		});

		it('changeData - edit, manual save', function() {
			let changeData = 0;
			this.repository.on('changeData', () => { changeData++; });
	
			this.repository.setAutoSave(false);
			this.repository.getById(1).value = 'Test';
			this.repository.save();
			
			expect(changeData).to.be.eq(1);
		});

		it('changeData - edit, auto save', function() {
			let changeData = 0;
			this.repository.on('changeData', () => { changeData++; });
	
			this.repository.setAutoSave(true);
			this.repository.getById(1).value = 'Test';
			
			expect(changeData).to.be.eq(1);
		});

		it('changeData - edit after sort, auto save', function() {
			this.repository.setAutoSave(true);
			this.repository.sort('key');

			let changeData = 0;
			this.repository.on('changeData', () => { changeData++; });
	
			this.repository.getById(1).value = 'Test';
			
			expect(changeData).to.be.eq(1);
		});

	});

	describe('deleting', function() {

		it('delete - no autoSave', function() {
			let didFire = false;
			this.repository.on('delete', () => {
				didFire = true;
			});
			const entity = this.repository.getById(2),
				id = entity.id;

			this.repository.setAutoSave(false);
			this.repository.delete(entity);
			this.repository.save();

			const found = this.repository.isInRepository(id);
			expect(found).to.be.false;
			expect(didFire).to.be.true;
		});

		it('delete - autoSave', function() {
			let didFire = false;
			this.repository.on('delete', () => {
				didFire = true;
			});
			const entity = this.repository.getById(2),
				id = entity.id;

			this.repository.delete(entity);

			const found = this.repository.isInRepository(id);
			expect(found).to.be.false;
			expect(didFire).to.be.true;
		});

		it('deleteAll', async function() {
			
			expect(this.repository.entities.length).to.be.eq(5);
			await this.repository.deleteAll();
			expect(this.repository.entities.length).to.be.eq(0);

		});

		it('deleteByIx', function() {
			const entity = this.repository.getByIx(2),
				id = entity.id;
			this.repository.deleteByIx(2);
			const found = this.repository.isInRepository(id);
			expect(found).to.be.false;
		});

		it('deleteByRange', function() {
			const entities = this.repository.getByRange(2,3),
				id = entities[1].id;
			this.repository.deleteByRange(2,3);
			const found = this.repository.isInRepository(id);
			expect(found).to.be.false;
		});

		it('deleteBy', function() {
			const filter = (entity) => {
					return entity.id === 3;
				},
				entities = this.repository.getBy(filter),
				id = entities[0].id;
			this.repository.deleteBy(filter);
			const found = this.repository.isInRepository(id);
			expect(found).to.be.false;
		});

		it('deleteById', function() {
			const entity = this.repository.getById(2),
				id = entity.id;
			this.repository.deleteById(2);
			const found = this.repository.isInRepository(id);
			expect(found).to.be.false;
		});

		it('deleteDirty', function() {
			this.repository.setAutoSave(false);

			const entity = this.repository.getById(1);
			entity.setValue('value', 'test');

			const entities = this.repository.getDirty(),
				id = entities[0].id;

			this.repository.deleteDirty();
			this.repository.save();

			const found = this.repository.isInRepository(id);
			expect(found).to.be.false;
		});

		it('deletePhantom', function() {
			this.repository.setAutoSave(false);

			this.repository.add({ value: 'six' });
			const entities = this.repository.getNonPersisted(),
				id = entities[0].id;

			this.repository.deletePhantom();
			this.repository.save();

			const found = this.repository.isInRepository(id);
			expect(found).to.be.false;
		});

	});

	describe('custom implementation', function() {

		it.skip('_recalculate', function() {
			
		});

	});

	describe('toString', function() {

		it('toString', function() {
			const str = this.repository.toString();
			expect(str).to.be.eq('MemoryRepository {bar} - foo');
		});

	});

});