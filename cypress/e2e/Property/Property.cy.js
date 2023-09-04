import PropertyTypes from '../../../src/Property/index.js';
import Entity from '../../../src/Entity/Entity.js';
import Schema from '../../../src/Schema/index.js';

describe('Property', function() {
	beforeEach(function() {
		const definition = {
				name: 'foo',
				allowNull: false,
				mapping: 'id',
				type: 'int',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition, 'fakeEntity');
	});

	describe('constructor', function() {

		it('creates a Property', function() {
			expect(this.property.name).to.be.eq('foo');
			expect(this.property.getClassName()).to.be.eq('Integer');
		});

	});

	describe('getters', function() {

		it('getRawValue', function() {
			this.property.setValue('12');
			const value = this.property.getRawValue();
			expect(value).to.be.eq('12');
		});

		it('getParsedValue & parsedValue', function() {
			this.property.setValue('12');
			const value = this.property.getParsedValue();
			expect(value).to.be.eq(12);
			expect(value).to.be.eq(this.property.parsedValue);
		});
	
		it('getSubmitValue & parsedValue', function() {
			this.property.setValue('12');
			let value = this.property.getSubmitValue();
			expect(value).to.be.eq(12);
			expect(value).to.be.eq(this.property.submitValue);
	
			this.property.setSubmitAsString(true);
			value = this.property.getSubmitValue();
			expect(value).to.be.eq('12');
			expect(value).to.be.eq(this.property.submitValue);
		});
	
		it('getDisplayValue & displayValue', function() {
			this.property.setValue('12');
			const value = this.property.getDisplayValue();
			expect(value).to.be.eq(12);
			expect(value).to.be.eq(this.property.displayValue);
		});
	
		it('hasMapping', function() {
			const bool = this.property.hasMapping;
			expect(bool).to.be.true;
		});
	
		it('hasDepends', function() {
			const bool = this.property.hasDepends;
			expect(bool).to.be.false;
		});
	
		it('isIdProperty', function() {
			expect(this.property.isIdProperty).to.be.false;
	
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
				entity = new Entity(schema);
				
			entity.initialize();
			const property = entity.getProperty('foo');
			expect(property.isIdProperty).to.be.true;
		});
	
		it('isDisplayProperty', function() {
			expect(this.property.isDisplayProperty).to.be.false;
	
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
				entity = new Entity(schema);
				
			entity.initialize();
			const property = entity.getProperty('bar');
			expect(property.isDisplayProperty).to.be.true;
		});
	
		it('getMapping', function() {
			expect(this.property.getMapping()).to.be.eq('id');
		});
	
		it('getMapping', function() {
			expect(this.property.getMapping()).to.be.eq('id');
		});
	
		it('isTempId', function() {
			const definition = {
					type: 'int',
					isTempId: true,
				},
				Property = PropertyTypes[definition.type];
			const property = new Property(definition);
			expect(property.isTempId).to.be.true;
		});

		it('getModel', function() {

			// fails when name is incorrect
			let error = null;
			try {
				this.property.modelName;
			} catch(err) {
				error = err.message;
			}
			expect(error).to.eq('this.name is not in the correct format for modelName.');
	
			const
				schema = new Schema({
					name: 'foo',
					model: {
						idProperty: 'model__field',
						displayProperty: 'model__field',
						properties: [
							{ name: 'model__field', },
						],
					},
				}),
				entity = new Entity(schema);
				
			entity.initialize();
			const property = entity.getProperty('model__field');

			expect(property.modelName).to.be.eq('model');
		});
	
		it('OneBuild properties', function() {

			expect(this.property.isVirtual).to.be.false;
			expect(this.property.title).to.be.null;
			expect(this.property.tooltip).to.be.null;
			expect(this.property.fieldGroup).to.be.null;
			expect(this.property.isForeignModel).to.be.false;
			expect(this.property.filterType).to.be.null;
			expect(this.property.isFilteringDisabled).to.be.false;
			expect(this.property.editorType).to.be.null;
			expect(this.property.isEditingDisabled).to.be.false;
	
			const
				filterType = {
					type: 'Combo',
					loadAfterRender: false,
				},
				editorType = {
					type: 'Input',
				},
				schema = new Schema({
					name: 'foo',
					model: {
						idProperty: 'model__field',
						displayProperty: 'model__field',
						properties: [
							{
								name: 'model__field',
								isVirtual: true,
								title: 'title',
								tooltip: 'tooltip',
								fieldGroup: 'fieldGroup',
								isForeignModel: true,
								filterType,
								isFilteringDisabled: true,
								editorType,
								isEditingDisabled: true,
							},
						],
					},
				}),
				entity = new Entity(schema);
				
			entity.initialize();
			const property = entity.getProperty('model__field');
			
			expect(property.isVirtual).to.be.true;
			expect(property.title).to.be.eq('title');
			expect(property.tooltip).to.be.eq('tooltip');
			expect(property.fieldGroup).to.be.eq('fieldGroup');
			expect(property.isForeignModel).to.be.true;
			expect(property.filterType).to.be.eql(filterType);
			expect(property.isFilteringDisabled).to.be.true;
			expect(property.editorType).to.be.eql(editorType);
			expect(property.isEditingDisabled).to.be.true;
		});


	});

	describe('setters', function() {

		it('setValue', function() {
			const beforeValue = this.property.getParsedValue(),
				isChanged = this.property.setValue('125'),
				afterValue = this.property.getParsedValue();
	
			expect(beforeValue).to.be.not.eq(afterValue);
			expect(isChanged).to.be.true;
			expect(afterValue).to.be.eq(125);
		});
	
		it('setValue disallows null', function() {
			let error = null;
			try {
				this.property.setValue();
			} catch(err) {
				error = err.message;
			}
			expect(error).to.eq('Value for foo cannot be null.');
		});

	});

	describe('parse', function() {
	
		it('parse', function() {
			const parsed = this.property.parse('12');
			expect(parsed).to.be.eq(12);
		});

		it('custom', function() {
			const definition = {
					name: 'foo',
					allowNull: false,
					type: 'int',
					parse: function() {
						return 'bar';
					}
				},
				Property = PropertyTypes[definition.type],
				property = new Property(definition);

			const parsed = property.parse('12');
			expect(parsed).to.be.eq('bar');
		});

	});

	describe('events', function() {

		it('change', function() {
			let didFireChange = false;
			this.property.on('change', () => {
				didFireChange = true;
			});
			this.property.setValue(52);
			expect(didFireChange).to.be.true;
		});

		it('destroy', function() {
			let didFireDestroy = false;
			this.property.on('destroy', () => {
				didFireDestroy = true;
			});
			this.property.destroy();
			expect(didFireDestroy).to.be.true;
		});

	});

	describe('utilities', function() {

		it('setSubmitAsString', function() {
			this.property.setSubmitAsString(false);
			expect(this.property.submitAsString).to.be.false;

			this.property.setSubmitAsString(true);
			expect(this.property.submitAsString).to.be.true;
		});
	
		it('getEntity', function() {
			const entity = this.property.getEntity();
			expect(entity).to.be.eq('fakeEntity');
		});
	
		it('getClassName', function() {
			const className = this.property.getClassName();
			expect(className).to.be.eq('Integer');
		});
	
		it('destroy', function() {
			this.property.destroy();
			expect(this.property.isDestroyed).to.be.true;
		});
	
		it('toString', function() {
			this.property.setValue(125);
			const str = this.property.toString();
			expect(str).to.be.eq('Property {foo} - 125');
		});

	});

});