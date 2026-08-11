import { BadRequestError, UnauthorizedError } from "../errors/AppError";

export type OAuthProfile = {
  providerId: string;
  email: string;
  name: string;
  picture: string;
};

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
  error?: string;
  error_description?: string;
};

type FacebookMe = {
  id?: string;
  email?: string;
  name?: string;
  picture?: { data?: { url?: string } };
  error?: { message?: string };
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new UnauthorizedError("Invalid social token");
  }
  return data;
}

/** Verify Google ID token (mobile / web SDK) via tokeninfo. */
export async function verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
  const data = await fetchJson<GoogleTokenInfo>(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (data.error || !data.sub || !data.email) {
    throw new UnauthorizedError(
      data.error_description || data.error || "Invalid Google token"
    );
  }

  const clientIds = String(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (clientIds.length > 0 && data.aud && !clientIds.includes(data.aud)) {
    throw new UnauthorizedError("Google token audience mismatch");
  }

  const verified =
    data.email_verified === true || data.email_verified === "true";
  if (!verified) {
    throw new UnauthorizedError("Google email not verified");
  }

  return {
    providerId: data.sub,
    email: data.email.toLowerCase(),
    name: data.name || data.email.split("@")[0],
    picture:
      data.picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.email)}&background=0A89F2&color=fff`,
  };
}

/** Verify Google access token via userinfo. */
export async function verifyGoogleAccessToken(
  accessToken: string
): Promise<OAuthProfile> {
  const data = await fetchJson<{
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    error?: string;
  }>("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (data.error || !data.sub || !data.email) {
    throw new UnauthorizedError("Invalid Google access token");
  }
  if (data.email_verified === false) {
    throw new UnauthorizedError("Google email not verified");
  }

  return {
    providerId: data.sub,
    email: data.email.toLowerCase(),
    name: data.name || data.email.split("@")[0],
    picture:
      data.picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.email)}&background=0A89F2&color=fff`,
  };
}

/** Verify Facebook user access token via Graph API. */
export async function verifyFacebookAccessToken(
  accessToken: string
): Promise<OAuthProfile> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  let url =
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`;

  if (appId && appSecret) {
    // Optional debug_token check for app ownership
    const debug = await fetchJson<{
      data?: { is_valid?: boolean; app_id?: string };
    }>(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`
    );
    if (!debug.data?.is_valid || (debug.data.app_id && debug.data.app_id !== appId)) {
      throw new UnauthorizedError("Invalid Facebook token");
    }
  }

  const data = await fetchJson<FacebookMe>(url);

  if (data.error || !data.id) {
    throw new UnauthorizedError(data.error?.message || "Invalid Facebook token");
  }

  if (!data.email) {
    throw new BadRequestError(
      "Facebook account has no email. Grant email permission or use another login method."
    );
  }

  return {
    providerId: data.id,
    email: data.email.toLowerCase(),
    name: data.name || data.email.split("@")[0],
    picture:
      data.picture?.data?.url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.email)}&background=0A89F2&color=fff`,
  };
}
