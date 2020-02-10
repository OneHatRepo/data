const GroupsUser = {
	id: 1,
	group_id: 1,
	user_id: 1,
	group: {
		id: 1,
		name: 'Test Group',
		description: 'This is a test group',
	},
	user: {
		id: 1,
		username: 'testuser',
		email: 'test@example.com',
		password: null,
		active: true,
		last_login: new Date(),
		email_token: null,
		email_verified: true,
		email_token_expires: null,
		password_token: null,
		password_token_expires: null,
	},
};

export default GroupsUser;
