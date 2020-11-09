import PropertyTypes from '../../../src/Property';

describe('PercentProperty', function() {
	
	beforeEach(function() {
		const definition = {
				precision: 3,
				type: 'percent',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Percent');
	});

	it('format', function() {
		this.property.setValue('0.12325');
		expect(this.property.displayValue).to.be.eq('12.325%');
	});

});