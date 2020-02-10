const Users = {
	
	name: 'Users',
	model: {

		idProperty: 'users__id',
		displayProperty: 'users__username',
		
		properties: [
			{ name: 'users__id',	mapping: 'id',	type: 'int' },
			{ name: 'users__username',	mapping: 'username',	type: 'string' },
			{ name: 'users__password',	mapping: 'password',	type: 'string',	allowNull: true },
			{ name: 'users__full_name',	mapping: 'full_name',	type: 'string',	allowNull: true } /* virtual field */,
			{ name: 'users__first_name',	mapping: 'first_name',	type: 'string',	allowNull: true },
			{ name: 'users__last_name',	mapping: 'last_name',	type: 'string',	allowNull: true },
			{ name: 'users__job_title',	mapping: 'job_title',	type: 'string',	allowNull: true },
			{ name: 'users__email',	mapping: 'email',	type: 'string',	allowNull: true },
			{ name: 'users__login_count',	mapping: 'login_count',	type: 'int',	allowNull: true },
			{ name: 'users__last_login',	mapping: 'last_login',	type: 'datetime',	allowNull: true },
		],

	},

	repository: 'onebuild',

};

export default Users;
