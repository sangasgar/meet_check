import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { CreateUserCommand } from '../users/commands/create-user.command';
import { FindUserByEmailQuery } from '../users/queries/find-user-by-email.query';
import { User } from '../users/user.entity';

const BCRYPT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Неверный e-mail или пароль');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Неверный e-mail или пароль');
    }

    return this.issueTokens(user);
  }

  async register(email: string, password: string): Promise<AuthTokens> {
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new ConflictException('Пользователь с таким e-mail уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.commandBus.execute<CreateUserCommand, User>(
      new CreateUserCommand(email, passwordHash),
    );

    return this.issueTokens(user);
  }

  private findUserByEmail(email: string): Promise<User | null> {
    return this.queryBus.execute<FindUserByEmailQuery, User | null>(
      new FindUserByEmailQuery(email),
    );
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
