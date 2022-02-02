import PropertyTypes from '../../../src/Property';

describe('StringProperty', function() {
	
	beforeEach(function() {
		const definition = {
				type: 'string',
			},
			Property = PropertyTypes[definition.type];
		this.property = new Property(definition);
	});

	describe('general', function() {

		it('className', function() {
			const className = this.property.getClassName();
			expect(className).to.be.eq('String');
		});

		it('newId', function() {
			const id1 = this.property.newId();
			expect(id1.valueOf()).to.be.eq('TEMP-1');

			const id2 = this.property.newId();
			expect(id2.valueOf()).to.be.eq('TEMP-2');
		});

	});

	describe('parse', function() {

		it('string', function() {
			const parsed = this.property.parse('Foo');
			expect(parsed).to.be.eq('Foo');
		});

		it('number', function() {
			const parsed = this.property.parse(12);
			expect(parsed).to.be.eq('12');
		});

		it('boolean', function() {
			const parsed = this.property.parse(true);
			expect(parsed).to.be.eq('true');
		});

		it('date', function() {
			const parsed = this.property.parse(new Date());
			expect(parsed).to.be.eq(null);
		});

		it('object', function() {
			const parsed = this.property.parse({});
			expect(parsed).to.be.eq(null);
		});

		it('array', function() {
			const parsed = this.property.parse([1]);
			expect(parsed).to.be.eq(null);
		});

		it('null', function() {
			const parsed = this.property.parse();
			expect(parsed).to.be.eq(null);
		});

		it('undefined', function() {
			const parsed = this.property.parse(void 0);
			expect(parsed).to.be.eq(null);
		});

	});

});