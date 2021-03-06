import Entity from '../../src/Entity';
import Schema from '../../src/Schema';
import PropertyTypes from '../../src/Property';


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
					{ name: 'baz', mapping: 'baz.test.val', type: 'bool' },
				],
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
		this.entity.destroy();
		this.schema.destroy();
	});

	describe('constructor', function() {

		it('creates an entity', function() {
			expect(this.entity instanceof Entity).to.be.true;
			expect(this.entity.getSchema()).to.be.eq(this.schema);
			expect(this.entity.id).to.be.eq(1);
		});

		it('createId, isTempId', function() {
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

			entity.createId();
			expect(entity.id).to.be.not.null;
			expect(Entity.isTempId(entity.id)).to.be.true;



			const schema2 = new Schema({
					name: 'baz',
					model: {
						idProperty: 'foo',
						displayProperty: 'bar',
						properties: [
							{ name: 'foo', type: 'uuid' }, // MOD
							{ name: 'bar' },
						],
					},
				}),
				entity2 = new Entity(schema2, data);
			
			entity2.initialize();
			expect(entity2.id).to.be.null;

			entity2.createId();
			expect(entity2.id).to.be.not.null;
			const idProperty = entity2.getIdProperty();
			expect(Entity.isTempId(entity2.id)).to.be.false;
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
			const definition = {
				name: 'foo',
				mapping: 'a.b.c',
				type: 'int',
			},
			Property = PropertyTypes[definition.type];
			const property = new Property(definition, 'fakeEntity');

			property.setValue('47');
			
			const reverseMapped = Entity.getReverseMappedRawValue(property),
				expected = { a: { b: { c: '47' }, }, };
			
			expect(_.isEqual(reverseMapped, expected)).to.be.true;
		});

		it('getChanged', function() {
			this.entity.foo = 2;
			const result = this.entity.getChanged(),
				expected = ['foo'];
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
			expect(this.entity.isDirty).to.be.false;
	
			this.entity.setValues({
				foo: 2,
				bar: 'two',
			});
			
			expect(this.entity.foo).to.be.eq(2);
			expect(this.entity.bar).to.be.eq('two');
			expect(this.entity.isDirty).to.be.true;
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
		});

		it('delete', function() {
			this.entity.delete();
			expect(this.entity.isDeleted).to.be.true;
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

});