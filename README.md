# Getting Started with [Fastify-CLI](https://www.npmjs.com/package/fastify-cli)
This project was bootstrapped with Fastify-CLI.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

To start the app in dev mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm start`

For production mode

### `npm run test`

Run the test cases.

## Docker

Build the image locally:

```sh
docker build -t picharo .
```

Run it (requires a PostgreSQL database):

```sh
docker run --rm -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:password@host:5432/mydb" \
  picharo
```

### Automated Docker Hub releases

The [`docker-publish.yml`](.github/workflows/docker-publish.yml) workflow builds
and pushes a multi-arch image (`linux/amd64`, `linux/arm64`) on every push to
`main`, on `v*.*.*` tags, and on manual dispatch. Pull requests build the image
without pushing it.

Add these repository secrets under **Settings → Secrets and variables → Actions**.
For production-scoped secrets and protection rules, create an environment named
`production` under **Settings → Environments** and add the secrets there instead
(the workflow attaches the publish job to this environment):

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | A Docker Hub access token with Read & Write permissions |

The image is published as `<DOCKERHUB_USERNAME>/picharo`, with `latest` tracking
`main`, branch/SHA tags for every commit, and semver tags for releases.

## Learn More

To learn Fastify, check out the [Fastify documentation](https://fastify.dev/docs/latest/).
