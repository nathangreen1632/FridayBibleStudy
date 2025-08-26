import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface GroupMemberAttributes {
  id: number;
  userId: number;
  groupId: number;
  createdAt: Date;
  updatedAt: Date;
}
export type GroupMemberCreation = Optional<GroupMemberAttributes, 'id'|'createdAt'|'updatedAt'>;

export class GroupMember extends Model<GroupMemberAttributes, GroupMemberCreation> implements GroupMemberAttributes {
  declare id: number;
  declare userId: number;
  declare groupId: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof GroupMember {
    GroupMember.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        groupId: { type: DataTypes.INTEGER, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      { sequelize, tableName: 'groupMembers', indexes: [{ unique: true, fields: ['userId', 'groupId'] }] }
    );
    return GroupMember;
  }
}
