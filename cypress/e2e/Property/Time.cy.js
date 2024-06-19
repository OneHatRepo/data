import PropertyTypes from '../../../src/Property/index.js';

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

	it('getStaticDefaults', function() {
		const
			PropertyType = PropertyTypes['time'],
			defaults = PropertyType.getStaticDefaults(),
			expected = {
				allowNull: true,
				defaultValue: null,
				depends: null,
				editorType: null,
				fieldGroup: null,
				filterType: null,
				isEditingDisabled: false,
				isFilteringDisabled: false,
				isForeignModel: false,
				isSortable: true,
				isTempId: false,
				isVirtual: false,
				mapping: null,
				name: null,
				submitAsString: false,
				title: null,
				tooltip: null,
				viewerType: null,

				readFormat: 'HH:mm:ss', // new
				displayFormat: 'HH:mm:ss', // new
				submitFormat: 'HH:mm:ss', // new
			};
		// console.log(defaults);
		// console.log(expected);
		expect(defaults).to.be.eql(expected);
	});

	describe('parse', function() {

		it('parse HH:mm:ss', function() {
			const time = '02:23:23';
			const parsed = this.property.parse(time);
			expect(parsed.isValid()).to.be.true;
			expect(parsed.format('HH:mm:ss')).to.be.eq(time);
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