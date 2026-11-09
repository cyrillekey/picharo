import { config } from "@/config";
import type { MovieDetails, MovieFetchResults, MovieResult } from "./type";

class TMDBClient {
  private static baseUrl = "https://api.themoviedb.org/3";
  static async findMediaById(id: string): Promise<MovieResult | null> {
    try {
      const url = `${this.baseUrl}/find/${id}?external_source=imdb_id&language=en-US`;
      const options: RequestInit = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${config.tmdb.accessToken}`,
        },
      };
      const request = await fetch(url, options);
      const response: MovieFetchResults =
        (await request.json()) as MovieFetchResults;
      if (response != null && response != undefined) {
        if (!response.movie_results && !response.tv_results) {
          return null;
        } else {
          return (response.tv_results || response.movie_results)?.at(0) ?? null;
        }
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
  static async findMediaDetails(
    id: number,
    type: "movie" | "tv",
  ): Promise<MovieDetails | null> {
    try {
      const url = `${this.baseUrl}/${type}/${id}?language=en-US`;
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${config.tmdb.accessToken}`,
        },
      };
      const request = await fetch(url, options);
      const response = (await request.json()) as MovieDetails;
      return response;
    } catch {
      return null;
    }
  }
}

export default TMDBClient;
