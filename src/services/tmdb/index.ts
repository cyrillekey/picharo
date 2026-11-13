import { config } from "@/config";
import type { MovieDetails, MovieFetchResults, MovieResult } from "./type";
import type { FastifyInstance } from "fastify";

class TMDBClient {
  private baseUrl = "https://api.themoviedb.org/3";
  private app?: FastifyInstance;
  constructor(app?: FastifyInstance) {
    this.app = app;
  }
  private async findMediaById(id: string): Promise<MovieResult | null> {
    try {
      const url = `${this.baseUrl}/find/${id}?external_source=imdb_id&language=en-US`;
      const headers = new Headers();
      headers.append("accept", "application/json");
      headers.append("Authorization", `Bearer ${config.tmdb.accessToken}`);
      const options: RequestInit = {
        method: "GET",
        headers: headers,
      };
      const request = await fetch(url, options);

      const response: MovieFetchResults =
        (await request.json()) as MovieFetchResults;
      if (response != null && response != undefined) {
        if (!response.movie_results && !response.tv_results) {
          return null;
        } else {
          if (response.tv_results.length > 0) {
            return response.tv_results[0];
          } else if (response.movie_results.length > 0) {
            return response.movie_results[0];
          } else {
            return null;
          }
        }
      } else {
        return null;
      }
    } catch (error) {
      this.app?.log.error(error);
      return null;
    }
  }
  private async findMediaDetails(
    id: number,
    type: "movie" | "tv" | string,
  ): Promise<MovieDetails | null> {
    try {
      const url = `${this.baseUrl}/${type}/${id}?language=en-US&append_to_response=external_ids`;
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${config.tmdb.accessToken}`,
        },
      };
      const request = await fetch(url, options);
      const response = (await request.json()) as MovieDetails;
      return {
        ...response,
        poster_path: this.getPoster(
          response.external_ids?.imdb_id || response.imdb_id,
        ),
      };
    } catch (error) {
      this.app?.log.error(error);
      return null;
    }
  }
  async findMedia(id: string): Promise<MovieDetails | null> {
    try {
      const shallow = await this.findMediaById(id);
      if (!shallow) {
        return null;
      }
      const [details] = await Promise.all([
        this.findMediaDetails(shallow.id, shallow.media_type),
      ]);
      if (details)
        return {
          ...details,
          mediad_type: shallow.media_type,
          poster_path: this.getPoster(details.imdb_id),
        };
      return null;
    } catch (error) {
      this.app?.log.error(error);
      return null;
    }
  }
  private getPoster(id: string): string {
    return `https://images.metahub.space/poster/small/${id}/img`;
  }
  private async searchMovie(
    query: string,
  ): Promise<MovieResult | undefined | null> {
    try {
      const url = `${this.baseUrl}/search/multi?query=${query}&include_adult=false&language=en-US&page=1`;
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${config.tmdb.accessToken}`,
        },
      };
      const request = await fetch(url, options);
      const response = (await request.json()) as {
        page: number;
        results: MovieResult[];
      };
      return response?.results?.at(0);
    } catch (error) {
      this.app?.log.error(error);
      return null;
    }
  }
  public async searchMovieDetails(query: string): Promise<MovieDetails | null> {
    try {
      const response = await this.searchMovie(query);
      if (!response) {
        return null;
      }
      const details = await this.findMediaDetails(
        response.id,
        response.media_type == "movie" ? "movie" : "tv",
      );
      return details;
    } catch (error) {
      this.app?.log.error(error);
      return null;
    }
  }
}

export default TMDBClient;
