import React, { useEffect, useState } from 'react';
import { AppLoading } from 'expo';
import {
	AsyncStorage as AS,
	Platform,
} from 'react-native';
import { checkInternetConnection } from 'react-native-offline';

import oneHatData from '../../../OneHatData';
import AsyncStorage from '../Repository/AsyncStorage';
import SecureStore from '../Repository/SecureStore';

import allSchemas from './src/data/Schema/AllSchemas';
import AppNavigator from './src/AppNavigator';

function App() {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {

		(async () => {
			oneHatData
				.setRepositoryGlobals({
					debugMode: false,
					api: {
						baseURL: 'localhost/MyApp/',
					},
					headers: {
						'X-CSRF-Token': 'MY_TOKEN',
					},
					timeout: 15000,
					isOnline: await checkInternetConnection(),
					useLongTimers: Platform.OS !== 'android',
				})
				.registerRepositoryTypes([
					AsyncStorage,
					SecureStore,
				])
				.createSchemas(_.map(allSchemas, Schema => Schema))
				.createBoundRepositories()
				.then(() => {
					setIsReady(true);
				});
		})();
		
	}, []);

	return !isReady ? <AppLoading /> : <AppNavigator />;
}