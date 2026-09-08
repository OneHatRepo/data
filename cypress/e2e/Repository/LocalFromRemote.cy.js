import {
	default as LocalFromRemoteRepository,
	MODE_LOCAL_MIRROR,
	MODE_COMMAND_QUEUE,
} from '../../../src/Repository/LocalFromRemote/index.js';
import MemoryRepository from '../../../src/Repository/Memory.js';
import Schema from '../../../src/Schema/index.js';
import momentAlt from 'relative-time-parser';

describe('LocalFromRemote', function() {
	beforeEach(async function() { // mark as async!
		this.schema = new Schema({
			name: 'bar',
			model: {
				idProperty: 'key',
				displayProperty: 'value',
				sorters: [
					{ name: 'date', direction: 'ASC', },
				],
				properties: [
					{ name: 'key', type: 'int' },
					{ name: 'date', type: 'datetime' },
					{ name: 'value', type: 'json' },
				],
			},
		});
		this.Repository = LocalFromRemoteRepository;
		const local = new MemoryRepository({
				isLocal: true, // hack, to get it to work
				schema: this.schema,
			}),
			remote = new MemoryRepository({
				isRemote: true, // hack, to get it to work
				schema: this.schema,
				data: [
					{ key: 1, date: null, value: { foo: 'one' }, },
					{ key: 2, date: null, value: { foo: 'two' }, },
					{ key: 3, date: null, value: { foo: 'three' }, },
					{ key: 4, date: null, value: { foo: 'four' }, },
					{ key: 5, date: null, value: { foo: 'five' }, },
				],
			});

		await local.initialize();
		await remote.initialize();

		this.repository = new this.Repository({
			local,
			remote,
			isAutoSync: false,
			retryRate: '+1 minute',
		});
		await this.repository.initialize();
	});

	afterEach(function() {
		this.schema.destroy();
		this.repository.destroy();
	});

	const slopFactor = 100; // difference should be within 100ms

	describe(MODE_LOCAL_MIRROR, function() {

		it('ids', function() {
			const id = this.repository.id,
				localId = this.repository.local.id,
				remoteId = this.repository.remote.id;

			// All IDs are unique
			expect(id !== localId && localId !== remoteId && id !== remoteId).to.be.true;
		});

		it('getNextRetry()', function() {
			let nextDate = this.repository.getNextRetry().valueOf(),
				expected = momentAlt().relativeTime('+1 minute').valueOf();
			expect(expected - nextDate < slopFactor).to.be.true;
		});

		it('getNextSync()', async function() {
			let nextDate = this.repository.getNextSync().valueOf(),
				now = momentAlt().valueOf();
			expect(nextDate).to.be.lessThan(now);

			await this.repository.sync();
			this.repository.syncRate = '+1 minute';

			nextDate = this.repository.getNextSync().valueOf(),
			now = momentAlt().valueOf();
			expect(nextDate).to.be.greaterThan(now);
			expect(nextDate).to.be.lessThan(momentAlt().relativeTime('+2 minutes').valueOf());
		});

		it('needsSync', async function() {
			// A clean local mirror does not need sync yet.
			expect(this.repository.needsSync).to.be.false;

			let hasPendingChanges = true;
			this.repository.local.getNonPersisted = () => hasPendingChanges ? [{ id: 8 }] : [];
			expect(this.repository.needsSync).to.be.true;

			hasPendingChanges = false;
			await this.repository.sync();
			this.repository.syncRate = '+1 minute';
			expect(this.repository.needsSync).to.be.false;
		});

		it('_getActiveRepository', function() {
			const result = this.repository._getActiveRepository();
			expect(_.isEqual(result, this.repository.local)).to.be.true;
		});

		it('setOptions', function() {
			const
				local = this.repository.local,
				remote = this.repository.remote;

			this.repository.setOptions({
				test: 1
			});
			
			expect(local.test).to.be.equal(1);
			expect(remote.test).to.be.equal(1);
		});

		it('setIsOnline', function() {
			this.repository.setIsOnline(true);
			expect(this.repository.isOnline).to.be.true;

			this.repository.setIsOnline(false);
			expect(this.repository.isOnline).to.be.false;
		});

		it('_setLastSync', async function() {
			await this.repository.local.load([
				{ key: 1, date: null, value: { foo: 'one' }, },
			]);
			const expected = (new Date()).valueOf();
			await this.repository._setLastSync();
			const lastSync = (await this.repository.getLastSync()).valueOf();

			expect(Math.abs(expected - lastSync) < slopFactor).to.be.true;
		});

		it('getRawValues before sync', function() {
			const values = this.repository.getRawValues(),
				expected = [];
			expect(_.isEqual(values, expected)).to.be.true;
		});

		it('sync', async function() {
			await this.repository.sync();
			const values = this.repository.getRawValues(),
				keys = values.map((value) => value.key).sort();

			expect(values.length).to.be.eq(5);
			expect(_.isEqual(keys, [1, 2, 3, 4, 5])).to.be.true;
			expect(values.find((value) => value.key === 3).value.foo).to.be.eq('three');
		});

		it('events - changeData', async function() {
			let changeData = 0;
			this.repository.on('changeData', () => { changeData++; });

			await this.repository.sync();

			expect(changeData).to.be.eq(1);
		});

		it('events - beginSync/endSync', async function() {
			let beginSync = 0,
				endSync = 0;
			this.repository.on('beginSync', () => { beginSync++; });
			this.repository.on('endSync', () => { endSync++; });

			await this.repository.sync();

			expect(beginSync).to.be.eq(1);
			expect(endSync).to.be.eq(1);
		});

	});

	describe(MODE_COMMAND_QUEUE, function() {

		it('ids', function() {

			const local = new MemoryRepository({
					isLocal: true, // hack, to get it to work
					schema: this.schema,
				}),
				remote = new MemoryRepository({
					isRemote: true, // hack, to get it to work
					schema: this.schema,
					api: {
						add: 'OfflineQueue/command',
						get: null,
						edit: null,
						delete: null,
					},
				}),
				repository = new LocalFromRemoteRepository({
					local,
					remote,
					mode: MODE_COMMAND_QUEUE,
					isOnline: false,
					isAutoSync: false,
					retryRate: '+1 minute',
				});
			
			repository.initialize();

			expect(repository.type).to.be.eq('lfr');
			expect(repository.className).to.be.eq('LocalFromRemote');
			// Load up the local with commands

			repository.setIsOnline(true);

		});

	});
	
});