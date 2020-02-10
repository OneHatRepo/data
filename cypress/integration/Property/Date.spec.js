import PropertyTypes from '../../../src/Property';

describe('DateProperty', function() {
	
	beforeEach(function() {
		const definition = {
				type: 'date',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Date');
	});

	it('overrides displayFormat', function() {
		const definition = {
				type: 'date',
				displayFormat: 'YY-M-D',
			},
			Property = PropertyTypes[definition.type],
			property = new Property(definition);
		expect(property.displayFormat).to.be.eq('YY-M-D');
	});

	describe('parse', function() {

		it('null', function() {
			const parsed = this.property.parse();
			expect(parsed).to.be.null;
		});

		it('invalid date gives error', function() {
			const definition = {
					name: 'Foo',
					type: 'date',
				},
				Property = PropertyTypes[definition.type],
				property = new Property(definition);
			let parsed,
				isFail = false;
			try {
				parsed = property.parse('bar');
			} catch (e) {
				isFail = true;
				expect(e.message).to.be.eq('Foo Invalid date');
			}
			expect(isFail).to.be.true;
		});

		it('YYYY-MM-DD', function() {
			const parsed = this.property.parse('2020-01-01');
			expect(parsed.isValid()).to.be.true;
			expect(parsed.format('YYYY-MM-DD')).to.be.eq('2020-01-01');
		});

	});

	describe('propertly displays formatted values', function() {

		it('displayValue', function() {
			this.property.setValue('2020-01-01');
			const formatted = this.property.displayValue;
			expect(formatted).to.be.eq('Jan 01, 2020');
		});

		it('submitValue', function() {
			this.property.setValue('2020-01-01');
			const formatted = this.property.submitValue;
			expect(formatted).to.be.eq('2020-01-01');
		});

	});

});