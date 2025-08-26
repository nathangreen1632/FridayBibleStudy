import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface PrayerUpdateAttributes {
  id: number;
  prayerId: number;
  authorUserId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
export type PrayerUpdateCreation = Optional<PrayerUpdateAttributes, 'id'|'createdAt'|'updatedAt'>;

export class PrayerUpdate extends Model<PrayerUpdateAttributes, PrayerUpdateCreation> implements PrayerUpdateAttributes {
  declare id: number;
  declare prayerId: number;
  declare authorUserId: number;
  declare content: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof PrayerUpdate {
    PrayerUpdate.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        prayerId: { type: DataTypes.INTEGER, allowNull: false },
        authorUserId: { type: DataTypes.INTEGER, allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      { sequelize, tableName: 'prayerUpdates' }
    );
    return PrayerUpdate;
  }
}
