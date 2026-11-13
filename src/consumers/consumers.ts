import dayjs from "dayjs";
import type { EventHandlers } from "./events";

export const libraryConsumer: EventHandlers["library.event"] = async (
  app,
  args,
) => {
  try {
    const media = app.library.helpers.parseMovieId(args.videoId);
    let movieId: number;
    if (!media) {
      // pass
      app.log.warn(`${args.videoId} not valid media id for ingestion`);
    } else {
      const existsInDb = await app.library.db.orm.public.Movie.where({
        externalId: media.movieId,
      })
        .select("id")
        .first();
      if (!existsInDb?.id) {
        const details = await app.library.helpers.tmdb.findMedia(media.movieId);

        if (details) {
          const movie = await app.library.db.orm.public.Movie.create({
            externalId: details!.imdb_id ?? details?.external_ids?.imdb_id,
            averagevote: details.vote_average,
            description: details.overview,
            title: details.title ?? details.name,
            languages: details.spoken_languages.map((a) => a.english_name),
            mediaType: details.mediad_type ?? "movie",
            originalLanguage: details.original_language,
            popularity: details.popularity,
            release_date: dayjs(
              details.release_date ?? details.first_air_date ?? "",
            ).toDate(),
            id: details.id,
            poster: details.poster_path,
            voteCount: details.vote_count,
          });
          await app.library.db.orm.public.Genre.createAll(
            details.genres.map((a) => ({
              id: a.id,
              name: a.name,
            })),
            {
              onConflict: "skip",
            },
          );
          await app.library.db.orm.public.MovieGenre.createAll(
            details.genres.map((a) => ({
              genreId: a.id,
              movieId: movie.id,
            })),
          );
          movieId = movie.id;
        } else {
          return;
        }
      } else {
        movieId = existsInDb.id;
      }

      switch (args.args?.action) {
        case "watched":
          {
            // The latest entry is the watch currently in progress, if any.
            const currentWatch =
              await app.library.db.orm.public.WatchHistory.where({
                userId: args.userId,
                movieId,
              })
                .orderBy((a) => a.id.desc())
                .first();
            const now = new Date().toISOString();
            if (currentWatch?.status === "partial") {
              // Finish the watch that was already in progress.
              await app.library.db.orm.public.WatchHistory.whereUnique({
                id: currentWatch.id,
              }).update({
                status: "full",
                endDate: now,
              });
            } else {
              // Create the first watch, or a new entry when the user rewatches.
              await app.library.db.orm.public.WatchHistory.create({
                userId: args.userId,
                movieId: movieId,
                status: "full",
                startDate: now,
                endDate: now,
              });
            }
            // remove from watchlist if watched
            await app.library.db.orm.public.WatchList.whereUnique({
              movieId,
              userId: args.userId,
            }).delete();
          }
          break;
        case "unwatched":
          {
            const watched = await app.library.db.orm.public.WatchHistory.where({
              userId: args.userId,
            })
              .where((b) =>
                b.movie.every((b) => b.externalId.eq(media.movieId)),
              )
              .first();
            if (watched?.id) {
              await app.library.db.orm.public.WatchHistory.whereUnique({
                id: watched.id,
              }).delete();
            }
          }
          break;
        case "libraryAdd":
          {
            const recordExists =
              await app.library.db.orm.public.WatchList.whereUnique({
                userId: args.userId,
                movieId: movieId,
              }).first();
            if (!recordExists?.id) {
              await app.library.db.orm.public.WatchList.create({
                movieId,
                userId: args.userId,
              });
            }
          }
          break;
        case "libraryRemove":
          {
            const recordExists =
              await app.library.db.orm.public.WatchList.whereUnique({
                userId: args.userId,
                movieId: movieId,
              }).first();
            if (recordExists?.id) {
              await app.library.db.orm.public.WatchList.whereUnique({
                id: recordExists.id,
              }).delete();
            }
          }
          break;
        default:
          return;
      }
    }
  } catch (error) {
    app.log.error(error);
    return;
  }
};

export const playerConsumer: EventHandlers["player.event"] = async (
  app,
  payload,
) => {
  try {
    const media = app.library.helpers.parseMovieId(payload.videoId);
    if (!media) {
      app.log.warn(`Invalid media ID ${payload.videoId}`);
      return;
    }
    let movieId: number;
    const exists = await app.library.db.orm.public.Movie.whereUnique({
      externalId: media.movieId,
    }).first();
    if (exists?.id) {
      movieId = exists.id;
    } else {
      const details = await app.library.helpers.tmdb.findMedia(media.movieId);

      if (!details) {
        return;
      }
      const movie = await app.library.db.orm.public.Movie.create({
        externalId: details!.imdb_id ?? details?.external_ids?.imdb_id,
        averagevote: details.vote_average,
        description: details.overview,
        title: details.title,
        languages: details.spoken_languages.map((a) => a.english_name),
        mediaType: details.mediad_type ?? "movie",
        originalLanguage: details.original_language,
        popularity: details.popularity,
        release_date: dayjs(
          details.release_date ?? details.first_air_date ?? "",
        ).toDate(),
        id: details.id,
        poster: details.poster_path,
      });
      await app.library.db.orm.public.Genre.createAll(
        details.genres.map((a) => ({
          id: a.id,
          name: a.name,
        })),
        {
          onConflict: "skip",
        },
      );
      await app.library.db.orm.public.MovieGenre.createAll(
        details.genres.map((a) => ({
          genreId: a.id,
          movieId: movie.id,
        })),
      );
      movieId = movie.id;
    }
    const completeRatio =
      payload.args?.currentTime && payload.args?.duration
        ? payload.args.currentTime / payload.args.duration
        : 0;
    const latestRecord = await app.library.db.orm.public.WatchHistory.where({
      userId: payload.userId,
      movieId,
    })
      .orderBy((a) => a.id.desc())
      .first();

    // Ignore trailing events from a watch that has already been completed.
    if (latestRecord?.status === "full" && completeRatio > 0.95) {
      return;
    }

    let record = latestRecord;
    if (!record || record.status === "full") {
      // Start the first watch, or a new watch when the user rewatches.
      record = await app.library.db.orm.public.WatchHistory.create({
        watchedDuration: payload.args?.currentTime,
        duration: payload.args?.duration,
        movieId,
        userId: payload.userId,
        startDate: new Date().toISOString(),
        status: "partial",
      });
    } else {
      // Keep tracking the watch that is currently in progress.
      await app.library.db.orm.public.WatchHistory.whereUnique({
        id: record.id,
      }).update({
        watchedDuration: payload.args?.currentTime,
        duration: payload.args?.duration,
      });
    }

    switch (payload.args?.action) {
      case "start":
        if (completeRatio < 0.1) {
          // TODO: trigger start event
        }
        break;
      case "pause":
        await app.library.db.orm.public.WatchHistory.whereUnique({
          id: record.id,
        }).update({ pausecount: record.pausecount + 1 });
        break;
      case "stop":
        await app.events.queue.add("media.stop", {
          name: "media.stop",
          occurredAt: new Date().toISOString(),
          payload: { watchHistoryId: record.id },
        });
        break;
      default:
        return;
    }
  } catch (error) {
    app.log.error(error);
  }
};

export const mediaStopConsumer: EventHandlers["media.stop"] = async (
  app,
  payload,
) => {
  try {
    const watchHistory =
      await app.library.db.orm.public.WatchHistory.whereUnique({
        id: payload.watchHistoryId,
      }).first();
    if (!watchHistory || watchHistory.status === "full") {
      return;
    }
    const completeRatio =
      watchHistory.duration > 0
        ? watchHistory.watchedDuration / watchHistory.duration
        : 0;
    if (completeRatio > 0.95) {
      await app.library.db.orm.public.WatchHistory.whereUnique({
        id: watchHistory.id,
      }).update({
        status: "full",
        endDate: new Date().toISOString(),
      });
    }
  } catch (error) {
    app.log.error(error);
  }
};
