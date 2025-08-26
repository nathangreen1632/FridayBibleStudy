import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface AttachmentAttributes {
  id: number;
  prayerId: number;
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}
export type AttachmentCreation = Optional<AttachmentAttributes, 'id'|'createdAt'|'updatedAt'>;

export class Attachment extends Model<AttachmentAttributes, AttachmentCreation> implements AttachmentAttributes {
  declare id: number;
  declare prayerId: number;
  declare filePath: string;
  declare fileName: string;
  declare mimeType: string;
  declare size: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Attachment {
    Attachment.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        prayerId: { type: DataTypes.INTEGER, allowNull: false },
        filePath: { type: DataTypes.STRING(260), allowNull: false },
        fileName: { type: DataTypes.STRING(200), allowNull: false },
        mimeType: { type: DataTypes.STRING(80), allowNull: false },
        size: { type: DataTypes.INTEGER, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      { sequelize, tableName: 'attachments' }
    );
    return Attachment;
  }
}
