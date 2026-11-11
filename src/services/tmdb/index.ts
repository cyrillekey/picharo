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
      const [details, poster] = await Promise.all([
        this.findMediaDetails(shallow.id, shallow.media_type),
        this.privateGetPoster(id, shallow.media_type),
      ]);
      if (details)
        return {
          ...details,
          mediad_type: shallow.media_type,
          poster_path: poster,
        };
      return null;
    } catch (error) {
      this.app?.log.error(error);
      return null;
    }
  }
  async privateGetPoster(id: string, mediaType: string) {
    try {
      const type = mediaType == "tv" ? "series" : "movie";
      const url = `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`;
      const request = await fetch(url);
      const response = (await request.json()) as Record<
        string,
        Record<string, string>
      >;
      const poster = response?.meta?.poster;
      return poster;
    } catch (error) {
      this.app?.log.error(error);
      return null;
    }
  }
}

export default TMDBClient;
