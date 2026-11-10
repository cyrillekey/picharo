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
  types: ["movie", "series"],
  description: "Picharo better catalogsƒ",
  idPrefixes: ["tt"],
};

export function decodeSearchString<T>(searchString: string): T {
  const params = Object.fromEntries(
    [...new URLSearchParams(searchString)].map(([key, value]) => [
      key,
      value.trim() !== "" && !isNaN(Number(value)) ? Number(value) : value,
    ]),
  ) as T;
  return params;
}
