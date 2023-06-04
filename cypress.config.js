import { defineConfig } from "cypress";
import webpackPreprocessor from "@cypress/webpack-preprocessor";

export default defineConfig({
	e2e: {
		experimentalRunAllSpecs: true,
		chromeWebSecurity: false,
		setupNodeEvents(on) {
			const options = webpackPreprocessor.defaultOptions;
			if (!options.module) {
				options.module = {
					rules: [],
				}
			}
			if (!options.module.rules) {
				options.module.rules = [];
			}
			options.module.rules.push({
				test: /\.(js|jsx|mjs)$/,
				exclude: [/node_modules\/(?!(@onehat)\/).*/],
				use: [{
					loader: 'babel-loader',
					options: {
						cacheDirectory: false,
						presets: [
							'@babel/preset-env'
						],
						plugins: [
							'@babel/plugin-transform-class-properties',
							'@babel/plugin-transform-runtime'
						],
						sourceType: 'unambiguous',
					},
				}],

			});

			on('file:preprocessor', webpackPreprocessor(options));
		},
	}
});
