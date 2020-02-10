import PropertyTypes from '../../../src/Property';

describe('CurrencyProperty', function() {
	
	beforeEach(function() {
		const definition = {
				type: 'currency',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Currency');
	});

	describe('parse', function() {

		it('dollar amount', function() {
			const parsed = this.property.parse('$1,234.56');
			expect(parsed).to.be.eq(1234.56);
		});

		it('number', function() {
			const parsed = this.property.parse(123.45);
			expect(parsed).to.be.eq(123.45);
		});

		it('numeric string', function() {
			const parsed = this.property.parse('This is 1234 dollars.');
			expect(parsed).to.be.eq(1234);
		});

		it('non-numeric string', function() {
			const parsed = this.property.parse('This is no dollars.');
			expect(parsed).to.be.eq(0);
		});

	});

	describe('propertly displays formatted values', function() {

		it('displayValue', function() {
			this.property.setValue('1234.56');
			const formatted = this.property.displayValue;
			expect(formatted).to.be.eq('$1,234.56');
		});

		it('submitValue', function() {
			this.property.setValue(123.156);
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq('123.16');
		});

	});

});