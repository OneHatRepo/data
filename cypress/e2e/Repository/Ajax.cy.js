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

		it('getBaseParamConditions', function() {
			const
				r = this.repository,
				newConditions = {
					'conditions[Model.model]': 'test1',
					'conditions[Model.modelid]': 'test2',
				};

			r.setBaseParams(newConditions);

			const conditions = r.getBaseParamConditions();

			expect(conditions).to.eql(newConditions);
		});

		it('hasParam', function() {
			const r = this.repository;
			r.setParam('test', 1);

			const result = r.hasParam('test');

			expect(result).to.be.true;
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

		it('hasBaseParam', function() {
			const r = this.repository;
			r.setBaseParam('test', 1);

			const result = r.hasBaseParam('test');

			expect(result).to.be.true;
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
			expect(r._params.conditions['field IS NOT NULL']).to.be.true;
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

		it('sortInMemory', function() {

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

		it('setIsOnline', function() {

			const repository = this.repository;

			repository.setIsOnline(true);
			expect(repository.isOnline).to.be.true;

			repository.setIsOnline(false);
			expect(repository.isOnline).to.be.false;
		});

		it('save merges requestParams for add/edit/delete', async function() {
			const repository = this.repository;
			const sends = [];

			repository._send = (method, url, data) => {
				sends.push({ method, url, data, });
				return Promise.resolve({ method, url, data, });
			};
			repository._processServerResponse = (result) => ({
				root: [result.data],
				success: true,
				total: 1,
				message: '',
			});

			const entity = await repository.add({ key: 6, value: 'six', });
			await repository.save(entity, false, {
				requestParams: {
					tenant_id: 101,
				},
			});
			expect(sends[0].data.key).to.equal(6);
			expect(sends[0].data.value).to.equal('six');
			expect(sends[0].data.tenant_id).to.equal(101);

			entity.value = 'SIX';
			await repository.save(entity, false, {
				requestParams: {
					tenant_id: 102,
					trace_id: 'edit-123',
				},
			});
			expect(sends[1].data.key).to.equal(6);
			expect(sends[1].data.value).to.equal('SIX');
			expect(sends[1].data.tenant_id).to.equal(102);
			expect(sends[1].data.trace_id).to.equal('edit-123');

			await repository.delete(entity);
			await repository.save(entity, false, {
				requestParams: {
					tenant_id: 103,
				},
			});
			expect(sends[2].data.id).to.equal(6);
			expect(sends[2].data.tenant_id).to.equal(103);
		});

		it('add forwards options.requestParams when autoSave is enabled', async function() {
			const repository = this.repository;
			const sends = [];

			repository.setAutoSave(true);
			repository._send = (method, url, data) => {
				sends.push({ method, url, data, });
				return Promise.resolve({ method, url, data, });
			};
			repository._processServerResponse = (result) => ({
				root: [result.data],
				success: true,
				total: 1,
				message: '',
			});

			await repository.add({ key: 9, value: 'nine', }, false, false, {
				requestParams: {
					tenant_id: 201,
				},
			});

			expect(sends).to.have.length(1);
			expect(sends[0].data.key).to.equal(9);
			expect(sends[0].data.value).to.equal('nine');
			expect(sends[0].data.tenant_id).to.equal(201);
		});

		it('save merges requestParams for batch add/edit/delete', async function() {
			const repository = this.repository;
			const sends = [];

			repository.combineBatch = true;
			repository._send = (method, url, data) => {
				sends.push({ method, url, data, });
				return Promise.resolve({ method, url, data, });
			};
			repository._processServerResponse = (result) => ({
				root: result.data.entities || [],
				success: true,
				total: _.size(result.data.entities || []),
				message: '',
			});

			const one = await repository.add({ key: 11, value: 'one-one', });
			const two = await repository.add({ key: 12, value: 'one-two', });

			await repository.save(null, false, {
				requestParams: {
					tenant_id: 301,
				},
			});
			expect(sends[0].data.entities).to.have.length(2);
			expect(sends[0].data.tenant_id).to.equal(301);

			one.value = 'ONE-ONE';
			two.value = 'ONE-TWO';
			await repository.save(null, false, {
				requestParams: {
					tenant_id: 302,
				},
			});
			expect(sends[1].data.entities).to.have.length(2);
			expect(sends[1].data.tenant_id).to.equal(302);

			await repository.delete(one);
			await repository.delete(two);
			await repository.save(null, false, {
				requestParams: {
					tenant_id: 303,
				},
			});
			expect(sends[2].data.ids).to.have.length(2);
			expect(sends[2].data.tenant_id).to.equal(303);
		});
		
	});

});