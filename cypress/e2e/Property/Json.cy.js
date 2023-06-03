import PropertyTypes from '../../../src/Property/index.js';
import _ from 'lodash';

describe('JsonProperty', function() {

	beforeEach(function() {
		const definition = {
				type: 'json',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Json');
	});

	describe('parse', function() {

		it('good json data', function() {
			const parsed = this.property.parse('{"test":true}'),
				expected = {
					test: true,
				};
			expect(_.isEqual(parsed, expected)).to.be.true;
		});

		it('bad json data', function() {
			const parsed = this.property.parse('{{"test":true}');
			expect(parsed).to.be.null;
		});

	});

	describe('property displays formatted values', function() {

		it('displayValue - null', function() {
			this.property.setValue(null);
			const formatted = this.property.displayValue;
			expect(formatted).to.be.null;
		});

		it('displayValue', function() {
			const json = '{"test":true}',
				testObj = {test:true};
			this.property.setValue(json);
			const formatted = this.property.displayValue;
			expect(_.isEqual(formatted, testObj)).to.be.true;
		});
		
		it('submitValue - null', function() {
			this.property.setValue();
			const formatted = this.property.submitValue;
			expect(formatted).to.be.null;
		});

		it('submitValue - as string', function() {
			const json = '{"test":true}';
			this.property.setValue(json);
			const formatted = this.property.submitValue;
			expect(_.isEqual(formatted, json)).to.be.true;
		});

		it('submitValue - as object', function() {
			const json = '{"test":true}';
			this.property.setValue(json);
			this.property.setSubmitAsString(false);
			const formatted = this.property.submitValue,
				expected = { test: true };
			expect(_.isEqual(formatted, expected)).to.be.true;
		});
	});


	describe('custom functions', function() {

		it('isValid', function() {
			let result = this.property.isValid('Foo');
			expect(result).to.be.false;

			result = this.property.isValid('{"test":true}');
			expect(result).to.be.true;
		});

	});

});