import RepositoryTypes from '../../../src/Repository/index.js';
import Schema from '../../../src/Schema/index.js';

describe('OneBuildRepository', function() {
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
			},
		});
		this.Repository = RepositoryTypes.onebuild;
		this.repository = new this.Repository({
			id: 'foo',
			schema: this.schema,
			isAutoSave: false,
		});
		this.repository.initialize();
		this.schema.setBoundRepository(this.repository);
	});

	afterEach(function() {
		this.schema.destroy();
		this.repository.destroy();
	});

	describe('Params', function() {

		it('setParam', function() {
			const r = this.repository;
			r.setParam('test', 1);

			expect(r._params.test).to.be.eq(1);
		});

		it('setParams', function() {
			const r = this.repository;
			r.setParams({
				test1: 1,
				test2: 2,
			});

			expect(r._params.test1).to.be.eq(1);
			expect(r._params.test2).to.be.eq(2);
		});

		it('setBaseParam', function() {
			const r = this.repository;
			r.setBaseParam('test', 1);

			expect(r._baseParams.test).to.be.eq(1);
		});

		it('setBaseParams', function() {
			const r = this.repository;
			r.setBaseParams({
				test1: 1,
				test2: 2,
			});

			expect(r._baseParams.test1).to.be.eq(1);
			expect(r._baseParams.test2).to.be.eq(2);
		});

		it('setValuelessParam', function() {
			const r = this.repository;
			r.setParam('conditions[field]', 1);
			r.setValuelessParam('conditions[field IS NOT NULL]');

			expect(r._params.conditions.field).to.be.eq(1);
			expect(r._params.conditions[0]).to.be.eq('field IS NOT NULL');
		});

		it('clearParams', function() {
			const r = this.repository;
			r.setParams({
				test1: 1,
				test2: 2,
			});
			r.setBaseParams({
				test1: 1,
				test2: 2,
			});

			r.clearParams(false, true);

			expect(r._params).to.be.empty;
			expect(r._baseParams).to.be.empty;
		});

	});

	describe('custom', function() {

		it('delete phantom', async function() {
			const entity = await this.repository.add({ key: 6, value: 'six' });
			expect(entity.id).to.be.eq(6);
			expect(entity.isPersisted).to.be.false;

			await this.repository.delete(entity);
			expect(entity.isDeleted).to.be.true;

			await this.repository.save();
			expect(_.size(this.repository.entities)).to.be.eq(0);

			await this.repository.add({ key: 6, value: 'six' });
			expect(_.size(this.repository.entities)).to.be.eq(1);
		});

		it.only('sortInMemory', function() {

			const repository = this.repository;

			// Create two phantom records, out of order
			repository.setAutoSave(false);
			repository.add({ key: 5, value: 'Five', });
			repository.add({ key: 4, value: 'One', });
			repository.add({ key: 2, value: 'Two', });
			repository.add({ key: 3, value: 'Three', });
			repository.add({ key: 1, value: 'One', });

			repository.sorters = [
				{ name: 'value', direction: 'DESC', }, // 2,3,4,1,5
				{ name: 'key', direction: 'ASC', }, // 2,3,1,4,5
			];
			repository.sortInMemory();

			// Check that they are correct order
			const entities = repository.entities;
			expect(entities[0].key).to.be.eq(2);
			expect(entities[1].key).to.be.eq(3);
			expect(entities[2].key).to.be.eq(1);
			expect(entities[3].key).to.be.eq(4);
			expect(entities[4].key).to.be.eq(5);
		});
		
	});

});