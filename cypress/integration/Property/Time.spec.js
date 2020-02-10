import PropertyTypes from '../../../src/Property';

describe('TimeProperty', function() {
	
	beforeEach(function() {
		const definition = {
				type: 'time',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Time');
	});

	describe('parse', function() {

		it('parse HH:mm:ss', function() {
			const parsed = this.property.parse('12:34:56');
			expect(parsed.isValid()).to.be.true;
			expect(parsed.format('HH:mm:ss')).to.be.eq('12:34:56');
		});

	});

	describe('propertly displays formatted values', function() {

		it('displayValue', function() {
			this.property.setValue('12:34:56');
			const formatted = this.property.displayValue;
			expect(formatted).to.be.eq('12:34:56');
		});

		it('submitValue', function() {
			this.property.setValue('12:34:56');
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq('12:34:56');
		});

	});

});