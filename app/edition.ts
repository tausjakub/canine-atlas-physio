// Build-time edition flags. vite.config.ts always defines both values, so a
// production build only includes the private book library when the build
// script explicitly opts in (ATLAS_LIBRARY=1). Node-based validators run
// without the define and therefore exercise the full feature set.

/** Private PDF reading library and links into it. Never on in the public demo. */
export const libraryEnabled = process.env.NEXT_PUBLIC_ATLAS_LIBRARY !== '0';

/** Build served behind the authentication Worker (shows the logout control). */
export const privateEdition = process.env.NEXT_PUBLIC_ATLAS_PRIVATE !== '0';
