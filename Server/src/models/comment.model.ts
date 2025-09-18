import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface CommentAttributes {
  id: number;
  prayerId: number;
  parentId: number | null;
  threadRootId: number | null;
  depth: number;
  authorId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export type CommentCreation = Optional<
  CommentAttributes,
  'id' | 'parentId' | 'threadRootId' | 'depth' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export class Comment extends Model<CommentAttributes, CommentCreation> implements CommentAttributes {
  declare id: number;
  declare prayerId: number;
  declare parentId: number | null;
  declare threadRootId: number | null;
  declare depth: number;
  declare authorId: number;
  declare content: string;
  declare createdAt: Date;
  declare updatedAt: Date | null;
  declare deletedAt: Date | null;

  static initModel(sequelize: Sequelize): typeof Comment {
    Comment.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        prayerId: { type: DataTypes.INTEGER, allowNull: false },
        parentId: { type: DataTypes.INTEGER, allowNull: true },
        threadRootId: { type: DataTypes.INTEGER, allowNull: true },
        depth: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        authorId: { type: DataTypes.INTEGER, allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: true },
        deletedAt: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        tableName: 'comments',
        indexes: [
          { fields: ['prayerId', 'createdAt'] },
          { fields: ['threadRootId', 'createdAt'] },
        ],
        paranoid: false,
      }
    );
    return Comment;
  }
}
