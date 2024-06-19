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

	it('getDefaultValues', function() {
		const
			defaultValues = this.schema.getDefaultValues(),
			expectedDefaultValues = {
				groups_users__id: null,
				groups_users__group_id: null,
				groups_users__user_id: null,
				groups__id: null,
				groups__name: 'default_group_name',
				groups__description: null,
				users__id: null,
				users__username: 'default_username',
				users__password: null,
				users__full_name: null,
				users__first_name: null,
				users__last_name: null,
				users__job_title: null,
				users__email: null,
				users__login_count: null,
				users__last_login: null,
			};

		// console.log('defaultValues', defaultValues);
		// console.log('expectedDefaultValues', expectedDefaultValues);

		expect(defaultValues).to.be.eql(expectedDefaultValues);
	});

	it('getTitles, getVirtualdPropertyNames, getIsFilteringDisabledPropertyNames, getIsEditingDisabledPropertyNames, getFieldGroupNames, getFilterTypes', function() {
		const
			schema = new Schema({
				id: 'foo',
				name: 'foo',
				model: {
					idProperty: 'model__field1',
					displayProperty: 'model__field2',
					properties: [
						{
							name: 'model__field1',
							title: 'title1',
							isVirtual: true,
							isFilteringDisabled: false,
							filterType: {
								type: 'Combo',
								loadAfterRender: false,
							},
							isEditingDisabled: true,
							fieldGroup: 'group1',
						},
						{
							name: 'model__field2',
							title: 'title2',
							isVirtual: true,
							isFilteringDisabled: true,
							isEditingDisabled: false,
							fieldGroup: 'group1',
						},
						{
							name: 'model__field3',
							title: 'title3',
							isVirtual: false,
							isFilteringDisabled: true,
							isEditingDisabled: true,
							fieldGroup: 'group2',
						},
					],
				},
			}),
			titles = [
				'title1',
				'title2',
				'title3',
			],
			virtualPropertyNames = [
				'model__field1',
				'model__field2',
			],
			isFilteringDisabledPropertyNames = [
				'model__field2',
				'model__field3',
			],
			isEditingDisabledPropertyNames = [
				'model__field1',
				'model__field3',
			],
			fieldGroupNames = [
				'group1',
				'group2',
			],
			filterTypes = {
				model__field1: {
					type: 'Combo',
					loadAfterRender: false,
				},
			};

		expect(schema.getTitles()).to.be.eql(titles);
		expect(schema.getVirtualPropertyNames()).to.be.eql(virtualPropertyNames);
		expect(schema.getIsFilteringDisabledPropertyNames()).to.be.eql(isFilteringDisabledPropertyNames);
		expect(schema.getIsEditingDisabledPropertyNames()).to.be.eql(isEditingDisabledPropertyNames);
		expect(schema.getFieldGroupNames()).to.be.eql(fieldGroupNames);
		expect(schema.getFilterTypes()).to.be.eql(filterTypes);
		
	});

});