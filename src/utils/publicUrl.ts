import { AsyncLocalStorage } from "async_hooks";

const store = new AsyncLocalStorage<{ baseUrl: string }>();

export function runWithPublicBaseUrl<T>(baseUrl: string, fn: () => T): T {
  return store.run({ baseUrl: baseUrl.replace(/\/$/, "") }, fn);
}

export function getPublicBaseUrl(): string {
  const fromContext = store.getStore()?.baseUrl;
  if (fromContext) {
    return fromContext;
  }

  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}

/** Turn relative media paths into absolute URLs; leave http(s) unchanged. */
export function toPublicUrl(url: string | null | undefined): string | null {
  if (url == null || url === "") {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${getPublicBaseUrl()}${path}`;
}
