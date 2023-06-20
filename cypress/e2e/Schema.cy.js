import Schema from '../../src/Schema/index.js';
import GroupsUsersDefinition from '../fixtures/Definitions/GroupsUsers.js';


describe('Schema', function() {
	beforeEach(function() {
		this.schema = new Schema(GroupsUsersDefinition);
	});

	it('schema is valid', function() {
		expect(this.schema instanceof Schema).to.be.true;
		expect(this.schema.name).to.be.eq('GroupsUsers');
		expect(this.schema.model.associations.hasOne).to.be.an('array');
		expect(this.schema.model.associations.hasMany).to.be.an('array');
		expect(this.schema.model.associations.belongsTo).to.be.an('array');
		expect(this.schema.model.associations.belongsToMany).to.be.an('array');
		expect(this.schema.entity.methods.testMethod).to.be.a('function');
		expect(this.schema.repository.type).to.be.eq('onebuild');
	});

	it('clone', function() {
		const clone = this.schema.clone();
		expect(clone instanceof Schema).to.be.true;
		expect(clone.name).to.be.eq('GroupsUsers');
		expect(_.isEqual(clone._originalConfig, this.schema._originalConfig)).to.be.true;
	});

	it('getPropertyDefinition', function() {
		const propertyDefinition = this.schema.getPropertyDefinition('groups_users__id');
		expect(_.isEqual(propertyDefinition.name, 'groups_users__id')).to.be.true;
	});

});