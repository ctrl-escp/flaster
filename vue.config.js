import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import path from 'node:path';
// const path = require("node:path");
export default {
	configureWebpack: {
		plugins: [
			new MonacoWebpackPlugin({
				languages: [
					"javascript"
				],
				features: [
					"coreCommands",
					"find"
				],
			}), // Place it here
		],
	},
	chainWebpack: (config) => {
		config.resolve.alias.set(
			"vscode",
			path.resolve(
				"./node_modules/monaco-languageclient/lib/vscode-compatibility"
			)
		);
	},
};
