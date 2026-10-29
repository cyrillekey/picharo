import { Manifest } from "stremio-addon-sdk";
const baseManifest: Manifest = {
  id: "community.picharo.stremio",
  name: "Picharo",
  catalogs: [],
  resources: ["player", "library"],
  types: ["movie", "series", "channel", "tv"],
  idPrefixes: ["picharo", "tt"],
  version: "0.0.1-alpha.1",
  description: "Picharo",
};

export default baseManifest;
