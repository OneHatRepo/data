import PropertyTypes from '../../../src/Property/index.js';

describe('FloatProperty', function() {
	
	beforeEach(function() {
		const definition = {
				precision: 2,
				type: 'float',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	describe('general', function() {

		it('className', function() {
			const className = this.property.getClassName();
			expect(className).to.be.eq('Float');
		});

		// it('default value', function() {
		// 	const property = this.property,
		// 		rawValue = property.getDefaultValue();
		// 	property.pauseEvents();
		// 	property.setValue(rawValue);
		// 	property.resumeEvents();
		// 	expect(this.property.submitValue).to.be.eq('0.00');
		// });
		
	});

	describe('parse', function() {

		it('numeric int string', function() {
			const parsed = this.property.parse('12');
			expect(parsed).to.be.eq('12.00');
		});

		it('numeric float string', function() {
			const parsed = this.property.parse('12.0');
			expect(parsed).to.be.eq('12.00');
		});
	
		it('non-numeric string', function() {
			const parsed = this.property.parse('nothing');
			expect(parsed).to.be.eq('0.00');
		});

		it('integer', function() {
			const parsed = this.property.parse(12);
			expect(parsed).to.be.eq('12.00');
		});

		it('float', function() {
			const parsed = this.property.parse(12.0);
			expect(parsed).to.be.eq('12.00');
		});

		it('null', function() {
			const parsed = this.property.parse();
			expect(parsed).to.be.null;
		});
	
		it('date', function() {
			const parsed = this.property.parse(new Date());
			expect(parsed).to.be.eq('0.00');
		});

	});


	it('setPrecision', function() {
		this.property.setValue('12');
		expect(this.property.displayValue).to.be.eq('12.00');

		this.property.setPrecision(null);
		expect(this.property.displayValue).to.be.eq(12);
		
		this.property.setPrecision(0);
		expect(this.property.displayValue).to.be.eq('12');
		this.property.setPrecision(4);
		expect(this.property.displayValue).to.be.eq('12.0000');
	});

});