import { userRepository } from "../repositories/user.repository";
import { toUserResponse, isValidUserSexe } from "../models/mappers";
import { BadRequestError } from "../errors/AppError";
import bcrypt from "bcryptjs";

export class UserService {
  async list() {
    const users = await userRepository.listAll();
    return users.map(toUserResponse);
  }

  async stats() {
    return userRepository.countByRole();
  }

  async createAdmin(input: {
    email: string;
    password: string;
    name: string;
    telephone: string;
    sexe: string;
    picture?: string;
  }) {
    const { email, password, name, telephone, sexe } = input;
    if (!email || !password || !name || !telephone || !sexe) {
      throw new BadRequestError("Missing required fields");
    }
    if (!isValidUserSexe(sexe)) {
      throw new BadRequestError("Invalid sexe");
    }
    if (password.length < 6) {
      throw new BadRequestError("Password must be at least 6 characters");
    }

    const picture =
      input.picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A89F2&color=fff`;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      name: name.trim(),
      role: "admin",
      telephone: telephone.replace(/\s+/g, ""),
      sexe,
      picture,
    });
    return toUserResponse(user);
  }
}

export const userService = new UserService();
