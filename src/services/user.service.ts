import { userRepository } from "../repositories/user.repository";
import { sessionRepository } from "../repositories/session.repository";
import { toUserResponse, isValidUserSexe } from "../models/mappers";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/AppError";
import bcrypt from "bcryptjs";
import { UpdateUserInput, UserRole } from "../types";

export class UserService {
  async list() {
    const users = await userRepository.listAll();
    return users.map(toUserResponse);
  }

  async getById(id: number) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return toUserResponse(user);
  }

  async stats() {
    return userRepository.countByRole();
  }

  /** Self-service profile update (no password — that is super_admin only). */
  async updateMe(
    userId: number,
    input: {
      name?: string;
      telephone?: string;
      sexe?: string;
      picture?: string;
      password?: string;
    }
  ) {
    if (input.password !== undefined) {
      throw new ForbiddenError(
        "Only a super admin can change a password. Use the password endpoint."
      );
    }

    const existing = await userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const patch: {
      name?: string;
      telephone?: string;
      sexe?: string;
      picture?: string;
    } = {};

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

    if (Object.keys(patch).length === 0) {
      throw new BadRequestError("No fields to update");
    }

    const updated = await userRepository.update(userId, patch);
    if (!updated) {
      throw new NotFoundError("User not found");
    }
    return toUserResponse(updated);
  }

  /** Client self-service account deletion (admins use admin routes). */
  async deleteMe(userId: number) {
    const existing = await userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError("User not found");
    }
    if (existing.role !== "client") {
      throw new ForbiddenError(
        "Admin accounts cannot be deleted from this endpoint"
      );
    }

    const deleted = await userRepository.deleteById(userId);
    if (!deleted) {
      throw new NotFoundError("User not found");
    }
    return { message: "Account deleted" };
  }

  /** Self-service password change for any authenticated user. */
  async changeMyPassword(
    userId: number,
    input: { current_password?: string; new_password?: string },
    currentSid?: string
  ) {
    const currentPassword = input.current_password;
    const newPassword = input.new_password;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError("current_password and new_password are required");
    }
    if (String(newPassword).length < 6) {
      throw new BadRequestError("Password must be at least 6 characters");
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    if (!user.password_hash) {
      throw new BadRequestError("This account has no local password");
    }

    const valid = await bcrypt.compare(String(currentPassword), user.password_hash);
    if (!valid) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await userRepository.update(userId, { passwordHash });
    if (currentSid) {
      await sessionRepository.revokeOthers(userId, currentSid);
    } else {
      await sessionRepository.revokeAll(userId);
    }
    return { message: "Password updated" };
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
      const password = String(input.password);
      if (!password.trim()) {
        throw new BadRequestError("Password must be at least 6 characters");
      }
      if (password.length < 6) {
        throw new BadRequestError("Password must be at least 6 characters");
      }
      patch.passwordHash = await bcrypt.hash(password, 10);
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
    if (patch.passwordHash) {
      try {
        await sessionRepository.revokeAll(id);
      } catch (error) {
        console.error(
          "[users] Failed to revoke sessions after password update",
          error
        );
      }
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
