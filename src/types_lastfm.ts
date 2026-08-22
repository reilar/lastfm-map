export interface LastFmResponse {
	artists: Artists;
	error?: number;
	message?: string;
}

export interface Artists {
	artist: Artist[];
}

export interface Artist {
	name: string;
	playcount: number;
	mbid: string;
	url: string;
	image: Image[];
	country: string;
}

export interface Image {
	size: 'small' | 'medium' | 'large' | 'extralarge';
	'#text': string;
}
