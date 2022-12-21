import PropertyTypes from '../../../src/Property/index.js';

describe('CurrencyProperty', function() {
	
	beforeEach(function() {
		const definition = {
				type: 'currency',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	describe('general', function() {

		it('className', function() {
			const className = this.property.getClassName();
			expect(className).to.be.eq('Currency');
		});

		it('default value', function() {
			expect(this.property.submitValue).to.be.eq('0.00');

			const rawValue = this.property.getDefaultValue();
			this.property.setValue(rawValue);
			expect(this.property.submitValue).to.be.eq('0.00');
		});

		it('isZero', function() {
			this.property.setValue('0.00');
			expect(this.property.isZero).to.be.true;

			this.property.setValue('0.01');
			expect(this.property.isZero).to.be.false;

			this.property.setValue('-0.01');
			expect(this.property.isZero).to.be.false;

			this.property.setValue(null);
			expect(this.property.isZero).to.be.false;

			this.property.setValue();
			expect(this.property.isZero).to.be.false;
		});

		it('hasValue', function() {
			this.property.setValue('0.00');
			expect(this.property.hasValue).to.be.true;

			this.property.setValue('0.01');
			expect(this.property.hasValue).to.be.true;

			this.property.setValue('-0.01');
			expect(this.property.hasValue).to.be.true;

			this.property.setValue(null);
			expect(this.property.hasValue).to.be.false;

			this.property.setValue();
			expect(this.property.hasValue).to.be.false;
		});
		
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
			const parsed = this.property.parse('This is $1234.56 dollars.');
			expect(parsed).to.be.eq(1234.56);
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

		it('omitZeros', function() {
			this.property.setValue('1234.56');
			expect(this.property.displayValue).to.be.eq('$1,234.56');

			this.property.setValue('1234.50');
			expect(this.property.displayValue).to.be.eq('$1,234.50');

			this.property.setValue('1234.00');
			expect(this.property.displayValue).to.be.eq('$1,234.00');

			this.property.omitZeros = true;

			this.property.setValue('1234.56');
			expect(this.property.displayValue).to.be.eq('$1,234.56');

			this.property.setValue('1234.50');
			expect(this.property.displayValue).to.be.eq('$1,234.50');

			this.property.setValue('1234.00');
			expect(this.property.displayValue).to.be.eq('$1,234');
		});

		it('submitValue', function() {
			this.property.setValue(123.156);
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq('123.16');
		});

	});

});