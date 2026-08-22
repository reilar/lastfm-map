import {LastFmResponse} from './types_lastfm.ts';
import {MusicBrainzResponse} from './types_musicbrainz.ts';
import {LASTFM_API_KEY} from './config';

const LASTFM_LIMIT = 500;
const COUNTRY_LIMIT = 10;
const MUSICBRAINZ_CONCURRENCY = 6;
const REGION_NAMES = new Intl.DisplayNames(['en'], {type: 'region'});

const COUNTRY_ALIASES: Record<string, string> = {
	'gb': 'United Kingdom',
	'uk': 'United Kingdom',
	'united kingdom': 'United Kingdom',
	'great britain': 'United Kingdom',
	'us': 'United States',
	'usa': 'United States',
	'united states': 'United States',
	'united states of america': 'United States',
	'u.s.': 'United States',
	'u.k.': 'United Kingdom',
	'netherlands': 'Netherlands',
	'the netherlands': 'Netherlands',
	'holland': 'Netherlands',
	'deutschland': 'Germany',
	'russia': 'Russia',
	'russian federation': 'Russia',
	'czech republic': 'Czech Republic',
	'republic of korea': 'South Korea',
	'south korea': 'South Korea',
	'korea republic of': 'South Korea',
	'north macedonia': 'North Macedonia',
	'macedonia': 'North Macedonia',
	'bosnia and herzegovina': 'Bosnia and Herzegovina',
	'cote d ivoire': 'Cote d\'Ivoire',
	'cote divoire': 'Cote d\'Ivoire',
	'cote d\'ivoire': 'Cote d\'Ivoire',
	'cote d’ivoire': 'Cote d\'Ivoire',
	'côte d’ivoire': 'Cote d\'Ivoire',
	'côte d ivoire': 'Cote d\'Ivoire',
};

function normalizeCountryName(value?: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	const cleaned = value
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[\u2018\u2019]/g, '\'');

	if (!cleaned) {
		return undefined;
	}

	const normalized = cleaned.toLowerCase();
	if (COUNTRY_ALIASES[normalized]) {
		return COUNTRY_ALIASES[normalized];
	}

	if (/^[a-z]{2}$/i.test(cleaned)) {
		return REGION_NAMES.of(cleaned.toUpperCase()) ?? cleaned;
	}

	return cleaned;
}

function addCountryPlayCount(countryTotals: Map<string, number>, country: string | null | undefined, playcount: number): void {
	const normalizedCountry = normalizeCountryName(country);
	if (!normalizedCountry) {
		return;
	}

	countryTotals.set(normalizedCountry, (countryTotals.get(normalizedCountry) ?? 0) + playcount);
}

export async function getMapData(lastFmUserName: string): Promise<(string | number)[][]> {
	const lastFmEndpoint = `https://ws.audioscrobbler.com/2.0/?method=library.getartists&user=${lastFmUserName}&api_key=${LASTFM_API_KEY}&limit=${LASTFM_LIMIT}&format=json`;
	const defaultData: (string | number)[][] = [['Country', 'Plays']];

	const fetchApi = async <T>(url: string): Promise<T> => {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}
		return await response.json() as T;
	};

	try {
		const artistsResponse = await fetchApi<LastFmResponse>(lastFmEndpoint);
		if (artistsResponse.error) {
			throw new Error(artistsResponse.message || 'Last.fm returned an unknown API error.');
		}

		const artists = artistsResponse.artists?.artist ?? [];
		if (artists.length === 0) {
			console.log('Unknown Last.fm username or no artist data returned.');
			return defaultData;
		}

		const countryTotals = new Map<string, number>();
		const uniqueArtists = new Map<string, {playcount: number; country?: string}>();

		for (const artist of artists) {
			const mbid = artist?.mbid?.trim();
			const playcount = Number(artist.playcount ?? 0);
			const country = normalizeCountryName(artist?.country);

			if (!mbid) {
				if (country) {
					addCountryPlayCount(countryTotals, country, playcount);
				}
				continue;
			}

			const existing = uniqueArtists.get(mbid);
			uniqueArtists.set(mbid, {
				playcount: (existing?.playcount ?? 0) + playcount,
				country: existing?.country ?? country,
			});
		}

		if (uniqueArtists.size === 0) {
			return countryTotals.size > 0 ? buildMapData(countryTotals) : defaultData;
		}

		const queue = [...uniqueArtists.entries()].map(([mbid, details]) => ({
			mbid,
			playcount: details.playcount,
			fallbackCountry: details.country,
		}));
		let nextIndex = 0;

		await Promise.allSettled(
			Array.from({length: Math.min(MUSICBRAINZ_CONCURRENCY, queue.length)}, async () => {
				while (nextIndex < queue.length) {
					const currentIndex = nextIndex++;
					const {mbid, playcount, fallbackCountry} = queue[currentIndex];

					try {
						const musicBrainzEndpoint = `https://musicbrainz.org/ws/2/artist/${mbid}?fmt=json`;
						const musicBrainzArtistResponse = await fetchApi<MusicBrainzResponse>(musicBrainzEndpoint);
						const country = normalizeCountryName(musicBrainzArtistResponse?.country) ?? normalizeCountryName(fallbackCountry);
						if (!country) {
							continue;
						}

						addCountryPlayCount(countryTotals, country, playcount);
					} catch {
						const fallback = normalizeCountryName(fallbackCountry);
						if (!fallback) {
							console.log('Failed to fetch artist country from MusicBrainz.');
							continue;
						}

						addCountryPlayCount(countryTotals, fallback, playcount);
					}
				}
			})
		);

		return buildMapData(countryTotals);
	} catch (error) {
		console.log(error);
		throw error;
	}
}

function buildMapData(countryTotals: Map<string, number>): (string | number)[][] {
	const mapData: (string | number)[][] = [['Country', 'Plays']];
	const sortedCountries = [...countryTotals.entries()]
		.sort(([, playsA], [, playsB]) => playsB - playsA)
		.slice(0, COUNTRY_LIMIT);

	for (const [country, plays] of sortedCountries) {
		mapData.push([country, plays]);
	}

	return mapData.length > 1 ? mapData : [['Country', 'Plays']];
}
