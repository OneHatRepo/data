import PropertyTypes from '../../../src/Property/index.js';

describe('BooleanProperty', function() {
	
	beforeEach(function() {
		const definition = {
				type: 'bool',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	describe('general', function() {

		it('className', function() {
			const className = this.property.getClassName();
			expect(className).to.be.eq('Boolean');
		});

		it('default value', function() {
			const property = this.property,
				rawValue = property.getDefaultValue();
			property.pauseEvents();
			property.setValue(rawValue);
			property.resumeEvents();
			expect(this.property.submitValue).to.be.eq(false);
		});
		
	});

	describe('parse', function() {

		it('null', function() {
			const parsed = this.property.parse();
			expect(parsed).to.be.null;
		});

		it('undefined', function() {
			const parsed = this.property.parse(void 0);
			expect(parsed).to.be.null;
		});

		it('true', function() {
			let parsed = this.property.parse('T');
			expect(parsed).to.be.true;

			parsed = this.property.parse('True');
			expect(parsed).to.be.true;

			parsed = this.property.parse('true');
			expect(parsed).to.be.true;

			parsed = this.property.parse('Y');
			expect(parsed).to.be.true;

			parsed = this.property.parse('Yes');
			expect(parsed).to.be.true;

			parsed = this.property.parse(1);
			expect(parsed).to.be.true;

			parsed = this.property.parse(1.0);
			expect(parsed).to.be.true;

			parsed = this.property.parse('1');
			expect(parsed).to.be.true;

			parsed = this.property.parse(true);
			expect(parsed).to.be.true;
		});

		it('false', function() {
			let parsed = this.property.parse('F');
			expect(parsed).to.be.false;

			parsed = this.property.parse('False');
			expect(parsed).to.be.false;

			parsed = this.property.parse('false');
			expect(parsed).to.be.false;

			parsed = this.property.parse('N');
			expect(parsed).to.be.false;

			parsed = this.property.parse('No');
			expect(parsed).to.be.false;

			parsed = this.property.parse(0);
			expect(parsed).to.be.false;

			parsed = this.property.parse(0.0);
			expect(parsed).to.be.false;

			parsed = this.property.parse(12);
			expect(parsed).to.be.false;

			parsed = this.property.parse(12.1);
			expect(parsed).to.be.false;

			parsed = this.property.parse('0');
			expect(parsed).to.be.false;

			parsed = this.property.parse(false);
			expect(parsed).to.be.false;
		});
	});

	describe('propertly displays formatted values', function() {

		it('displayValue - No', function() {
			this.property.setValue(false);
			const formatted = this.property.displayValue;
			expect(formatted).to.be.eq('No');
		});

		it('displayValue - Yes', function() {
			this.property.setValue(true);
			const formatted = this.property.displayValue;
			expect(formatted).to.be.eq('Yes');
		});
		
		it('submitValue - null', function() {
			this.property.setValue();
			const formatted = this.property.submitValue;
			expect(formatted).to.be.null;
		});

		it('submitValue - false', function() {
			this.property.setValue(false);
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq(false);
		});

		it('submitValue - false as string', function() {
			this.property.setValue(false);
			this.property.setSubmitAsString(true);
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq('false');
		});

		it('submitValue - true', function() {
			this.property.setValue(true);
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq(true);
		});

		it('submitValue - true as string', function() {
			this.property.setValue(true);
			this.property.setSubmitAsString(true);
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq('true');
		});
	});

});