import Schema from '../../src/Schema';
import GroupsUsersDefinition from '../fixtures/Definitions/GroupsUsers';


describe('Schema', function() {
	beforeEach(function() {
		this.schema = new Schema(GroupsUsersDefinition);
	});

	it('schema is valid', function() {
		expect(this.schema instanceof Schema).to.be.true;
		expect(this.schema.name).to.be.eq('GroupsUsers');
	});

	it('clone', function() {
		const clone = this.schema.clone();
		expect(clone instanceof Schema).to.be.true;
		expect(clone.name).to.be.eq('GroupsUsers');
		expect(_.isEqual(clone._originalConfig, this.schema._originalConfig)).to.be.true;
	});

});