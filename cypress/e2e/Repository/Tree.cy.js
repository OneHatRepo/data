import RepositoryTypes from '../../../src/Repository/index.js';
import Schema from '../../../src/Schema/index.js';

describe('TreeRepository', function() {
	const
		schema = new Schema({
			name: 'nodes',
			model: {
				idProperty: 'id',
				displayProperty: 'display',
				parentIdProperty: 'parent_id',
				depthProperty: 'depth',
				hasChildrenProperty: 'hasChildren',
				isTree: true,
				isClosureTable: true,
				properties: [
					{ name: 'id', type: 'int' },
					{ name: 'display' },
					{ name: 'parent_id', type: 'int' },
					{ name: 'depth', type: 'int' },
					{ name: 'hasChildren', type: 'bool' },
				],
			},
			repository: 'tree',
		}),
		Repository = RepositoryTypes.tree,
		data = [
			{
				id: 1,
				display: 'Root',
				parent_id: null,
				depth: 0,
				hasChildren: true,
				areChildrenLoaded: true,
			},
			{
				id: 2,
				display: 'Child 1',
				parent_id: 1,
				depth: 1,
				hasChildren: true,
				areChildrenLoaded: true,
			},
			{
				id: 3,
				display: 'Child 2',
				parent_id: 1,
				depth: 1,
				areChildrenLoaded: true,
			},
			{
				id: 4,
				display: 'Grandchild',
				parent_id: 2,
				depth: 2,
				areChildrenLoaded: true,
			},
		],
		createRepository = async () => {
			const repository = new Repository({
				id: 'tree',
				schema,
				isAutoLoad: false,
				isAutoSave: true,
				isPaginated: false,
				rootNodeType: 'Nodes',
			});

			repository._send = () => Promise.resolve({
				data: {
					success: true,
					total: data.length,
					data,
				},
			});

			await repository.initialize();
			await repository.loadRootNodes(1);
			return repository;
		},
		destroyRepository = (repository) => {
			repository.destroy();
		};

	after(function() {
		schema.destroy();
	});

	it('TreeNode (Entity) tests', async function() {
		const repository = await createRepository();
		try {
			const
				id1 = repository.getById(1),
				id2 = repository.getById(2),
				id3 = repository.getById(3),
				id4 = repository.getById(4);

			expect(id2.hasChildren).to.be.true;
			expect(id4.hasChildren).to.be.false;

			expect(id2.getParent()).to.be.eq(id1);
			expect(id1.getParent()).to.be.null;

			let children = await id2.getChildren();
			expect(children).to.be.eql([id4]);

			children = await id3.getChildren();
			expect(children).to.be.empty;

			let hasThisChild = await id2.hasThisChild(id3);
			expect(hasThisChild).to.be.false;

			hasThisChild = await id2.hasThisChild(id4);
			expect(hasThisChild).to.be.true;

			let sibling = await id2.getPrevousSibling();
			expect(sibling).to.be.null;

			sibling = await id3.getPrevousSibling();
			expect(sibling).to.be.eq(id2);

			sibling = await id3.getNextSibling();
			expect(sibling).to.be.null;

			sibling = await id2.getNextSibling();
			expect(sibling).to.be.eq(id3);

			let child = await id1.getChildAt(0);
			expect(child).to.be.eq(id2);

			child = await id1.getChildAt(1);
			expect(child).to.be.eq(id3);

			child = await id1.getChildAt(2);
			expect(child).to.be.null;

			child = await id1.getFirstChild();
			expect(child).to.be.eq(id2);

			child = await id4.getFirstChild();
			expect(child).to.be.null;

			child = await id1.getLastChild();
			expect(child).to.be.eq(id3);

			child = await id4.getLastChild();
			expect(child).to.be.null;

			const path = id4.getPath();
			expect(path).to.be.eq('1/2/4');
		} finally {
			destroyRepository(repository);
		}
	});

	it('loadRootNodes', async function() {
		const repository = await createRepository();
		try {
			const id1 = repository.getById(1);
			const rootNodes = repository.getRootNodes();
			expect(rootNodes).to.be.eql([id1]);
		} finally {
			destroyRepository(repository);
		}
	});

	it('getModelFromTreeNode', async function() {
		const repository = await createRepository();
		try {
			expect(repository.getModelFromTreeNode({})).to.be.eq('Nodes');
			expect(repository.getModelFromTreeNode({ nodeType: 'Branches' })).to.be.eq('Branches');
		} finally {
			destroyRepository(repository);
		}
	});

	it('loadNode replaces existing children with refreshed children', async function() {
		const repository = await createRepository();
		try {
			const node = repository.getById(2);
			expect(node.children.length).to.be.eq(1);
			expect(node.children[0].id).to.be.eq(4);

			repository._send = () => Promise.resolve({
				data: {
					success: true,
					total: 5,
					data: [
						{
							id: 2,
							display: 'Child 1 Updated',
							parent_id: 1,
							depth: 1,
							hasChildren: true,
							areChildrenLoaded: true,
						},
						{
							id: 6,
							display: 'Replacement Child',
							parent_id: 2,
							depth: 2,
							hasChildren: false,
							areChildrenLoaded: true,
						},
					],
				},
			});

			const loadedNode = await repository.loadNode(node, 1);
			expect(loadedNode.id).to.be.eq(2);
			expect(repository.getById(4)).to.not.exist;
			expect(repository.getById(6)).to.be.ok;
			expect(node.children.length).to.be.eq(1);
			expect(node.children[0].id).to.be.eq(6);
		} finally {
			destroyRepository(repository);
		}
	});

	it('loadChildNodes aliases loadNode', async function() {
		const repository = await createRepository();
		try {
			const root = repository.getById(1);
			repository._send = () => Promise.resolve({
				data: {
					success: true,
					total: 5,
					data: [
						{
							id: 1,
							display: 'Root',
							parent_id: null,
							depth: 0,
							hasChildren: true,
							areChildrenLoaded: true,
						},
						{
							id: 7,
							display: 'Child 3',
							parent_id: 1,
							depth: 1,
							hasChildren: false,
							areChildrenLoaded: true,
						},
					],
				},
			});

			await repository.loadChildNodes(root, 1);
			expect(repository.getById(7)).to.be.ok;
		} finally {
			destroyRepository(repository);
		}
	});

	it('reloadEntity uses loadNode for tree entities', async function() {
		const repository = await createRepository();
		try {
			const node = repository.getById(2);
			let calledWith = null;

			repository.loadNode = async (treeNode, depth) => {
				calledWith = { treeNode, depth };
				return treeNode;
			};

			const result = await repository.reloadEntity(node);
			expect(result).to.be.eq(node);
			expect(calledWith.treeNode).to.be.eq(node);
			expect(calledWith.depth).to.be.eq(1);
		} finally {
			destroyRepository(repository);
		}
	});

	it('searchNodes returns server search results', async function() {
		const repository = await createRepository();
		try {
			repository._send = () => Promise.resolve({
				data: {
					success: true,
					total: 1,
					data: [
						{ id: 3, display: 'Child 2' },
					],
				},
			});

			const results = await repository.searchNodes('Child');
			expect(results.length).to.be.eq(1);
			expect(results[0].id).to.be.eq(3);
		} finally {
			destroyRepository(repository);
		}
	});

	it('moveTreeNode updates local parent-child relationships', async function() {
		const repository = await createRepository();
		try {
			const node = repository.getById(4);
			expect(node.parent.id).to.be.eq(2);

			repository._send = () => Promise.resolve({
				data: {
					success: true,
					total: 4,
					data: {
						commonAncestorId: 1,
						oldParent: {
							id: 2,
							display: 'Child 1',
							parent_id: 1,
							depth: 1,
							hasChildren: false,
							areChildrenLoaded: true,
						},
						newParent: {
							id: 1,
							display: 'Root',
							parent_id: null,
							depth: 0,
							hasChildren: true,
							areChildrenLoaded: true,
						},
						node: {
							id: 4,
							display: 'Grandchild',
							parent_id: 1,
							depth: 1,
							hasChildren: false,
							areChildrenLoaded: true,
						},
					},
				},
			});

			const commonAncestorId = await repository.moveTreeNode(node, 1);
			expect(commonAncestorId).to.be.eq(1);
			expect(node.parent.id).to.be.eq(1);
			const newParent = repository.getById(1);
			expect(newParent.children.map((child) => child.id)).to.include(4);
		} finally {
			destroyRepository(repository);
		}
	});

	it('assembleTreeNodes', async function() {
		const repository = await createRepository();
		try {
			const
				id1 = repository.getById(1),
				id2 = repository.getById(2),
				id4 = repository.getById(4);

			id2.parent = null;
			id2.children = [];

			repository.assembleTreeNodes();

			expect(id2.parent).to.be.eq(id1);
			expect(id2.children).to.be.eql([id4]);

			repository.assembleTreeNodes();

			expect(id2.parent).to.be.eq(id1);
			expect(id2.children).to.be.eql([id4]);
		} finally {
			destroyRepository(repository);
		}
	});

	it('removeTreeNode', async function() {
		const repository = await createRepository();
		try {
			const id2 = repository.getById(2);
			const before = repository.getEntities();
			expect(before.length).to.be.eq(4);

			repository.removeTreeNode(id2);

			const after = repository.getEntities();
			expect(after.length).to.be.eq(2);
		} finally {
			destroyRepository(repository);
		}
	});
});
