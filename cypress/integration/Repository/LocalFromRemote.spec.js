import {
	default as LocalFromRemoteRepository,
	MODE_COMMAND_QUEUE,
} from '../../../src/Repository/LocalFromRemote';
import MemoryRepository from '../../../src/Repository/Memory';
import Schema from '../../../src/Schema';
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

		this.repository = new this.Repository({
			local,
			remote,
			autoSync: false,
			retryRate: '+1 minute',
		});
		this.repository.initialize();
	});

	afterEach(function() {
		this.schema.destroy();
		this.repository.destroy();
	});

	const slopFactor = 100; // difference should be within 100ms

	describe('MODE_LOCAL_MIRROR', function() {

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

		it('getNextSync()', function() {
			(async () => {
				let nextDate = this.repository.getNextSync().valueOf(),
					expected = momentAlt().relativeTime('-1 minute').valueOf();
				expect(expected - nextDate < slopFactor).to.be.true;
	
				await this.repository.sync();
				this.repository.syncRate = '+1 minute';
	
				nextDate = this.repository.getNextSync().valueOf(),
				expected = momentAlt().relativeTime('+1 minute').valueOf();
				expect(expected - nextDate < slopFactor).to.be.true;
			})();
		});

		it('needsSync', function() {
			(async () => {
				// Has not synced
				expect(this.repository.needsSync).to.be.true;

				await this.repository.sync();
				this.repository.syncRate = '+1 minute';
				expect(this.repository.needsSync).to.be.false;
			})();
		});

		it('_getActiveRepository', function() {
			const result = this.repository._getActiveRepository();
			expect(_.isEqual(result, this.repository.local)).to.be.true;
		});

		it('setIsOnline', function() {
			this.repository.setIsOnline(true);
			expect(this.repository.isOnline).to.be.true;

			this.repository.setIsOnline(false);
			expect(this.repository.isOnline).to.be.false;
		});

		it('_setLastSync', function() {
			(async () => {
				const expected = (new Date()).valueOf();
				await this.repository._setLastSync();
				const lastSync = await this.repository.getLastSync().valueOf();

				expect(expected - lastSync < slopFactor).to.be.true;
			})();
		});

		it('getRawValues before sync', function() {
			const values = this.repository.getRawValues(),
				expected = [];
			expect(_.isEqual(values, expected)).to.be.true;
		});

		it('sync', function() {
			(async () => {
				await this.repository.sync();
				const values = this.repository.getRawMappedValues(),
					expected = [
						{ key: 1, date: null, value: { foo: 'one' }, },
						{ key: 2, date: null, value: { foo: 'two' }, },
						{ key: 3, date: null, value: { foo: 'three' }, },
						{ key: 4, date: null, value: { foo: 'four' }, },
						{ key: 5, date: null, value: { foo: 'five' }, },
					];
				expect(_.isEqual(values, expected)).to.be.true;
			})();
		});

		it('events - changeData', function() {
			(async () => {
				let changeData = 0;
				this.repository.on('changeData', () => { changeData++; });
		
				await this.repository.sync();
				
				expect(changeData).to.be.eq(1);
			})();
		});

		it('events - sync', function() {
			(async () => {
				let sync = 0;
				this.repository.on('sync', () => { sync++; });
		
				await this.repository.sync();
				
				expect(sync).to.be.eq(1);
			})();
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
					autoSync: false,
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