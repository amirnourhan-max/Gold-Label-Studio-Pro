import type { UserRepository } from "../../repositories/user-repository";
import type { CreateUserInput, UpdateUserInput, UserPasswordInput } from "../../types/persistence";
import type { AuthGateway } from "./auth-service";
import type { UserGateway } from "./user-contract";

/** Persists users through UserRepository; no SQL lives outside the repository. */
export class PersistenceUserGateway implements UserGateway, AuthGateway {
  constructor(private readonly repository: UserRepository) {}

  list() {
    return this.repository.listAll();
  }

  findByUsername(username: string) {
    return this.repository.findByUsername(username);
  }

  findById(id: string) {
    return this.repository.findById(id);
  }

  async create(input: CreateUserInput): Promise<void> {
    await this.repository.create(input);
  }

  async update(input: UpdateUserInput): Promise<void> {
    await this.repository.update(input);
  }

  async setActive(id: string, isActive: boolean, updatedAt: string): Promise<void> {
    await this.repository.setActive(id, isActive, updatedAt);
  }

  async setPassword(input: UserPasswordInput): Promise<void> {
    await this.repository.setPassword(input);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.repository.softDelete(id, deletedAt);
  }
}
