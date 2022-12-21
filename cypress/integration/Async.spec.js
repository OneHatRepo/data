import { OneHatData } from '../../src/OneHatData.js';

describe('Async playground', function() {

	it.skip('async test', function() {

		async function foo() {
			console.log('foo');
		}
		async function bar() {
			console.log('bar1');
			await baz();
			console.log('bar2');
		}
		async function baz() {
			return new Promise(function(resolve, reject) {
				setTimeout(function() {
					console.log('baz');
					resolve();
				}, 2000);
			});
		}

		(async () => {
			
			await foo();
			bar();
			console.log('dog');

		})();
		
		console.log('tree');

		// It executes an async function immediately,
		// and goes as far as it can within that function;
		// but as soon as it encounters an 'await',
		// it drops out of the async function and continues on
		// with the parent function. This is true even if the function
		// it's waiting for is not actually an async function!!
		// It then comes back to the
		// await and continues on there, when the promise is resolved.
		// Note, that when it encounters 'await', it *does* immediately
		// execute what it's waiting *for*, it just stop execution on
		// that line.

	});
	
	it.skip('async test', function() {

		function foo() {
			console.log('foo');
		}
		function bar() {
			console.log('bar');
		}

		(async () => {
			
			await foo();
			bar();
			console.log('dog');

		})();
		
		console.log('tree');

	});

	it.skip('autoLoad & autoSave', function() {

		(async () => {
			const oneHatData = new OneHatData();
			oneHatData
				.createSchemas([{
					name: 'Bar',
					model: {
						idProperty: 'key',
						displayProperty: 'value',
						properties: [
							{ name: 'key', type: 'int' },
							{ name: 'value' },
						],
					},
					repository: {
						type: 'memory',
						autoLoad: true,
						autoSave: true,
						data: [
							{ key: 1, value: 'one', },
							{ key: 2, value: 'two', },
							{ key: 3, value: 'three', },
							{ key: 4, value: 'four', },
							{ key: 5, value: 'five', },
						],
					}
				}])
				.createBoundRepositories();
			const Bar = oneHatData.getRepository('Bar');
			
			const init = () => {

				const entity = Bar.getById(1);
				entity.value = 'bar';
				expect(entity.isDirty).to.be.false;

				const values = Bar.getSubmitValues(),
					expected = [
						{ key: 1, value: 'bar', },
						{ key: 5, value: 'five', },
						{ key: 4, value: 'four', },
						{ key: 3, value: 'three', },
						{ key: 2, value: 'two', },
					];
				expect(_.isEqual(values, expected)).to.be.true;

			};
			
			if (Bar.isInitialized) {
				init();
			} else {
				Bar.on('initialize', init);
			}
			
		})();

	});

	it('Manual load & save', function() {
		const oneHatData = new OneHatData();
		oneHatData
			.createSchemas([{
				name: 'Bar',
				model: {
					idProperty: 'key',
					displayProperty: 'value',
					properties: [
						{ name: 'key', type: 'int' },
						{ name: 'value' },
					],
				},
				repository: {
					type: 'memory',
					autoLoad: false,
					autoSave: false,
					data: [
						{ key: 1, value: 'one', },
						{ key: 2, value: 'two', },
						{ key: 3, value: 'three', },
						{ key: 4, value: 'four', },
						{ key: 5, value: 'five', },
					],
				}
			}])
			.createBoundRepositories();
		const Bar = oneHatData.getRepository('Bar');
		
		(async () => {

			await Bar.load();

			const entity = Bar.getById(1);
			entity.value = 'bar';
			expect(entity.isDirty).to.be.true;

			await Bar.save(); // Sorting and filtering is applied before this returns??
			const values = Bar.getSubmitValues(),
				expected = [
					{ key: 1, value: 'bar', },
					{ key: 5, value: 'five', },
					{ key: 4, value: 'four', },
					{ key: 3, value: 'three', },
					{ key: 2, value: 'two', },
				];
			expect(_.isEqual(values, expected)).to.be.true;

		})();

	});

});