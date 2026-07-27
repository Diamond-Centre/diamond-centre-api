import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  getExpiresInSeconds,
} from "../utils/jwt";
import { userRepository } from "../repositories/user.repository";
import {
  toUserResponse,
  isValidUserRole,
  isValidUserSexe,
} from "../models/mappers";
import {
  BadRequestError,
  UnauthorizedError,
} from "../errors/AppError";
import { LoginInput, RegisterInput } from "../types";

export class AuthService {
  async register(input: RegisterInput) {
    const { email, password, name, role, telephone, sexe, picture } = input;

    if (!email || !password || !name || !role || !telephone || !sexe || !picture) {
      throw new BadRequestError("Missing required fields");
    }

    if (!isValidUserRole(role)) {
      throw new BadRequestError("Invalid role");
    }

    if (!isValidUserSexe(sexe)) {
      throw new BadRequestError("Invalid sexe");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      email,
      passwordHash,
      name,
      role,
      telephone,
      sexe,
      picture,
    });
    return toUserResponse(user);
  }

  async login(input: LoginInput) {
    const { email, password } = input;

    if (!email || !password) {
      throw new BadRequestError("Email and password required");
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const payload = { id: user.id, email: user.email, role: user.role };

    return {
      access_token: signAccessToken(payload),
      refresh_token: signRefreshToken(payload),
      expires_in: getExpiresInSeconds(),
      user: toUserResponse(user),
    };
  }
}

export const authService = new AuthService();
