import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface GroupAttributes {
  id: number;
  name: string;
  slug: string;
  groupEmail: string;
  createdAt: Date;
  updatedAt: Date;
}
export type GroupCreation = Optional<GroupAttributes, 'id'|'createdAt'|'updatedAt'>;

export class Group extends Model<GroupAttributes, GroupCreation> implements GroupAttributes {
  declare id: number;
  declare name: string;
  declare slug: string;
  declare groupEmail: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Group {
    Group.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(160), allowNull: false },
        slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
        groupEmail: { type: DataTypes.STRING(180), allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      { sequelize, tableName: 'groups' }
    );
    return Group;
  }
}
