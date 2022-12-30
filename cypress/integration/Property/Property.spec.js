import Joi from 'Joi';
import PropertyTypes from '../../../src/Property/index.js';
import Entity from '../../../src/Entity.js';
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

	describe('validators', function() {

		it('whole validation process', function() {
			let didFire = false;
			this.property.on('changeValidity', (entity) => {
				didFire = true;
			});

			// Initial condition
			expect(this.property.isValid).to.be.null;

			// Add validators
			const schema = new Schema({
					name: 'baz',
					model: {
						idProperty: 'foo',
						displayProperty: 'bar',
						properties: [
							{ name: 'foo', type: 'int' },
							{ name: 'bar' },
						],
						validator: Joi.object({
							foo: Joi.number()
									.integer(),
						}),
					},
				}),
				entity = new Entity(schema);
			entity.initialize();
			const property = entity.getProperty('foo');
			property.setValue(2);

			const result = property.validate();
			expect(result).to.be.true;

			// Set a property to be invalid
			property.setValue(null);
			expect(property.isValid).to.be.false;
			expect(property.validationError).to.match(/"foo" must be a number/);

			// Restore validity
			property.setValue(2);
			expect(property.isValid).to.be.true;
			expect(property.validationError).to.be.null;
		});
	});

});