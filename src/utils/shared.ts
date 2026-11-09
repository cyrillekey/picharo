export const baseManifest = {
  id: "org.picharo.stremio",
  name: "Picharo addon",
  version: "1.0.4",
  logo: "",
  // background: appConfig.background,
  contactEmail: "cyrilleodev@gmail.com",
  behaviorHints: {
    configurable: true,
    epgProvider: true,
    configurationRequired: true,
  },
  catalogs: [],
  resources: ["catalog", "library", "player"],
  types: ["catalog"],
  description: "Picharo better catalogsƒ",
};
