const GroupsUsers = {
	
	name: 'GroupsUsers',
	model: {

		idProperty: 'groups_users__id',
		displayProperty: 'groups_users__group_id',
		
		properties: [
			{ name: 'groups_users__id',	mapping: 'id',	type: 'int' },
			{ name: 'groups_users__group_id',	mapping: 'group_id',	type: 'int' },
			{ name: 'groups_users__user_id',	mapping: 'user_id',	type: 'int' },
			{ name: 'groups__id',	mapping: 'group.id',	type: 'int' },
			{ name: 'groups__name',	mapping: 'group.name',	type: 'string',	defaultValue: 'default_group_name', },
			{ name: 'groups__description',	mapping: 'group.description',	type: 'string' },
			{ name: 'users__id',	mapping: 'user.id',	type: 'int' },
			{ name: 'users__username',	mapping: 'user.username',	type: 'string',	defaultValue: 'default_username', },
			{ name: 'users__password',	mapping: 'user.password',	type: 'string' },
			{ name: 'users__full_name',	mapping: 'user.full_name',	type: 'string' },
			{ name: 'users__first_name',	mapping: 'user.first_name',	type: 'string' },
			{ name: 'users__last_name',	mapping: 'user.last_name',	type: 'string' },
			{ name: 'users__job_title',	mapping: 'user.job_title',	type: 'string' },
			{ name: 'users__email',	mapping: 'user.email',	type: 'string' },
			{ name: 'users__login_count',	mapping: 'user.login_count',	type: 'int' },
			{ name: 'users__last_login',	mapping: 'user.last_login',	type: 'datetime' },
		],

		associations: {
			hasOne: [
				'Groups',
				'Users',
			],
		},

	},

	entity: {
		methods: {
			testMethod: function() {
				this.users__login_count = this.users__login_count +1;
			},
		},
	},

	repository: {
		type: 'onebuild',
		isAutoSave: false,
	},

};

export default GroupsUsers;
