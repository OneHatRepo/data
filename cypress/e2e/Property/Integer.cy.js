import PropertyTypes from '../../../src/Property/index.js';

describe('IntegerProperty', function() {
	beforeEach(function() {
		const definition = {
				name: 'foo',
				allowNull: false,
				mapping: 'id',
				type: 'int',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	describe('general', function() {

		it('className', function() {
			const className = this.property.getClassName();
			expect(className).to.be.eq('Integer');
		});

		it('getStaticDefaults', function() {
			const
				PropertyType = PropertyTypes['int'],
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

					idStartsAt: 100 * 1000 * 1000 * 1000, // new
				};
			// console.log(defaults);
			// console.log(expected);
			expect(defaults).to.be.eql(expected);
		});

		it('newId', function() {
			const id1 = this.property.newId();
			expect(id1.valueOf()).to.be.eq(this.property.idStartsAt);

			const id2 = this.property.newId();
			expect(id2.valueOf()).to.be.eq(this.property.idStartsAt +1);
		});

		// it('default value', function() {
		// 	const property = this.property,
		// 		rawValue = property.getDefaultValue();
		// 	property.pauseEvents();
		// 	property.setValue(rawValue);
		// 	property.resumeEvents();
		// 	expect(this.property.submitValue).to.be.eq(0);
		// });

	});

	describe('parse', function() {

		it('numeric string', function() {
			const parsed = this.property.parse('12');
			expect(parsed).to.be.eq(12);
		});
	
		it('non-numeric string', function() {
			const parsed = this.property.parse('nothing');
			expect(parsed).to.be.eq(0);
		});

		it('integer', function() {
			const parsed = this.property.parse(12);
			expect(parsed).to.be.eq(12);
		});

		it('float', function() {
			const parsed = this.property.parse(12.0);
			expect(parsed).to.be.eq(12);
		});

		it('null', function() {
			const parsed = this.property.parse();
			expect(parsed).to.be.null;
		});
	
		it('date', function() {
			const parsed = this.property.parse(new Date());
			expect(parsed).to.be.eq(0);
		});

	});

});