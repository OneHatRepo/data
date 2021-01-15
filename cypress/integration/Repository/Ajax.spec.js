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

	describe('custom', function() {

		it('delete phantom', async function() {
			const entity = await this.repository.add({ key: 6, value: 'six' });
			expect(entity.id).to.be.eq(6);
			expect(entity.isPersisted).to.be.false;

			await this.repository.delete(entity);
			expect(entity.isDeleted).to.be.true;

			await this.repository.save();
			expect(_.size(this.repository.entities)).to.be.eq(0);
		});
		
	});

});