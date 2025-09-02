import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface CommentReadAttributes {
  prayerId: number;
  userId: number;
  lastSeenAt: Date;
}

export type CommentReadCreation = Optional<CommentReadAttributes, 'lastSeenAt'>;

export class CommentRead extends Model<CommentReadAttributes, CommentReadCreation>
  implements CommentReadAttributes {
  declare prayerId: number;
  declare userId: number;
  declare lastSeenAt: Date;

  static initModel(sequelize: Sequelize): typeof CommentRead {
    CommentRead.init(
      {
        prayerId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
        userId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
        lastSeenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      },
      { sequelize, tableName: 'comment_reads' }
    );
    return CommentRead;
  }
}
