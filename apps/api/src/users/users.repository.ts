import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { User } from './user.entity';

export interface CreateUserData {
  email: string;
  passwordHash: string;
}

// Временное in-memory хранилище: будет заменено на Postgres-реализацию,
// интерфейс методов при этом сохранится.
@Injectable()
export class UsersRepository {
  private readonly users = new Map<string, User>();

  findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  create(data: CreateUserData): Promise<User> {
    const user: User = { id: randomUUID(), ...data };
    this.users.set(user.id, user);
    return Promise.resolve(user);
  }
}
