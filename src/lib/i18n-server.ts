/**
 * Server-only i18n facade: eagerly registers every dictionary so the sync
 * server APIs (`createT`/`resolveLabelFor`) resolve any UI language with the
 * exact same output as before the lazy-loading split.
 *
 * NEVER import this module from client components or from shared
 * client/server modules (`poster-config`, `poster-url`, `badge-priority`,
 * `stremio-poster-url`, ...): the static JSON imports below would drag all
 * dictionaries back into the client bundle. Only server route entry points
 * import from here; everything else imports from "./i18n".
 *
 * No `server-only` package import: the package is not a dependency, and a
 * bare import would fail typecheck/build. The boundary is enforced by the
 * import graph (this file is reachable only from `src/app/api/**` routes).
 */
import { registerDictionary, type Dictionary } from "./i18n"
import en from "./translations/en.json"

const all: Record<string, Dictionary> = {
  en,
}

for (const [lang, dict] of Object.entries(all)) registerDictionary(lang, dict)

export * from "./i18n"
