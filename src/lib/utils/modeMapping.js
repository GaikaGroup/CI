/**
 * Maps application modes to valid API mode parameters for session endpoints.
 * 
 * The sessions API only accepts 'learn' and 'fun' as valid mode parameters,
 * but the application uses additional modes like 'catalogue' for UI state.
 * This utility ensures proper mapping between UI modes and API parameters.
 * 
 * @param {string} appMode - The application mode ('catalogue', 'learn', 'fun', etc.)
 * @returns {string} The corresponding API mode parameter ('learn' or 'fun')
 */
export function getApiModeFromAppMode(appMode) {
	switch (appMode) {
		case 'catalogue':
		case 'learn':
			return 'learn';
		case 'fun':
			return 'fun';
		default:
			// Default fallback for unknown modes
			return 'fun';
	}
}

/**
 * Validates if a mode is a valid API mode parameter.
 * 
 * @param {string} mode - The mode to validate
 * @returns {boolean} True if the mode is valid for API calls
 */
export function isValidApiMode(mode) {
	return mode === 'learn' || mode === 'fun';
}

/**
 * Gets all supported application modes.
 * 
 * @returns {string[]} Array of supported app modes
 */
export function getSupportedAppModes() {
	return ['catalogue', 'learn', 'fun'];
}