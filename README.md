<img src="onehat-data.svg" alt="@onehat/data" style="width: 400px;" />

# Overview
[@onehat/data](https://www.npmjs.com/package/@onehat/data)
A robust ORM for Javascript. 
Can CRUD, search, sort, filter, paginate your data. Integrates with many front- and back-end storage mediums.

- **Repositories.** A Repository stores many Entities in a storage medium. Corresponds to a database table. 
Repositories can sort, search/filter, and add/edit/delete their constituent Entities.
- **Storage Mediums.** Repositories are specialized to store their data in a single type of storage medium. 
Available types of Repositories include: *Memory, Ajax, Rest, LocalStorage (Browser), SessionStorage (Browser), 
IndexedDB (Browser), AsyncStorage (React Native/Expo), SecureStore (React Native/Expo).* 
One special type of Repository—*LocalFromRemote*—combines two different Repository types (one local and one remote) into a single Repository, 
thereby allowing autosyncing between the local and remote repositories, enabling true offline-first capability.
- **Entities.** An Entity is a single record of data, organized into properties. Corresponds to a database row. 
Entity data can be accessed directly (entity.username), via specific properties and their formatted values (entity.properties.username.displayValue), 
or by obtaining a JS object of the whole Entity (entity.getDisplayValues(), or entity.getSubmitValues()).
- **Properties.** A Property is a single unit of data. Corresponds to a database field. 
Properties are differentiated into different Property types (e.g. *Integer, String, Boolean,* etc), 
and thereby allow for easy formatting of "display" or "submit" values. 
For example, a date might be set to display as "Wed, Feb 5, 2020" but submit as "2020-02-05". 
- **Schemas.** A Schema defines the configuration of a Repository. Corresponds roughly to the database table schema.
The Schema defines the name and type of Repository, the Properties that exist, and which are "id" and "display" Properties.

# Install
```
npm i @onehat/data
```

# Usage

Comprehensive unit tests can be found in *./cypress/integration*. These are an excellent source of code examples.
Comprehensive API documentation can be found in *./docs*.

## 1. Define a Schema
For every type of Entity you will use (e.g. Users or Animals or Invoices), define a Schema. 
A Schema determines the various Properties that each Entity will have, as well as the medium 
where the Entities will be stored.
```javascript
const Users = {
	name: 'Users',
	model: {
		idProperty: 'id',
		displayProperty: 'username',
		properties: [
			{ name: 'id', type: 'int', },
			{ name: 'username', type: 'string', }, // explicitly set property type
			{ name: 'password', }, // type: 'string' is assumed, if not explicitly set
			{ name: 'first_name', },
			{ name: 'last_name', },
			{ name: 'email', allowNull: false, }, // make it a required field
			{ name: 'last_login', type: 'datetime', defaultValue: 'now', }, // give it a default value.
		],
		sorters: [
			{
				name: 'last_name',
				direction: 'ASC',
			},
			{
				name: 'first_name',
				direction: 'ASC',
			},
		],
	},
	repository: 'memory', // Repository type. Can be string name or config object
};
export default Users;
```

Every Property must have a unique name. All other attributes are optional.
Common Property attributes include:
- **name** - The name of the Property
- **type** - The type of the Property (e.g. 'string', 'bool', 'int', etc)
- **allowNull** - Is this Property required to have a value?
- **defaultValue** - Default value for this Property if none is supplied
- **isSortable** - Whether this Property type is sortable

Other Property attributes exist and can be found in the API.

## 2. Create a Repository
The easiest way to create one or more Repositories is to use the global *oneHatData* singleton object.
Each schema will have a bound repository of the same name (e.g. "Users", or "Groups").
```javascript
import oneHatData from '@onehat/data';
import Groups from './Groups';
import Users from './Users';

oneHatData
	.createSchemas([
		Groups,
		Users,
	])
	.createBoundRepositories()
	.then(() => {
		setIsReady(true);
		
		const UsersRepository = oneHatData.getRepository('Users');

		// Do something with your data

	});
```


## 3. Add / Edit / Delete an Entity
Once you have a Repository initialized, you can start adding data to it.
Data is manipulated asynchronously, so you may optionally wait for it to complete.

```javascript
const UsersRepository = oneHatData.getRepository('Users');

// 1. Add an Entity
const userEntity = await UsersRepository.add({
	username: 'ajones',
	password: '12345',
	first_name: 'Alice',
	last_name: 'Jones',
	email: 'alice@example.com',
});


// 2. Edit an Entity
// Use assignment to change the value of a particular Property.
userEntity.password = 'mypass';

// Or you can be more verbose about it
userEntity.getProperty('password').setValue('mypass');


// 3. Delete an Entity
userEntity.delete();

// Or delete it from the Repository
await UsersRepository.delete(userEntity);
```


## 4. Filter and Sort the Entities in a Repository
There are lots of filtering and sorting methods available on Repositories.

```javascript
// Add a single filter
UsersRepository.filter('first_name', 'Alice');
const foundEntities = UsersRepository.entities;

// Or search by an id or function
const myEntity = UsersRepository.getById(1);
const results = UsersRepository.getBy((entity) => {
	return entity.id > 2;
});

// Sort the entities by a particular Property
UsersRepository.sort('last_name', 'DESC');
const sortedEntities = UsersRepository.entities;
```


## 5. Listen for events and respond to them
Repositories, Entities, and Properties emit many different kinds of events.

```javascript
// The 'change' event, emitted from an Entity, is relayed through the Repository and becomes 'entity_change'
UsersRepository.on('entity_change', (entity) => {
	console.log('changed entity');
});
userEntity.first_name = 'Joe';
// prints 'changed entity' to console


// The 'changeData' event is fired from the Repository after multiple Entities are loaded at once
UsersRepository.on('changeData', (entities) => {
	console.log('entities changed');
});
UsersRepository.load([
	{ email: 'alice@example.com' },
	{ email: 'bob@example.com' },
	{ email: 'charlie@example.com' },
]);
// prints 'entities changed' to console
```