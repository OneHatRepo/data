import RepositoryTypes from '../../../src/Repository';
import Schema from '../../../src/Schema';

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
			autoSave: false,
		});
		this.repository.initialize();
		this.schema.setBoundRepository(this.repository);
	});

	afterEach(function() {
		this.schema.destroy();
		this.repository.destroy();
	});

	describe('Params', function() {
		it('setValuelessParam', function() {
			const r = this.repository;
			r.setParam('conditions[field]', 1);
			r.setValuelessParam('conditions[field IS NOT NULL]');

			expect(r._params.conditions.field).to.be.eq(1);
			expect(r._params.conditions[0]).to.be.eq('field IS NOT NULL');
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
		
	});

});