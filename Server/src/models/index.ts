import { Sequelize } from 'sequelize';
import { sequelize } from '../config/sequelize.config.js';
import { User } from './user.model.js';
import { Group } from './group.model.js';
import { GroupMember } from './groupMember.model.js';
import { Prayer } from './prayer.model.js';
import { PrayerUpdate } from './prayerUpdate.model.js';
import { Attachment } from './attachment.model.js';
import { OtpToken } from './otpToken.model.js';
import { PrayerParticipant } from './prayerParticipant.model.js';

function initAll(s: Sequelize): void {
  // init models
  User.initModel(s);
  Group.initModel(s);
  GroupMember.initModel(s);
  Prayer.initModel(s);
  PrayerUpdate.initModel(s);
  Attachment.initModel(s);
  OtpToken.initModel(s);
  PrayerParticipant.initModel(s);

  // associations (+ cascades)
  GroupMember.belongsTo(User,  { foreignKey: 'userId',  onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  GroupMember.belongsTo(Group, { foreignKey: 'groupId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(GroupMember,    { foreignKey: 'userId',  onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Group.hasMany(GroupMember,   { foreignKey: 'groupId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

  Prayer.belongsTo(User,  { foreignKey: 'authorUserId', as: 'author', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Prayer.belongsTo(Group, { foreignKey: 'groupId',                    onDelete: 'CASCADE',  onUpdate: 'CASCADE' });
  Prayer.hasMany(PrayerUpdate, { foreignKey: 'prayerId', as: 'updates',     onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Prayer.hasMany(Attachment,   { foreignKey: 'prayerId', as: 'attachments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

  PrayerUpdate.belongsTo(Prayer, { foreignKey: 'prayerId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  PrayerUpdate.belongsTo(User,   { foreignKey: 'authorUserId', as: 'author', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

  Attachment.belongsTo(Prayer, { foreignKey: 'prayerId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

  OtpToken.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(OtpToken,   { foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

  // many-to-many: prayers ↔ users (participants)
  Prayer.belongsToMany(User, {
    through: PrayerParticipant,
    foreignKey: 'prayerId',
    otherKey: 'userId',
    as: 'participants',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  User.belongsToMany(Prayer, {
    through: PrayerParticipant,
    foreignKey: 'userId',
    otherKey: 'prayerId',
    as: 'participatingPrayers',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
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
  OtpToken,
  PrayerParticipant
};
