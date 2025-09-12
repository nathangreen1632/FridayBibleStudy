import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

export interface EventAttributes {
  id: number;
  groupId: number;
  authorUserId: number;
  title: string;
  content: string;
  location?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  status: 'draft' | 'published';
  createdAt?: Date;
  updatedAt?: Date;
}
type Creation = Optional<EventAttributes, 'id' | 'location' | 'startsAt' | 'endsAt' | 'status'>;

export class Event extends Model<EventAttributes, Creation> implements EventAttributes {
  declare id: number; declare groupId: number; declare authorUserId: number;
  declare title: string; declare content: string;
  declare location: string | null; declare startsAt: Date | null; declare endsAt: Date | null;
  declare status: 'draft'|'published'; declare createdAt?: Date; declare updatedAt?: Date;

  static initModel(sequelize: Sequelize): typeof Event {
    Event.init({
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      groupId: { type: DataTypes.INTEGER, allowNull: false, field: 'group_id' },
      authorUserId: { type: DataTypes.INTEGER, allowNull: false, field: 'author_user_id' },
      title: { type: DataTypes.STRING(200), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      location: { type: DataTypes.STRING(200), allowNull: true },
      startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
      endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' },
      status: { type: DataTypes.ENUM('draft','published'), allowNull: false, defaultValue: 'published' },
      createdAt: DataTypes.DATE, updatedAt: DataTypes.DATE
    }, { sequelize, tableName: 'events' });
    return Event;
  }
}
