import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type Role = 'classic' | 'admin';

export interface UserAttributes {
  id: number;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export type UserCreation = Optional<UserAttributes, 'id'|'role'|'emailVerified'|'createdAt'|'updatedAt'>;

export class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
  declare id: number;
  declare name: string;
  declare phone: string;
  declare email: string;
  declare passwordHash: string;
  declare role: Role;
  declare emailVerified: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(120), allowNull: false },
        phone: { type: DataTypes.STRING(24), allowNull: false },
        email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
        passwordHash: { type: DataTypes.STRING(200), allowNull: false },
        role: { type: DataTypes.ENUM('classic', 'admin'), allowNull: false, defaultValue: 'classic' },
        emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      { sequelize, tableName: 'users' }
    );
    return User;
  }
}
