'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('prayerParticipants', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            prayerId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'prayers', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            userId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.addIndex('prayerParticipants', ['prayerId', 'userId'], {
            unique: true, name: 'prayerParticipants_unique_pair'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('prayerParticipants', 'prayerParticipants_unique_pair');
        await queryInterface.dropTable('prayerParticipants');
    }
};
