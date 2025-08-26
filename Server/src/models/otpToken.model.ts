import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface OtpTokenAttributes {
  id: number;
  userId: number;
  otpHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
export type OtpTokenCreation = Optional<OtpTokenAttributes, 'id'|'createdAt'|'updatedAt'>;

export class OtpToken extends Model<OtpTokenAttributes, OtpTokenCreation> implements OtpTokenAttributes {
  declare id: number;
  declare userId: number;
  declare otpHash: string;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof OtpToken {
    OtpToken.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        otpHash: { type: DataTypes.STRING(200), allowNull: false },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      { sequelize, tableName: 'otpTokens' }
    );
    return OtpToken;
  }
}
