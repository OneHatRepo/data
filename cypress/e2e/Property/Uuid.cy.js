import PropertyTypes from '../../../src/Property/index.js';

describe('UuidProperty', function() {

	beforeEach(function() {
		const definition = {
				type: 'uuid',
				defaultValue: 'generate',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition, 'Fake Entity');
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Uuid');
	});

	describe('getters', function() {

		it('getRawValue', function() {
			this.property.setValue('12');
			const value = this.property.getRawValue();
			expect(value).to.be.eq('12');
		});
	
		it('generate uuid', function() {
			const uuid = this.property.getDefaultValue(),
				isValid = this.property.isValid(uuid);
			expect(isValid).to.be.true;
		});

	});

	describe('custom functions', function() {

		it('newId && isValid', function() {
			const uuid = this.property.newId(),
				isValid = this.property.isValid(uuid);
			expect(isValid).to.be.true;
		});

		it('isEmpty', function() {
			this.property.setValue('00000000-0000-0000-0000-000000000000');
			const result = this.property.isEmpty();
			expect(result).to.be.true;
		});

	});

});