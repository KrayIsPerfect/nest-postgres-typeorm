import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import User from './user.entity';
import { FilesModule } from '../files/files.module';
import { PrivateFilesModule } from '../privateFiles/privateFiles.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), FilesModule, PrivateFilesModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
