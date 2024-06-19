import PropertyTypes from '../../../src/Property/index.js';

describe('Base64Property', function() {

	beforeEach(function() {
		const definition = {
				type: 'base64',
			},
			Property = PropertyTypes['base64'];
		this.property = new Property(definition);
	});

	describe('class', function() {

		it('className', function() {
			const className = this.property.getClassName();
			expect(className).to.be.eq('Base64');
		});

		it('getStaticDefaults', function() {
			const
				PropertyType = PropertyTypes['base64'],
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
					isSortable: false, // mod
					isTempId: false,
					isVirtual: false,
					mapping: null,
					name: null,
					submitAsString: false,
					title: null,
					tooltip: null,
					viewerType: null,
				};
			// console.log(defaults);
			// console.log(expected);
			expect(defaults).to.be.eql(expected);
		});
		
	});


	describe('custom functions', function() {

		it('encode', function() {
			const result = this.property.encode('Foo');
			expect(result).to.be.eq('Rm9v');
		});

		it('decode', function() {
			const result = this.property.decode('Rm9v');
			expect(result).to.be.eq('Foo');
		});

	});

});