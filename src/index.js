/**
 * OneHatData module.
 * @module @onehat/data
 */
import {
	default as oneHatData,
	OneHatData,
} from './OneHatData.js';


// Create a global singleton for the OneHatData instance
// This is so Cypress tests can work when there are multiple instances of the OneHatData module
// (e.g. one in Cypress environment, and one in e2e environment)
const
	ONEHAT_DATA_SINGLETON_KEY = '__ONEHAT_DATA_SINGLETON__',
	globalScope = typeof globalThis !== 'undefined' // use globalThis if available
		? globalThis
		: typeof global !== 'undefined' // use global if available
			? global
			: window; // fallback to window
if (!globalScope[ONEHAT_DATA_SINGLETON_KEY]) {
	globalScope[ONEHAT_DATA_SINGLETON_KEY] = oneHatData;
}
const oneHatDataSingleton = globalScope[ONEHAT_DATA_SINGLETON_KEY];


/**
 * Reset the global singleton instance.
 * Intended for tests and development flows only.
 */
const resetOneHatDataSingleton = () => {
	delete globalScope[ONEHAT_DATA_SINGLETON_KEY];
	globalScope[ONEHAT_DATA_SINGLETON_KEY] = oneHatData;

	return globalScope[ONEHAT_DATA_SINGLETON_KEY];
};


export default oneHatDataSingleton;

export {
	OneHatData,
	resetOneHatDataSingleton,
};