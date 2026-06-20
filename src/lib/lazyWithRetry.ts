import { lazy, ComponentType } from "react";

type ComponentModule = { default: ComponentType<any> };

const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "ChunkLoadError",
  "Importing a module script failed",
  "Loading chunk",
  "Loading CSS chunk",
];

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export function lazyWithRetry(
  importer: () => Promise<ComponentModule>,
  moduleId?: string
) {
  const key = `lazy-retry:${moduleId ?? importer.toString().slice(0, 64)}`;

  return lazy(() =>
    importer().then(
      (module) => {
        // Successful load — clear any previous retry guard
        sessionStorage.removeItem(key);
        return module;
      },
      (error) => {
        if (!isChunkLoadError(error)) throw error;

        // If we already reloaded once for this chunk, don't loop — let ErrorBoundary handle it
        if (sessionStorage.getItem(key)) {
          sessionStorage.removeItem(key);
          throw error;
        }

        // Set guard and hard-reload so the browser fetches fresh index.html + chunks
        sessionStorage.setItem(key, "1");
        window.location.reload();

        // Return a never-resolving promise to prevent React from rendering stale tree
        return new Promise<ComponentModule>(() => {});
      }
    )
  );
}
