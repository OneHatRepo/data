import PropertyTypes from '../../../src/Property';

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

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Integer');
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