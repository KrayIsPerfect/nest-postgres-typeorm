import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import User from './user.entity';
import CreateUserDto from './dto/users.create.dto';
import { FilesService } from '../files/files.service';
import { PrivateFilesService } from '../privateFiles/privateFiles.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @Inject(Connection)
    private readonly connection: Connection,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(FilesService)
    private readonly filesService: FilesService,
    @Inject(PrivateFilesService)
    private readonly privateFilesService: PrivateFilesService,
  ) {}

  async getByEmail(email: string) {
    const user = await this.usersRepository.findOne({ email });
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this email does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async getById(id: number) {
    const user = await this.usersRepository.findOne({ id });
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async create(userData: CreateUserDto) {
    const newUser = await this.usersRepository.create(userData);
    await this.usersRepository.save(newUser);
    return newUser;
  }

  async addAvatar(userId: number, imageBuffer: Buffer, filename: string) {
    const queryRunner = this.connection.createQueryRunner();

    const user = await this.getById(userId);

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (user.avatar) {
        await this.usersRepository.update(userId, {
          ...user,
          avatar: null,
        });
        await this.filesService.deletePublicFileWithQueryRunner(
          user.avatar.id,
          queryRunner,
        );
      }
      const avatar = await this.filesService.uploadPublicFile(
        imageBuffer,
        filename,
      );
      await this.usersRepository.update(userId, {
        ...user,
        avatar,
      });
      await queryRunner.commitTransaction();
      return avatar;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAvatar(userId: number) {
    const queryRunner = this.connection.createQueryRunner();

    const user = await this.getById(userId);
    const fileId = user.avatar?.id;
    if (fileId) {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.manager.update(User, userId, {
          ...user,
          avatar: null,
        });
        await this.filesService.deletePublicFileWithQueryRunner(
          fileId,
          queryRunner,
        );
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException();
      } finally {
        await queryRunner.release();
      }
    }
  }

  async addPrivateFile(userId: number, imageBuffer: Buffer, filename: string) {
    return this.privateFilesService.uploadPrivateFile(
      imageBuffer,
      userId,
      filename,
    );
  }

  async getPrivateFile(userId: number, fileId: number) {
    const file = await this.privateFilesService.getPrivateFile(fileId);
    if (file.info.owner.id === userId) {
      return file;
    }
    throw new UnauthorizedException();
  }

  async getAllPrivateFiles(userId: number) {
    const userWithFiles = await this.usersRepository.findOne(
      { id: userId },
      { relations: ['files'] },
    );
    if (userWithFiles) {
      return Promise.all(
        userWithFiles.files.map(async (file) => {
          const url = await this.privateFilesService.generatePresignedUrl(
            file.key,
          );
          return {
            ...file,
            url,
          };
        }),
      );
    }
    throw new NotFoundException('User with this id does not exist');
  }

  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, {
      currentHashedRefreshToken,
    });
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
    const user = await this.getById(userId);

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.currentHashedRefreshToken,
    );

    if (isRefreshTokenMatching) {
      return user;
    }
  }

  async removeRefreshToken(userId: number) {
    return this.usersRepository.update(userId, {
      currentHashedRefreshToken: null,
    });
  }
}
