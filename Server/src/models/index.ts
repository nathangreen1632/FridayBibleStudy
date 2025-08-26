import { Sequelize } from 'sequelize';
import { sequelize } from '../config/sequelize.config.js';
import { User } from './user.model.js';
import { Group } from './group.model.js';
import { GroupMember } from './groupMember.model.js';
import { Prayer } from './prayer.model.js';
import { PrayerUpdate } from './prayerUpdate.model.js';
import { Attachment } from './attachment.model.js';
import { OtpToken } from './otpToken.model.js';

function initAll(s: Sequelize): void {
  User.initModel(s);
  Group.initModel(s);
  GroupMember.initModel(s);
  Prayer.initModel(s);
  PrayerUpdate.initModel(s);
  Attachment.initModel(s);
  OtpToken.initModel(s);

  // associations
  GroupMember.belongsTo(User, { foreignKey: 'userId' });
  GroupMember.belongsTo(Group, { foreignKey: 'groupId' });
  User.hasMany(GroupMember, { foreignKey: 'userId' });
  Group.hasMany(GroupMember, { foreignKey: 'groupId' });

  Prayer.belongsTo(User, { foreignKey: 'authorUserId', as: 'author' });
  Prayer.belongsTo(Group, { foreignKey: 'groupId' });
  Prayer.hasMany(PrayerUpdate, { foreignKey: 'prayerId', as: 'updates' });
  Prayer.hasMany(Attachment, { foreignKey: 'prayerId', as: 'attachments' });

  PrayerUpdate.belongsTo(Prayer, { foreignKey: 'prayerId' });
  PrayerUpdate.belongsTo(User, { foreignKey: 'authorUserId', as: 'author' });

  Attachment.belongsTo(Prayer, { foreignKey: 'prayerId' });

  OtpToken.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(OtpToken, { foreignKey: 'userId' });
}

initAll(sequelize);

export {
  sequelize,
  User,
  Group,
  GroupMember,
  Prayer,
  PrayerUpdate,
  Attachment,
  OtpToken
};

export async function ensureDatabase(): Promise<void> {
  await sequelize.sync({ alter: true }); // dev-friendly
}
