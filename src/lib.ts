import { LastFmResponse } from './types_lastfm.ts';
import { MusicBrainzResponse } from './types_musicbrainz.ts';

export async function getMapData(lastFmUserName: string) {
	const lastFmApiKey = "API_KEY";
	const lastFmEndpoint = `https://ws.audioscrobbler.com/2.0/?method=library.getartists&user=${lastFmUserName}&api_key=${lastFmApiKey}&limit=10&format=json`;
	const mapData: (string | number)[][] = [];

	const fetchApi = async <T>(url: string): Promise<T> => {
		const response = await fetch(url)
		return await response.json();
	}

	try {
		const artistsResponse = await fetchApi<LastFmResponse>(lastFmEndpoint);
		const countryData: (string | number)[][] = [];
		if (artistsResponse.artists == null)
			console.log("Unknown Last.fm username.");
		else if (artistsResponse.artists.artist == null)
			console.log("Failed to fetch artists from Last.fm.");
		else {
			// Get country for each artist
			await Promise.allSettled(artistsResponse.artists.artist.map(async a => {
				const musicBrainzEndpoint = `https://musicbrainz.org/ws/2/artist/${a.mbid}?fmt=json`;
				const musicBrainzArtistResponse = await fetchApi<MusicBrainzResponse>(musicBrainzEndpoint)
				if (musicBrainzArtistResponse == null)
					console.log("Failed to fetch artist country from MusicBrainz.");
				else { 
					// Add new country
					countryData.push([musicBrainzArtistResponse.country, a.playcount]);
				}
			}))

			// Accumulate play count
			let updated = false;
			mapData.push(["Country", "Plays"]);
			countryData.forEach( (countryRow) => {
				mapData.forEach( (mapRow) => {
					if (mapRow[0] as string == countryRow[0] as string) {
						mapRow[1] = Number.parseInt(mapRow[1] as string) + parseInt(countryRow[1] as string);
						updated = true;
					}
				})
				if (!updated) {
					mapData.push(countryRow);
				}
			})
			return mapData;
		}
	} 
	catch (error) {
		console.log(error)
	}
};