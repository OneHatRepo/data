import Joi from 'Joi';
import * as yup from 'yup';
import Entity from '../../src/Entity/Entity.js';
import Schema from '../../src/Schema/index.js';
import PropertyTypes from '../../src/Property/index.js';


describe('Entity', function() {

	beforeEach(function() {
		this.schema = new Schema({
			name: 'baz',
			model: {
				idProperty: 'foo',
				displayProperty: 'bar',
				properties: [
					{ name: 'foo', type: 'int' },
					{ name: 'bar' },
					{ name: 'baz', mapping: 'baz.test.val', type: 'bool', defaultValue: null, },
				],
				validator: null,
			},
			entity: {
				methods: {
					testMethod: function() {
						this.azx = 'test me';
					},
				},
				statics: {
					azx: null,
				},
			},
		});
		this.data = {
			foo: 1,
			bar: 'one',
			baz: {
				test: {
					val: true,
				},
			},
		};
		this.entity = new Entity(this.schema, this.data);
		this.entity.initialize();
	});

	afterEach(function() {
		if (!this.entity.isDestroyed) {
			this.entity.destroy();
		}
		if (!this.schema.isDestroyed) {
			this.schema.destroy();
		}
	});

	describe('constructor', function() {

		it('creates an entity', function() {
			expect(this.entity instanceof Entity).to.be.true;
			expect(this.entity.getSchema()).to.be.eq(this.schema);
			expect(this.entity.id).to.be.eq(1);
		});

		it('createTempId, isTempId', function() {
			const schema = new Schema({
					name: 'baz',
					model: {
						idProperty: 'foo',
						displayProperty: 'bar',
						properties: [
							{ name: 'foo', type: 'int' },
							{ name: 'bar' },
						],
					},
				}),
				data = {
					bar: 'one',
				},
				entity = new Entity(schema, data);
			entity.initialize();
			expect(entity.id).to.be.null;
			expect(entity.isTempId).to.be.false;

			entity.createTempId();
			expect(entity.id).to.be.not.null;
			expect(entity.isTempId).to.be.true;

			entity.markSaved();
			expect(entity.isTempId).to.be.false;

			entity.isTempId = true;
			expect(entity.isTempId).to.be.true;
		});
	
		it('clone', function() {
			const entity = this.entity;

			entity.bar = 'two';
			const clone = entity.clone();

			expect(entity === clone).to.be.false;
			expect(_.isEqual(entity.id, clone.id)).to.be.true;
			expect(_.isEqual(entity.displayValue, clone.displayValue)).to.be.true;
			expect(_.isEqual(entity.isDirty, clone.isDirty)).to.be.true;
			expect(_.isEqual(entity.isPersisted, clone.isPersisted)).to.be.true;
			expect(_.isEqual(entity.isDeleted, clone.isDeleted)).to.be.true;
			expect(_.isEqual(entity._originalData, clone._originalData)).to.be.true;
			expect(_.isEqual(entity.getOriginalData(), clone.getOriginalData())).to.be.true;
			expect(_.isEqual(entity.getRawValues(), clone.getRawValues())).to.be.true;
			expect(_.isEqual(entity.getParsedValues(), clone.getParsedValues())).to.be.true;
			expect(_.isEqual(entity.getDisplayValues(), clone.getDisplayValues())).to.be.true;
			expect(_.isEqual(entity.getSubmitValues(), clone.getSubmitValues())).to.be.true;
		});
	
		it('_createProperties', function() {
			const entity = this.entity;
			expect(_.size(entity.properties)).to.be.eq(3);
			expect(entity.properties.foo.name).to.be.eq('foo');
			expect(entity.properties.bar.name).to.be.eq('bar');
			expect(entity.properties.baz.name).to.be.eq('baz');
		});

		it('_createMethods', function() {
			this.entity.testMethod();
			expect(this.entity.azx).to.be.eq('test me');
		});
		
		it('loadOriginalData', function() {
			const data = {
				foo: 2,
				bar: 'two',
			};
			this.entity.loadOriginalData(data);
			expect(this.entity.isDirty).to.be.false;
			expect(this.entity.isPhantom).to.be.false;
			expect(this.entity.foo).to.be.eq(2);
			expect(this.entity.bar).to.be.eq('two');
		});

		it('reset', function() {
			const originalData = this.entity.getParsedValues();

			expect(this.entity.bar).to.be.eq('one');

			this.entity.setValue('bar', 'Test');
			expect(this.entity.bar).to.be.eq('Test');

			this.entity.reset();

			expect(this.entity.bar).to.be.eq('one');
			expect(this.entity.isDirty).to.be.false;
			expect(_.isEqual(this.entity.getParsedValues(), originalData)).to.be.true;

			this.entity.delete();
			expect(this.entity.isDeleted).to.be.true;

			this.entity.reset();
			expect(this.entity.isDeleted).to.be.false;
		});

		it('getMappedValue', function() {
			const getMappedValue = Entity.getMappedValue,
				root = { a: { b: { c: true } } },
				mapping = 'a.b.c';
			let result = getMappedValue(mapping, root);
			expect(result).to.be.true;

			result = getMappedValue('a.b', root);
			expect(_.isEqual(result, { c: true })).to.be.true;
		});

	});

	describe('getters', function() {

		it('proxy getter for getPropertySubmitValue works', function() {
			expect(this.entity.foo).to.be.eq(1);
			expect(this.entity.bar).to.be.eq('one');
		});

		it('getSchema', function() {
			const schema = this.entity.getSchema();
			expect(schema).to.be.eq(this.schema);
		});

		it('getProperty', function() {
			const property = this.entity.getProperty('foo');
			expect(property.name).to.be.eq('foo');
		});

		it('getPropertySubmitValue', function() {
			const result = this.entity.getPropertySubmitValue('foo');
			expect(result).to.be.eq(1);
		});

		it('getPropertyDisplayValue', function() {
			const result = this.entity.getPropertyDisplayValue('foo');
			expect(result).to.be.eq(1);
		});

		it('getSubmitValues & submitValues', function() {
			const result = this.entity.getSubmitValues(),
				expected = {
					foo: 1,
					bar: 'one',
					baz: true,
				};
			expect(_.isEqual(result, expected)).to.be.true;
			expect(_.isEqual(this.entity.submitValues, expected)).to.be.true;
		});

		it('getSubmitValuesMapped & submitValuesMapped', function() {
			const result = this.entity.getSubmitValuesMapped(),
				expected = {
					foo: 1,
					bar: 'one',
					'baz.test.val': true,
				};
			expect(_.isEqual(result, expected)).to.be.true;
			expect(_.isEqual(this.entity.submitValuesMapped, expected)).to.be.true;
		});

		it('getDisplayValues & displayValues', function() {
			const result = this.entity.getDisplayValues(),
				expected = {
					foo: 1,
					bar: 'one',
					baz: 'Yes',
				};
			expect(_.isEqual(result, expected)).to.be.true;
			expect(_.isEqual(this.entity.displayValues, expected)).to.be.true;
		});

		it('getRawValues & rawValues', function() {
			const result = this.entity.getRawValues(),
				expected = {
					foo: 1,
					bar: 'one',
					baz: true,
				};
			expect(_.isEqual(result, expected)).to.be.true;
			expect(_.isEqual(this.entity.rawValues, expected)).to.be.true;
		});

		it('getParsedRawValues & parsedRawValues', function() {
			const result = this.entity.getParsedRawValues(),
				expected = {
					foo: 1,
					bar: 'one',
					baz: true,
				};
			expect(_.isEqual(result, expected)).to.be.true;
			expect(_.isEqual(this.entity.parsedRawValues, expected)).to.be.true;
		});

		it('getParsedValues & parsedValues', function() {
			const result = this.entity.getParsedValues(),
				expected = {
					foo: 1,
					bar: 'one',
					baz: true,
				};
			expect(_.isEqual(result, expected)).to.be.true;
			expect(_.isEqual(this.entity.parsedValues, expected)).to.be.true;
		});

		it('_getReconstructedOriginalData', function() {
			let originalData = this.entity._originalData,
				reconstructed = this.entity._getReconstructedOriginalData();

			expect(_.isEqual(originalData, reconstructed)).to.be.true;
			

			// Change some values, save it, then check again
			this.entity.foo = 2;
			this.entity.baz = false;
			this.entity.markSaved();

			reconstructed = this.entity._getReconstructedOriginalData();
			const expected = {
				foo: 2,
				bar: 'one',
				baz: {
					test: {
						val: false,
					},
				},
			};

			expect(_.isEqual(expected, reconstructed)).to.be.true;
		});

		it('getReverseMappedRawValue', function() {
			const definition1 = {
					name: 'foo',
					mapping: 'a.b.c',
					type: 'int',
				},
				Property1 = PropertyTypes[definition1.type];
			const property1 = new Property1(definition1, 'fakeEntity');

			property1.setValue('47');
			
			const reverseMapped1 = Entity.getReverseMappedRawValue(property1),
				expected1 = { a: { b: { c: '47' }, }, };
			
			expect(_.isEqual(reverseMapped1, expected1)).to.be.true;


			// Now, with no mapping
			const definition2 = {
					name: 'foo',
					type: 'int',
				},
				Property2 = PropertyTypes[definition2.type];
			const property2 = new Property2(definition2, 'fakeEntity');

			property2.setValue('47');
			
			const reverseMapped2 = Entity.getReverseMappedRawValue(property2),
				expected2 = { foo: '47' };
			
			expect(_.isEqual(reverseMapped2, expected2)).to.be.true;
		});

		it('getReverseMappedRawValues (check deep matches)', function() {
			const schema = new Schema({
					name: 'baz',
					model: {
						idProperty: 'foo',
						displayProperty: 'bar',
						properties: [
							{ name: 'foo', type: 'int' },
							{ name: 'bar' },
							{ name: 'baz', mapping: 'baz.test.val', type: 'bool', defaultValue: null, },
							{ name: 'baz2', mapping: 'baz.test2', type: 'bool', defaultValue: null, },
						],
					},
				}),
				data = {
					foo: 1,
					bar: 'one',
					baz: {
						test: {
							val: true,
						},
						test2: false,
					},
				},
				entity = new Entity(schema, data);
			entity.initialize();

			const result = entity.getReverseMappedRawValues();
			expect(_.isEqual(result, data)).to.be.true;
		});

		it('build a new entity from an existing one using getDataForNewEntity', function() {
			const entity = new Entity(this.schema, this.entity.getDataForNewEntity());
			entity.initialize();

			expect(_.isEqual(entity.submitValues, this.entity.submitValues)).to.be.true;
		});

		it('getChanged', function() {
			this.entity.foo = 2;
			const result = this.entity.getChanged(),
				expected = ['foo'];
			expect(_.isEqual(result, expected)).to.be.true;
		});

		it('getChangedValues', function() {
			this.entity.foo = 2;
			const result = this.entity.getChangedValues(),
				expected = {
					foo: {
						original: 1,
						current: 2,
					},
				};
			expect(_.isEqual(result, expected)).to.be.true;
		});

		it('data', function() {
			const result = this.entity.data,
				expected = {
					foo: 1,
					bar: 'one',
					baz: true,
				};
			expect(_.isEqual(result, expected)).to.be.true;
		});

		it('getPropertiesBy', function() {
			const properties = this.entity.getPropertiesBy((property) => {
					return property.name === 'foo';
				});
			expect(properties[0].name).to.be.eq('foo');
		});

		it('getIdProperty', function() {
			const property = this.entity.getIdProperty();
			expect(property.name).to.be.eq('foo');
		});

		it('getId', function() {
			const result = this.entity.getId();
			expect(result).to.be.eq(1);
		});

		it('id', function() {
			const result = this.entity.id;
			expect(result).to.be.eq(1);
		});

		it('id - after destroyed', function() {
			const entity = new Entity(this.schema, this.data);
			entity.initialize();
			const id = entity.id;
			entity.destroy();
			expect(_.isEqual(entity.id, id)).to.be.true;
		});

		it('getDisplayProperty', function() {
			const property = this.entity.getDisplayProperty();
			expect(property.name).to.be.eq('bar');
		});

		it('getDisplayValue', function() {
			const result = this.entity.getDisplayValue();
			expect(result).to.be.eq('one');
		});

		it('displayValue', function() {
			const result = this.entity.displayValue;
			expect(result).to.be.eq('one');
		});

		it('isPhantom', function() {
			expect(this.entity.isPhantom).to.be.false;
			
			const entity = new Entity(this.schema, {});
			entity.initialize();
			expect(entity.isPhantom).to.be.true;

			entity.createTempId();
			expect(entity.isPhantom).to.be.true;
			
			entity.markSaved();
			expect(entity.isPhantom).to.be.false;
		});

		it('isDirty', function() {
			expect(this.entity.isDirty).to.be.false;

			this.entity.setValue('bar', 'Test');
			expect(this.entity.isDirty).to.be.true;

			this.entity.reset();
			expect(this.entity.isDirty).to.be.false;

			this.entity.setValues({
				foo: 50,
				bar: 'Test13',
			});
			expect(this.entity.isDirty).to.be.true;
		});

		it('getOriginalData', function() {
			const result = this.entity.getOriginalData();
			expect(_.isEqual(result, this.data)).to.be.true;
		});

		it('hash', function() {
			expect(this.entity.hash).to.be.eq(5365087438356619);

			// change a property & check again
			this.entity.foo = 3;
			expect(this.entity.hash).to.be.eq(358445507972157);
		});

	});

	describe('setters', function() {

		it('proxy setter for setValue works', function() {
			let original = this.entity.foo;
			this.entity.foo = 2;
			expect(this.entity.foo).to.not.eq(original);
	
			original = this.entity.bar;
			this.entity.bar = 'Test';
			expect(this.entity.bar).to.not.eq(original);
		});

		it('setValue', function() {
			expect(this.entity.bar).to.be.eq('one');
			expect(this.entity.isDirty).to.be.false;
	
			this.entity.setValue('bar', 'Test');
			
			expect(this.entity.bar).to.be.eq('Test');
			expect(this.entity.isDirty).to.be.true;
		});

		it('setValues', function() {
			expect(this.entity.foo).to.be.eq(1);
			expect(this.entity.bar).to.be.eq('one');
			expect(this.entity.baz).to.be.eq(true);
			expect(this.entity.isDirty).to.be.false;
	
			this.entity.setValues({
				foo: 2,
				bar: 'two',
				baz: false,
			});
			
			expect(this.entity.foo).to.be.eq(2);
			expect(this.entity.bar).to.be.eq('two');
			expect(this.entity.baz).to.be.eq(false);
			expect(this.entity.isDirty).to.be.true;
		});

		it('setRawValues', function() {
			expect(this.entity.foo).to.be.eq(1);
			expect(this.entity.bar).to.be.eq('one');
			expect(this.entity.baz).to.be.eq(true);
			expect(this.entity.isDirty).to.be.false;
	
			this.entity.setRawValues({
				foo: 2,
				bar: 'two',
				baz: {
					test: {
						val: false,
					},
				},
			});
			
			expect(this.entity.foo).to.be.eq(2);
			expect(this.entity.bar).to.be.eq('two');
			expect(this.entity.baz).to.be.eq(false);
			expect(this.entity.isDirty).to.be.true;
		});

		it('setId', function() {
			expect(this.entity.foo).to.be.eq(1);
			expect(this.entity.isTempId).to.be.false;
			
			this.entity.setId(2);
			expect(this.entity.foo).to.be.eq(2);
			expect(this.entity.isTempId).to.be.false;
		});

		it('_recalculateDependentProperties', function() {
			const schema = new Schema({
					name: 'baz',
					model: {
						idProperty: 'foo',
						displayProperty: 'bar',
						properties: [
							{ name: 'foo', type: 'int' },
							{ name: 'bar' },
							{ name: 'virtual', depends: 'bar', parse: function() {
								const parsedValues = this.getEntity().getParsedValues();
								return parsedValues.bar + ' for you';
							} },
						],
					},
				}),
				data = {
					foo: 1,
					bar: 'one',
				},
				entity = new Entity(schema, data);
			entity.initialize();

			expect(entity.virtual).to.be.eq('one for you');

			entity.bar = 'two';
			expect(entity.virtual).to.be.eq('two for you');
		});

		it('markSaved', function() {
			const entity = new Entity(this.schema);
			entity.initialize();
			const id = entity.id;

			expect(entity.isPersisted).to.be.false;
			expect(_.isEqual(entity.getOriginalData(), {})).to.be.true;
			
			entity.bar = 'Test';
			entity.markSaved();
			expect(entity.isTempId).to.be.false;
			expect(entity.isStaged).to.be.false;

			expect(entity.isPersisted).to.be.true;
			const expected = {
				foo: id,
				bar: 'Test',
				baz: {
					test: {
						val: null,
					},
				},
			};
			expect(_.isEqual(entity.getOriginalData(), expected)).to.be.true;
		});

		it('markDeleted', function() {
			this.entity.markDeleted();
			expect(this.entity.isDeleted).to.be.true;

			this.entity.markDeleted(false);
			expect(this.entity.isDeleted).to.be.false;
		});

		it('delete', function() {
			this.entity.delete();
			expect(this.entity.isDeleted).to.be.true;
		});

		it('undelete', function() {
			this.entity.delete();
			this.entity.undelete();
			expect(this.entity.isDeleted).to.be.false;
		});

		it('markStaged, stage', function() {
			expect(this.entity.isStaged).to.be.false;

			this.entity.stage();
			expect(this.entity.isStaged).to.be.true;

			this.entity.markStaged(false);
			expect(this.entity.isStaged).to.be.false;
		});
	
		it('setValue changed lastModified', function() {
			let earlyLastModified,
				lateLastModified;

			earlyLastModified = this.entity.lastModified;
			this.entity.setValue('foo', '125');
			lateLastModified = this.entity.lastModified;
			expect(earlyLastModified < lateLastModified).to.be.true;

			earlyLastModified = this.entity.lastModified;
			this.entity.foo = '126';
			lateLastModified = this.entity.lastModified;
			expect(earlyLastModified < lateLastModified).to.be.true;
		});
	
		it('freeze', function() {
			this.entity.freeze();
			expect(this.entity.isFrozen).to.be.true;

			this.entity.destroy();
			expect(this.entity.isDestroyed).to.be.false;

			let isError = false;
			try {
				this.entity.foo = 2;
			} catch(e) {
				isError = true;
			}
			expect(isError).to.be.true;
		});
	});

	describe('events', function() {

		it('change', function() {
			let didFire = false,
				matches = false;
			this.entity.on('change', (entity) => {
				didFire = true;
				matches = (this.entity === entity);
			});
			this.entity.setValue('bar', 'Test');
			expect(didFire).to.be.true;
			expect(matches).to.be.true;
		});

		it('reset', function() {
			let didFire = false;
			this.entity.on('reset', () => {
				didFire = true;
			});
			this.entity.setValue('bar', 'Test');
			this.entity.reset();
			expect(didFire).to.be.true;
		});

		it('save', function() {
			let didFire = false;
			this.entity.on('save', () => {
				didFire = true;
			});
			this.entity.setValue('bar', 'Test');
			this.entity.save();
			expect(didFire).to.be.true;
		});

		it('reload', function() {
			let didFire = false;
			this.entity.on('reload', () => {
				didFire = true;
			});
			this.entity.reload();
			expect(didFire).to.be.true;
		});

		it('delete', function() {
			let didFire = false;
			this.entity.on('delete', () => {
				didFire = true;
			});
			this.entity.delete();
			expect(didFire).to.be.true;
		});

		it('undelete', function() {
			this.entity.delete();
			expect(this.entity.isDeleted).to.be.true;

			let didFire = false;
			this.entity.on('undelete', () => {
				didFire = true;
			});
			this.entity.undelete();

			expect(didFire).to.be.true;
			expect(this.entity.isDeleted).to.be.false;
		});

		it('destroy', function() {
			let didFire = false;
			this.entity.on('destroy', () => {
				didFire = true;
			});
			this.entity.destroy();
			expect(didFire).to.be.true;
		});

		it('property change', function() {
			let didFire = false;
			this.entity.on('change', () => {
				didFire = true;
			});
			const property = this.entity.getDisplayProperty();
			property.setValue('Test');
			expect(didFire).to.be.true;
		});
	});

	describe('validators', function() {

		it('Yup integration', function() {
			(async () => {

				// Recreate everything from beforeEach()
				const schema = new Schema({
						name: 'baz',
						model: {
							idProperty: 'foo',
							displayProperty: 'bar',
							properties: [
								{ name: 'foo', type: 'int' },
								{ name: 'bar' },
								{ name: 'baz', mapping: 'baz.test.val', type: 'bool', defaultValue: null, },
							],
							validator: yup.object({
								foo: yup.number()
										.integer(),
								bar: yup.string()
										.required(),
								baz: yup.mixed(),
							}),
						},
						entity: {
							methods: {
								testMethod: function() {
									this.azx = 'test me';
								},
							},
							statics: {
								azx: null,
							},
						},
					}),
					data = {
						foo: 1,
						bar: 'one',
						baz: {
							test: {
								val: true,
							},
						},
					},
					entity = new Entity(schema, data);
				entity.initialize();
				// END recreate

				let didFire = false;
				entity.on('changeValidity', (entity) => {
					didFire = true;
				});

				// Initial condition
				expect(entity.isValid).to.be.null;
				await entity.validate();
				expect(entity.isValid).to.be.true;
				expect(didFire).to.be.true;

				// Set a property to be invalid
				entity.bar = null;
				await entity.validate();
				expect(entity.isValid).to.be.false;
				expect(entity.validationError).to.match(/bar must be a `string`/);

				// Restore validity
				entity.bar = 'test';
				await entity.validate();
				expect(entity.isValid).to.be.true;
				expect(!entity.validationError).to.be.true;
				
			})();
		});

		it('Joi integration', function() {
			(async () => {

				// Recreate everything from beforeEach()
				const schema = new Schema({
						name: 'baz',
						model: {
							idProperty: 'foo',
							displayProperty: 'bar',
							properties: [
								{ name: 'foo', type: 'int' },
								{ name: 'bar' },
								{ name: 'baz', mapping: 'baz.test.val', type: 'bool', defaultValue: null, },
							],
							validator: Joi.object({
								foo: Joi.number()
										.integer(),
								bar: Joi.string()
										.required(),
								baz: Joi.any(),
							}),
						},
						entity: {
							methods: {
								testMethod: function() {
									this.azx = 'test me';
								},
							},
							statics: {
								azx: null,
							},
						},
					}),
					data = {
						foo: 1,
						bar: 'one',
						baz: {
							test: {
								val: true,
							},
						},
					},
					entity = new Entity(schema, data);
				entity.initialize();
				// END recreate

				let didFire = false;
				entity.on('changeValidity', (entity) => {
					didFire = true;
				});

				// Initial condition
				expect(entity.isValid).to.be.null;
				await entity.validate();
				expect(entity.isValid).to.be.true;
				expect(didFire).to.be.true;

				// Set a property to be invalid
				entity.bar = null;
				await entity.validate();
				expect(entity.isValid).to.be.false;
				expect(entity.validationError).to.match(/"bar" must be a string/);

				// Restore validity
				entity.bar = 'test';
				await entity.validate();
				expect(entity.isValid).to.be.true;
				expect(!entity.validationError).to.be.true;
				
			})();
		});
	});

	describe('tree', function() {

		// Needed for all tree tests...
		const
			schema = new Schema({
				name: 'nodes',
				model: {
					idProperty: 'id',
					displayProperty: 'display',
					parentIdProperty: 'parent_id',
					depthProperty: 'depth',
					hasChildrenProperty: 'hasChildren',
					isTree: true,
					isClosureTable: true,
					properties: [
						{ name: 'id', type: 'int' },
						{ name: 'display' },
						{ name: 'parent_id', type: 'int' },
						{ name: 'depth', type: 'int' },
						{ name: 'hasChildren', type: 'bool' },
					],
				},
			}),
			data = {
				id: 2,
				display: 'Child 1',
				parent_id: 1,
				depth: 1,
				hasChildren: true,
			},
			creatEntity = async () => {
				const entity = new Entity(schema, data);
				entity.initialize();
				return entity;
			},
			destoryEntity = (entity) => {
				entity.destroy();
			};

		it('magic properties', function() {
			(async () => {
				const entity = await creatEntity();

				expect(entity.parentId).to.be.eq(1);
				expect(entity.depth).to.be.eq(1);
				expect(entity.hasChildren).to.be.true;
				
				destoryEntity(entity);
			})();
		});

		it('parents/children', function() {
			(async () => {
				const entity = await creatEntity();
				
				const parent = this.entity;
				entity.parent = parent;
				expect(entity.parent).to.be.eq(parent);
				
				const children = [this.entity];
				entity.children = children;
				expect(entity.children).to.be.eq(children);

				destoryEntity(entity);
			})();
		});

		it('ensureTree', function() {
			(async () => {
				const entity = await creatEntity();
				
				expect(entity.ensureTree()).to.be.true;

				entity.isTree = false;
				expect(entity.ensureTree()).to.be.false;

				destoryEntity(entity);
			})();
		});

	});

});