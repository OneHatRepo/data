import PropertyTypes from '../../../src/Property/index.js';
import _ from 'lodash';

describe('MixedProperty', function() {

	beforeEach(function() {
		const
			definition = {
				type: 'mixed',
				types: [
					'int',
					'string',
				],
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Mixed');
	});

	it('events are handled properly', function() {
		this.property.on('change', (property, oldValue, newValue) => {
			if (property.getCurrentType() === 'int') {
				expect(oldValue).to.be.eq(null);
				expect(newValue).to.be.eq(42);
			} else {
				expect(oldValue).to.be.eq(null);
				expect(newValue).to.be.eq('here');
			}
		});

		this.property.setValue(42);
		this.property.setValue('here');
	});

	describe('direct methods', function() {

		it('getCurrentType', function() {
			const currentType = this.property.getCurrentType();
			expect(currentType).to.be.eq('int');

			// switch type
			this.property.setValue('Hello');
			const newCurrentType = this.property.getCurrentType();
			expect(newCurrentType).to.be.eq('string');
		});

		it('getInternalProperty', function() {
			const intProperty = this.property.getInternalProperty('int');
			expect(intProperty).to.be.not.undefined;
			expect(intProperty.constructor.type).to.be.eq('int');

			// switch type
			this.property.setValue('Hello');
			const stringProperty = this.property.getInternalProperty('string');
			expect(stringProperty).to.be.not.undefined;
			expect(stringProperty.constructor.type).to.be.eq('string');
		});

		it('destroy', function() {
			this.property.destroy();
			expect(this.property.internalProperties).to.be.empty;
		});

	});

	it('passes methods to currentProperty', function() {
		
		this.property.setValue(42);
		expect(this.property.getSubmitValue()).to.be.eq(42);
		expect(this.property.getCurrentType()).to.be.eq('int');

		this.property.setValue('here');
		expect(this.property.getSubmitValue()).to.be.eq('here');
		expect(this.property.getCurrentType()).to.be.eq('string');

	});

	it('passes configs to internal properties', function() {
		const
			definition = {
				type: 'mixed',
				types: [
					{
						type: 'date',
						readFormat: 'YYYY-MM-DD',
						displayFormat: 'YYYY',
						submitFormat: 'YYYY-MM',
					},
					'string',
				],
			},
			Property = PropertyTypes[definition.type],
			property = new Property(definition);
		
		property.setValue('2025-10-17');
		expect(property.getSubmitValue()).to.be.eq('2025-10');
		expect(property.getDisplayValue()).to.be.eq('2025');
		expect(property.getCurrentType()).to.be.eq('date');
	});

});