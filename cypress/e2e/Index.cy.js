import oneHatData, {
	OneHatData,
	resetOneHatDataSingleton,
} from '../../src/index.js';

describe('index singleton export', function() {
	it('uses one global singleton and reset restores it', function() {
		const
			ONEHAT_DATA_SINGLETON_KEY = '__ONEHAT_DATA_SINGLETON__',
			globalScope = typeof globalThis !== 'undefined'
				? globalThis
				: typeof global !== 'undefined'
					? global
					: window;

		const initialSingleton = oneHatData;

		expect(globalScope[ONEHAT_DATA_SINGLETON_KEY]).to.be.eq(initialSingleton);

		globalScope[ONEHAT_DATA_SINGLETON_KEY] = new OneHatData();
		expect(globalScope[ONEHAT_DATA_SINGLETON_KEY]).to.not.be.eq(initialSingleton);

		const resetSingleton = resetOneHatDataSingleton();

		expect(resetSingleton).to.be.eq(initialSingleton);
		expect(globalScope[ONEHAT_DATA_SINGLETON_KEY]).to.be.eq(initialSingleton);
	});
});
