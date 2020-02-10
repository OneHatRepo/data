import PropertyTypes from '../../../src/Property';

describe('FloatProperty', function() {
	
	beforeEach(function() {
		const definition = {
				precision: null,
				type: 'float',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Float');
	});

	describe('parse', function() {

		it('numeric string', function() {
			const parsed = this.property.parse('12');
			expect(parsed).to.be.eq(12.0);
		});
	
		it('non-numeric string', function() {
			const parsed = this.property.parse('nothing');	
			expect(parsed).to.be.eq(0);
		});

		it('integer', function() {
			const parsed = this.property.parse(12);
			expect(parsed).to.be.eq(12.0);
		});

		it('float', function() {
			const parsed = this.property.parse(12.0);
			expect(parsed).to.be.eq(12.0);
		});

		it('null', function() {
			const parsed = this.property.parse();
			expect(parsed).to.be.null;
		});
	
		it('date', function() {
			const parsed = this.property.parse(new Date());
			expect(parsed).to.be.eq(0.0);
		});

	});

});