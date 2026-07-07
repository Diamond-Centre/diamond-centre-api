import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  getExpiresInSeconds,
} from "../utils/jwt";
import { userRepository } from "../repositories/user.repository";
import { toUserResponse, isValidUserRole } from "../models/mappers";
import {
  BadRequestError,
  UnauthorizedError,
} from "../errors/AppError";
import { LoginInput, RegisterInput } from "../types";

export class AuthService {
  async register(input: RegisterInput) {
    const { email, password, name, role } = input;

    if (!email || !password || !name || !role) {
      throw new BadRequestError("Missing required fields");
    }

    if (!isValidUserRole(role)) {
      throw new BadRequestError("Invalid role");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create(email, passwordHash, name, role);
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}

export const authService = new AuthService();
