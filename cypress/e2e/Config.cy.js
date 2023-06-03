import _ from 'lodash';

describe('Config options', function() {

	it('Pattern 1 - config only', function() {
		/**
		 * This pattern allows simple config settings to be overridden
		 * by subclasses.
		 * 
		 * However, object initialization *cannot* be overridden by subclasses.
		 * The initialization will take place starting from the Base class,
		 * then proceeding down to subclasses.
		 */
		class Base {
			constructor(config = {}) {
				const defaults = {
					foo: 1,
					tig: {
						chi: 11,
					},
				};
				_.merge(this, defaults, config);
			}
		}

		class Sub extends Base {
			constructor(config = {}) {
				super(...arguments);

				const defaults = {
					bar: 2,
					tig: {
						nom: 13,
					},
				};
				_.merge(this, defaults, config);
			}
		}

		class SubSub extends Sub {
			constructor(config = {}) {
				super(...arguments);

				const defaults = {
					bar: 3,
					tig: {
						chi: 3,
					},
				};
				_.merge(this, defaults, config);
			}
		}

		const subSub = new SubSub({
			baz: true,
			tig: {
				chx: 42,
			},
		});

		expect(subSub.foo).to.be.eq(1);
		expect(subSub.bar).to.be.eq(3);
		expect(subSub.baz).to.be.true;
		expect(subSub.tig.chi).to.be.eq(3);
		expect(subSub.tig.chx).to.be.eq(42);

	});

	it('Pattern 2 - config with initialize', function() {
		/**
		 * With this pattern, the constructor's only function is to set up the
		 * _originalConfig object. The actual initialization takes place in
		 * initialize();
		 * 
		 * The reason we do this is that sometimes we want initialization to 
		 * take place *after* the subclasses have had a chance to configure
		 * the object.
		 * 
		 * Also, this allows us to futher refine the object *before* its parents
		 * have a chance to initialize() -- see Sub.initialize
		 * 
		 * Requires external call to initialize()
		 */
		class Base {
			constructor(config = {}) {
				const defaults = {
					foo: 1,
					tig: {
						chi: 11,
					},
				};
				this._originalConfig = _.merge({}, defaults, config);
			}

			initialize() {
				_.merge(this, this._originalConfig);
				this.init1 = true;
			}
		}

		class Sub extends Base {
			constructor(config = {}) {
				super(...arguments);

				const defaults = {
					bar: 2,
					tig: {
						nom: 13,
					},
				};
				this._originalConfig = _.merge(this._originalConfig, defaults, config);
			}

			initialize() {
				this.init2 = true; // NOTE: order is reversed. This happens *before* the call to super.initalize()
				super.initialize();
			}
		}

		class SubSub extends Sub {
			constructor(config = {}) {
				super(...arguments);

				const defaults = {
					bar: 3,
					tig: {
						chi: 3,
					},
				};
				this._originalConfig = _.merge(this._originalConfig, defaults, config);
			}

			initialize() {
				super.initialize();
				this.init3 = true;
			}
		}

		const subSub = new SubSub({
			baz: true,
			tig: {
				chx: 42,
			},
		});
		subSub.initialize();

		expect(subSub.foo).to.be.eq(1);
		expect(subSub.bar).to.be.eq(3);
		expect(subSub.baz).to.be.true;
		expect(subSub.tig.chi).to.be.eq(3);
		expect(subSub.tig.chx).to.be.eq(42);
		expect(subSub.init1).to.be.true;
		expect(subSub.init2).to.be.true;
		expect(subSub.init3).to.be.true;

	});

	it.only('Replace this.method with config.method', function() {
		
		class Base {
			constructor(config = {}) {
				const defaults = {
					foo: 1,
					tig: {
						chi: 11,
					},
				};
				_.merge(this, defaults, config);
				this._originalConfig = config;
			}

			foo = () => {
				return 'Base';
			}
		}

		class Sub extends Base {
			constructor(config = {}) {
				super(...arguments);
				_.merge(this, config);
			}

			foo = () => {
				return 'Sub';
			}
		}

		const obj = new Sub({
			foo: () => {
				return 'Custom';
			}
		});
		const myFoo = obj.foo();

		expect(myFoo).to.be.eq('Custom');

	});
});