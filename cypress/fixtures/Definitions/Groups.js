const Groups = {
	
	name: 'Groups',
	model: {

		idProperty: 'groups__id',
		displayProperty: 'groups__name',
		
		properties: [
			{ name: 'groups__id',	mapping: 'id',	type: 'int' },
			{ name: 'groups__name',	mapping: 'name',	type: 'string' },
			{ name: 'groups__description',	mapping: 'description',	type: 'string',	allowNull: true }
		],

	},

	repository: 'onebuild',

};

export default Groups;
