import PropertyTypes from '../../../src/Property';

describe('PercentProperty', function() {
	
	beforeEach(function() {
		const definition = {
				precision: 3,
				type: 'percentint',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('PercentInt');
	});

	it('format', function() {
		this.property.setValue('12.325');
		expect(this.property.displayValue).to.be.eq('12.325%');
	});

});