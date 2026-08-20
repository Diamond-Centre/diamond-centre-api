export function isInlineDataImageUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith("data:image/");
}

export function publicEventCoverPath(eventId: number): string {
  return `/api/events/${eventId}/cover`;
}

/** Replace huge data URLs in JSON with a small cover API path. */
export function resolvePublicEventImageUrl(
  eventId: number,
  imageUrl: string | null | undefined
): string | null {
  const raw = imageUrl?.trim();
  if (!raw) return null;
  if (isInlineDataImageUrl(raw)) return publicEventCoverPath(eventId);
  return raw;
}

export function parseInlineDataImage(
  dataUrl: string
): { mime: string; buffer: Buffer } | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mimeMatch = /^data:(image\/[a-z0-9.+-]+);base64$/i.exec(header);
  if (!mimeMatch) return null;
  try {
    const buffer = Buffer.from(payload, "base64");
    if (!buffer.length) return null;
    return { mime: mimeMatch[1], buffer };
  } catch {
    return null;
  }
}
