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

  /** NEW: soft-unsubscribe flag (maps to users.email_paused) */
  emailPaused: boolean;

  // Roster additions
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  spouseName: string | null;

  createdAt: Date;
  updatedAt: Date;
}
export type UserCreation = Optional<
  UserAttributes,
  | 'id'
  | 'role'
  | 'emailVerified'
  | 'emailPaused'        // NEW: defaulted in DB, optional on create
  | 'addressStreet'
  | 'addressCity'
  | 'addressState'
  | 'addressZip'
  | 'spouseName'
  | 'createdAt'
  | 'updatedAt'
>;

export class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
  declare id: number;
  declare name: string;
  declare phone: string;
  declare email: string;
  declare passwordHash: string;
  declare role: Role;
  declare emailVerified: boolean;

  /** NEW */
  declare emailPaused: boolean;

  declare addressStreet: string | null;
  declare addressCity: string | null;
  declare addressState: string | null;
  declare addressZip: string | null;
  declare spouseName: string | null;

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

        /** NEW: maps to column "email_paused" */
        emailPaused: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'email_paused',
        },

        // Roster additions
        addressStreet: { type: DataTypes.STRING(180), allowNull: true },
        addressCity:   { type: DataTypes.STRING(120), allowNull: true },
        addressState:  { type: DataTypes.STRING(40),  allowNull: true },
        addressZip:    { type: DataTypes.STRING(20),  allowNull: true },
        spouseName:    { type: DataTypes.STRING(120), allowNull: true },

        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      { sequelize, tableName: 'users' }
    );
    return User;
  }
}
