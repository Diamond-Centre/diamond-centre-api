import { userRepository } from "../repositories/user.repository";
import { toUserResponse, isValidUserSexe } from "../models/mappers";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../errors/AppError";
import bcrypt from "bcryptjs";
import { UpdateUserInput, UserRole } from "../types";

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
    // Regular admins only — never create another super_admin via API
    const user = await userRepository.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      name: name.trim(),
      role: "admin",
      telephone: telephone.replace(/\s+/g, ""),
      sexe,
      picture,
      authProvider: "local",
    });
    return toUserResponse(user);
  }

  async updateClient(id: number, input: UpdateUserInput) {
    return this.updateByRole(id, "client", input);
  }

  async updateAdmin(id: number, input: UpdateUserInput) {
    return this.updateByRole(id, "admin", input);
  }

  async deleteClient(id: number) {
    return this.deleteByRole(id, "client");
  }

  async deleteAdmin(id: number, actorId: number) {
    if (id === actorId) {
      throw new ForbiddenError("You cannot delete your own account");
    }

    const target = await userRepository.findById(id);
    if (!target || target.role !== "admin") {
      throw new NotFoundError("Admin not found");
    }

    await userRepository.deleteById(id);
    return { message: "Admin deleted" };
  }

  private async updateByRole(
    id: number,
    role: UserRole,
    input: UpdateUserInput
  ) {
    const existing = await userRepository.findByIdAndRole(id, role);
    if (!existing) {
      throw new NotFoundError(
        role === "admin" ? "Admin not found" : "Client not found"
      );
    }

    const patch: {
      email?: string;
      passwordHash?: string;
      name?: string;
      telephone?: string;
      sexe?: string;
      picture?: string;
    } = {};

    if (input.email !== undefined) {
      const email = String(input.email).trim().toLowerCase();
      if (!email) throw new BadRequestError("email cannot be empty");
      patch.email = email;
    }
    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) throw new BadRequestError("name cannot be empty");
      patch.name = name;
    }
    if (input.telephone !== undefined) {
      patch.telephone = String(input.telephone).replace(/\s+/g, "");
    }
    if (input.sexe !== undefined) {
      if (!isValidUserSexe(input.sexe)) {
        throw new BadRequestError("Invalid sexe");
      }
      patch.sexe = input.sexe;
    }
    if (input.picture !== undefined) {
      patch.picture = String(input.picture);
    }
    if (input.password !== undefined) {
      if (String(input.password).length < 6) {
        throw new BadRequestError("Password must be at least 6 characters");
      }
      patch.passwordHash = await bcrypt.hash(String(input.password), 10);
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestError("No fields to update");
    }

    const updated = await userRepository.update(id, patch);
    if (!updated) {
      throw new NotFoundError(
        role === "admin" ? "Admin not found" : "Client not found"
      );
    }
    return toUserResponse(updated);
  }

  private async deleteByRole(id: number, role: UserRole) {
    const existing = await userRepository.findByIdAndRole(id, role);
    if (!existing) {
      throw new NotFoundError(
        role === "admin" ? "Admin not found" : "Client not found"
      );
    }
    await userRepository.deleteById(id);
    return { message: role === "admin" ? "Admin deleted" : "Client deleted" };
  }
}

export const userService = new UserService();
