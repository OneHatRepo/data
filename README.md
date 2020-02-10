# OneHat Data
[@onehat/data](https://www.npmjs.com/package/@onehat/data)
A robust ORM for Javascript.
- **Repositories.** A repository stores many entities in a storage medium. Equivalent to a database table. Repositories can sort, search/filter, and add/edit/delete their constituent entities.
- **Storage Mediums.** Repositories are specialized to store their data in a storage medium. Available types include: *Memory, Ajax, Rest, LocalStorage (Browser), SessionStorage (Browser), IndexedDB (Browser), AsyncStorage (React Native/Expo), SecureStore (React Native/Expo).* One special repository type of repository—*LocalFromRemote*—combines two different repositories, one local and one remote, which allows for autosyncing between the local and remote repositories, enabling true offline-first capability.
- **Entities.** An entity is a single record of data, organized into properties. Equivalent to a database row. Entity data can be accessed directly (entity.username), via specific properties (entity.properties.username.displayValue), or by obtaining a JS object of the whole entity (entity.getDisplayValues(), or entity.getSubmitValues()).
- **Properties.** A property is a single unit of data. Equivalent to a database field. Properties are differentiated into different property types (e.g. Integer, String, Boolean, etc), and allow for easy formatting of "display" or "submit" values. For example, a date might be set to display as "Wed, Feb 5, 2020" but submit as "2020-02-05". 
- **Properties.** A property is a single unit of data. Equivalent to a database field. Properties are differentiated into different property types (e.g. Integer, String, Boolean, etc), and allow for easy formatting of "display" or "submit" values. For example, a date might be set to display as "Wed, Feb 5, 2020" but submit as "2020-02-05". 

# Install
```
npm i @onehat/events
```

# Usage

## 1. Define a Schema
For every type of entity you will use (e.g. Users or Animals or Invoices), define a Schema. The Schema defines the various properties that each entity will have, and the storage medium where the entities will be stored.
```javascript
const Users = {
	name: 'Users',
	model: {
		idProperty: 'id',
		displayProperty: 'username',
		properties: [
			{ name: 'id',	type: 'int' },
			{ name: 'username',    type: 'string'    allowNull: false }, // explicitly set property type
			{ name: 'password', }, // type: 'string' is assumed
			{ name: 'first_name', },
			{ name: 'last_name', },
			{ name: 'email', },
			{ name: 'last_login',	type: 'datetime', },
		],
	},
	repository: 'memory',
};
export default Users;
```
Every property must have a unique name. All other attributes of a property are optional.
Property attributes can include:
- **allowNull** - Is the property required to have a value?
- **depends** - Array of other properties this property depends upon for its custom "parse" function
- **mapping** - JS dot-notation path (e.g. "user.username") for how to access the rawValue which will be given to parse()
- **defaultValue** - Default value for this property if none is supplied
- **submitAsString** - Whether to submit value as a string, rather than a primitive or complex type
- **isSortable** - Whether this property type is sortable

## 2. Create a Repository
The easiest way to create one or more repositories is to use the global oneHatData singleton object.
Each schema will have a bound repository of the same name (e.g. "Users").
```javascript
import oneHatData from '@onehat/data';
import Users from './Users';

oneHatData
	.createSchemas(Users)
	.createBoundRepositories()
	.then(() => {
		setIsReady(true);
		
		const repository = oneHatData.getRepository('Users');
	});
```

## To be continued...