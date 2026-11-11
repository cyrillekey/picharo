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
            externalId: details!.imdb_id,
            averagevote: details.vote_average,
            description: details.overview,
            title: details.title,
            languages: details.spoken_languages.map((a) => a.english_name),
            mediaType: details.mediad_type ?? "movie",
            originalLanguage: details.original_language,
            popularity: details.popularity,
            releaseDate: details.release_date,
            id: details.id,
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
            // chekc if history exits
            const watched =
              await app.library.db.orm.public.WatchHistory.whereUnique({
                userId: args.userId,
                movieId,
              }).first();
            if (watched) {
              if (watched.status == "full") {
                return;
              } else {
                await app.library.db.orm.public.WatchHistory.whereUnique({
                  id: watched.id,
                }).update({
                  status: "full",
                  endDate: new Date().toISOString(),
                });
              }
            } else {
              await app.library.db.orm.public.WatchHistory.create({
                userId: args.userId,
                movieId: movieId,
                status: "full",
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
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
        externalId: details!.imdb_id,
        averagevote: details.vote_average,
        description: details.overview,
        title: details.title,
        languages: details.spoken_languages.map((a) => a.english_name),
        mediaType: details.mediad_type ?? "movie",
        originalLanguage: details.original_language,
        popularity: details.popularity,
        releaseDate: details.release_date,
        id: details.id,
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
    const record = await app.library.db.orm.public.WatchHistory.upsert({
      create: {
        watchedDuration: payload.args?.currentTime,
        duration: payload.args?.duration,
        movieId,
        userId: payload.userId,
        startDate: new Date().toISOString(),
        status: "partial",
      },
      update: {
        watchedDuration: payload.args?.currentTime,
        duration: payload.args?.duration,
      },
      conflictOn: { movieId: movieId, userId: payload.userId },
    });
    switch (payload.args?.action) {
      case "start":
        break;
      case "pause":
        await app.library.db.orm.public.WatchHistory.where({
          id: record.id,
        }).update({ pausecount: record.pausecount + 1 });
        break;
      case "stop":
        {
          const completeRatio =
            payload.args.currentTime && payload.args.duration
              ? payload.args.currentTime / payload.args.duration
              : 0;
          if (completeRatio > 0.95) {
            // TODO: trigger completed event
          }
        }
        break;
      default:
        return;
    }
    const completeRatio =
      payload.args.currentTime && payload.args.duration
        ? payload.args.currentTime / payload.args.duration
        : 0;
    if (completeRatio > 0.95) {
      // TODO: trigger watch complete event
    }
  } catch (error) {
    app.log.error(error);
  }
};
