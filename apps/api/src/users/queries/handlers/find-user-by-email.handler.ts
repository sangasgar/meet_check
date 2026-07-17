import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { FindUserByEmailQuery } from '../find-user-by-email.query';
import { User } from '../../user.entity';
import { UsersRepository } from '../../users.repository';

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<FindUserByEmailQuery, User | null> {
  constructor(private readonly usersRepository: UsersRepository) {}

  execute(query: FindUserByEmailQuery): Promise<User | null> {
    return this.usersRepository.findByEmail(query.email);
  }
}
