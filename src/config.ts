const getEnv = (name: string): string => {
	const value = import.meta.env[name];
	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}
	return value;
};

export const LASTFM_API_KEY = getEnv('VITE_LASTFM_API_KEY');
