import PropertyTypes from '../../../src/Property';

describe('Base64Property', function() {

	beforeEach(function() {
		const definition = {
				type: 'base64',
			},
			Property = PropertyTypes['base64'];
		this.property = new Property(definition);
	});

	it('className', function() {
		const className = this.property.getClassName();
		expect(className).to.be.eq('Base64');
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