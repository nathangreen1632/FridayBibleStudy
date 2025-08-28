import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface PrayerParticipantAttributes {
  id: number;
  prayerId: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PrayerParticipantCreation = Optional<
  PrayerParticipantAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

export class PrayerParticipant
  extends Model<PrayerParticipantAttributes, PrayerParticipantCreation>
  implements PrayerParticipantAttributes
{
  declare id: number;
  declare prayerId: number;
  declare userId: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof PrayerParticipant {
    PrayerParticipant.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        prayerId: { type: DataTypes.INTEGER, allowNull: false },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'prayerParticipants',
        indexes: [{ unique: true, fields: ['prayerId', 'userId'] }]
      }
    );
    return PrayerParticipant;
  }
}
