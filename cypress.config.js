import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		chromeWebSecurity: false,
		setupNodeEvents(on, config) {
			// bind to the event we care about
			// on('<event>', (arg1, arg2) => {
			// 	// plugin stuff here
			// })
		},
	}
});
