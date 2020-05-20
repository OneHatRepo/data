import React from 'react';
import { useOneHatData } from '../src/index';

export default function WidgetStandard() {
	const [usersEntities, Users] = useOneHatData('Users'),
		[groupsEntities, Groups] = useOneHatData('Groups', true), // 'true', for unique
		[error, setError] = useState(),
		[isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (!Users || !Groups) {
			return;
		}
		Users.on('err', (message) => {
			setError(message);
		});
		Groups.on('err', (message) => {
			setError(message);
		});
		
		setIsReady(true);
	}, [Users, Groups]);

	return !isReady ? <Loading /> : <Container>
		{error ? <Text>{error}</Text> : null}

		<List data={usersEntities} />;
		<Button onClick={() => { Users.reload(); }}>Reload Users</Button>
	
		<List data={groupsEntities} />;
		<Button onClick={() => { Groups.reload(); }}>Reload Groups</Button>
	</Container>
}
