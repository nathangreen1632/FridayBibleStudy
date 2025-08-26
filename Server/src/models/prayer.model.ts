import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import type { AttachmentAttributes } from './attachment.model.js';
import type { PrayerUpdateAttributes } from './prayerUpdate.model.js';

export type Category = 'prayer' | 'long-term' | 'salvation' | 'pregnancy' | 'birth';
export type Status = 'active' | 'main' | 'archived';

export interface PrayerAttributes {
  id: number;
  groupId: number;
  authorUserId: number;
  title: string;
  content: string;
  category: Category;
  status: Status;
  position: number;
  impersonatedByAdminId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
export type PrayerCreation = Optional<PrayerAttributes, 'id'|'status'|'position'|'impersonatedByAdminId'|'createdAt'|'updatedAt'>;

export class Prayer extends Model<PrayerAttributes, PrayerCreation> implements PrayerAttributes {
  declare id: number;
  declare groupId: number;
  declare authorUserId: number;
  declare title: string;
  declare content: string;
  declare category: Category;
  declare status: Status;
  declare position: number;
  declare impersonatedByAdminId: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare attachments?: AttachmentAttributes[];
  declare updates?: PrayerUpdateAttributes[];

  static initModel(sequelize: Sequelize): typeof Prayer {
    Prayer.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        groupId: { type: DataTypes.INTEGER, allowNull: false },
        authorUserId: { type: DataTypes.INTEGER, allowNull: false },
        title: { type: DataTypes.STRING(200), allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: false },
        category: { type: DataTypes.ENUM('prayer','long-term','salvation','pregnancy','birth'), allowNull: false },
        status: { type: DataTypes.ENUM('active','main','archived'), allowNull: false, defaultValue: 'active' },
        position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        impersonatedByAdminId: { type: DataTypes.INTEGER, allowNull: true },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      { sequelize, tableName: 'prayers' }
    );
    return Prayer;
  }
}
