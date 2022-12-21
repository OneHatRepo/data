import PropertyTypes from '../../../src/Property/index.js';

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

	it('omitZeros', function() {
		this.property.setValue('1234.56');
		expect(this.property.displayValue).to.be.eq('1234.560%');

		this.property.setValue('1234.50');
		expect(this.property.displayValue).to.be.eq('1234.500%');

		this.property.setValue('1234.00');
		expect(this.property.displayValue).to.be.eq('1234.000%');

		this.property.omitZeros = true;

		this.property.setValue('1234.56');
		expect(this.property.displayValue).to.be.eq('1234.56%');

		this.property.setValue('1234.50');
		expect(this.property.displayValue).to.be.eq('1234.5%');

		this.property.setValue('1234.00');
		expect(this.property.displayValue).to.be.eq('1234%');
	});

});