import PropertyTypes from '../../../src/Property/index.js';

describe('DateTimeProperty', function() {
	
	beforeEach(function() {
		const definition = {
				type: 'datetime',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('DateTime');
	});

	describe('parse', function() {

		it('parse YYYY-MM-DD', function() {
			const parsed = this.property.parse('2020-01-01 00:00:00');
			expect(parsed.isValid()).to.be.true;
			expect(parsed.format('YYYY-MM-DD HH:mm:ss')).to.be.eq('2020-01-01 00:00:00');
		});

	});

	describe('propertly displays formatted values', function() {

		it('displayValue', function() {
			this.property.setValue('2020-01-01');
			const formatted = this.property.displayValue;
			expect(formatted).to.be.eq('Jan 01, 2020 - 00:00:00');
		});

		it('submitValue', function() {
			this.property.setValue('2020-01-01');
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq('2020-01-01 00:00:00');
		});

	});

	describe('comparisons', function() {

		it('today', function() {
			this.property.setValue('2020-01-01 20:00:00');
			const moment = this.property.getMoment(),
				isSame = moment.isSame(new Date(), 'day');
			expect(isSame).to.be.false;
		});

	});

	
	

});