export interface MovieFetchResults {
  movie_results: MovieResult[];
  person_results: unknown[];
  tv_results: MovieResult[];
  tv_episode_results: unknown[];
  tv_season_results: unknown[];
}

export interface MovieResult {
  adult: boolean;
  backdrop_path: string;
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string;
  media_type: string;
  original_language: string;
  genre_ids: number[];
  popularity: number;
  release_date: Date;
  softcore: boolean;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface MovieDetails {
  adult: boolean;
  backdrop_path: string;
  belongs_to_collection?: CollectionDetails;
  budget: number;
  genres: Genre[];
  homepage: string;
  id: number;
  imdb_id: string;
  origin_country: string[];
  original_language: string;
  original_title: string;
  name?: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  release_date: string;
  revenue: number;
  runtime: number;
  softcore: boolean;
  spoken_languages: SpokenLanguage[];
  status: string;
  tagline: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
  first_air_date?: string;
  mediad_type?: string;
  external_ids?:ExternalIds
}

interface ExternalIds {
  imdb_id: string
  twitter_id: string
  tvdb_id: string
  wikidata_id: string
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  logo_path: null | string;
  name: string;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface CollectionDetails {
  id: number;
  name: string;
}
