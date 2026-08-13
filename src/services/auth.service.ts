import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  getExpiresInSeconds,
} from "../utils/jwt";
import { userRepository } from "../repositories/user.repository";
import {
  toUserResponse,
  isValidUserSexe,
} from "../models/mappers";
import { BadRequestError, UnauthorizedError } from "../errors/AppError";
import {
  AuthProvider,
  LoginInput,
  RegisterInput,
  SessionContext,
  SocialAuthInput,
  UserRecord,
} from "../types";
import { sessionRepository } from "../repositories/session.repository";
import {
  verifyFacebookAccessToken,
  verifyGoogleAccessToken,
  verifyGoogleIdToken,
  OAuthProfile,
} from "./oauth.service";

async function authTokens(user: UserRecord, ctx: SessionContext = {}) {
  const session = await sessionRepository.create({
    userId: user.id,
    userAgent: ctx.userAgent || "",
    ip: ctx.ip || null,
    expiresAt: new Date(Date.now() + getExpiresInSeconds() * 1000),
  });
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    sid: session.id,
  };
  return {
    access_token: signAccessToken(payload),
    refresh_token: signRefreshToken(payload),
    expires_in: getExpiresInSeconds(),
    user: toUserResponse(user),
  };
}

function defaultAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name.trim() || "User"
  )}&background=0a89f2&color=fff&size=128`;
}

export class AuthService {
  async register(input: RegisterInput, ctx: SessionContext = {}) {
    const { email, password, name, telephone, sexe } = input;

    if (!email || !password || !name || !telephone || !sexe) {
      throw new BadRequestError("Missing required fields");
    }

    // Public registration is always client — never admin / super_admin
    if (input.role && input.role !== "client") {
      throw new BadRequestError(
        "Public registration only creates client accounts. Contact a super admin for admin access."
      );
    }

    if (password.length < 6) {
      throw new BadRequestError("Password must be at least 6 characters");
    }

    if (!isValidUserSexe(sexe)) {
      throw new BadRequestError("Invalid sexe");
    }

    const picture =
      input.picture && input.picture.trim()
        ? input.picture.trim()
        : defaultAvatar(name);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      name: name.trim(),
      role: "client",
      telephone: telephone.replace(/\s+/g, ""),
      sexe,
      picture,
      authProvider: "local",
    });
    // Same shape as login so the client can enter their space immediately
    return authTokens(user, ctx);
  }

  async login(input: LoginInput, ctx: SessionContext = {}) {
    const { email, password } = input;

    if (!email || !password) {
      throw new BadRequestError("Email and password required");
    }

    const user = await userRepository.findByEmail(email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    return authTokens(user, ctx);
  }

  async authGoogle(input: SocialAuthInput, ctx: SessionContext = {}) {
    const token = String(input.id_token || input.access_token || "").trim();
    if (!token) {
      throw new BadRequestError("id_token or access_token is required");
    }

    const profile = input.id_token
      ? await verifyGoogleIdToken(token)
      : await verifyGoogleAccessToken(token);

    return this.socialLogin("google", profile, input, ctx);
  }

  async authFacebook(input: SocialAuthInput, ctx: SessionContext = {}) {
    const accessToken = String(input.access_token || "").trim();
    if (!accessToken) {
      throw new BadRequestError("access_token is required");
    }

    const profile = await verifyFacebookAccessToken(accessToken);
    return this.socialLogin("facebook", profile, input, ctx);
  }

  private async socialLogin(
    provider: AuthProvider,
    profile: OAuthProfile,
    input: SocialAuthInput,
    ctx: SessionContext = {}
  ) {
    if (input.sexe && !isValidUserSexe(input.sexe)) {
      throw new BadRequestError("Invalid sexe");
    }

    let user = await userRepository.findByProvider(
      provider,
      profile.providerId
    );

    if (!user) {
      const byEmail = await userRepository.findByEmail(profile.email);
      if (byEmail) {
        // Do not silently take over email/password accounts
        if (
          byEmail.auth_provider === "local" ||
          (byEmail.password_hash && !byEmail.provider_id)
        ) {
          throw new BadRequestError(
            "An account with this email already exists. Log in with email and password."
          );
        }
        if (
          byEmail.auth_provider !== provider ||
          byEmail.provider_id !== profile.providerId
        ) {
          throw new BadRequestError(
            `This email is already linked to ${byEmail.auth_provider} login`
          );
        }
        user = byEmail;
      }
    }

    if (user) {
      const patch: {
        name?: string;
        picture?: string;
        telephone?: string;
        sexe?: string;
      } = {};

      if (profile.name && profile.name !== user.name) patch.name = profile.name;
      if (profile.picture) patch.picture = profile.picture;
      if (input.telephone) patch.telephone = input.telephone.replace(/\s+/g, "");
      if (input.sexe) patch.sexe = input.sexe;

      if (Object.keys(patch).length > 0) {
        user = (await userRepository.update(user.id, patch)) ?? user;
      }

      return authTokens(user, ctx);
    }

    const name = profile.name;
    const userCreated = await userRepository.create({
      email: profile.email,
      passwordHash: null,
      name,
      role: "client",
      telephone: input.telephone?.replace(/\s+/g, "") || "",
      sexe: input.sexe || "homme",
      picture: profile.picture,
      authProvider: provider,
      providerId: profile.providerId,
    });

    return authTokens(userCreated, ctx);
  }
}

export const authService = new AuthService();
