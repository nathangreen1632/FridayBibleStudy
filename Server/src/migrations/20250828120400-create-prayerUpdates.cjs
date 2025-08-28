'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('prayerUpdates', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            prayerId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'prayers', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            authorUserId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            content: { type: Sequelize.TEXT, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.addIndex('prayerUpdates', ['prayerId'], { name: 'prayerUpdates_prayerId_idx' });
        await queryInterface.addIndex('prayerUpdates', ['createdAt'], { name: 'prayerUpdates_createdAt_idx' });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('prayerUpdates', 'prayerUpdates_createdAt_idx');
        await queryInterface.removeIndex('prayerUpdates', 'prayerUpdates_prayerId_idx');
        await queryInterface.dropTable('prayerUpdates');
    }
};
