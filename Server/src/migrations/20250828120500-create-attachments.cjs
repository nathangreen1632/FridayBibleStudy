'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('attachments', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            prayerId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'prayers', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            filePath: { type: Sequelize.STRING(260), allowNull: false },
            fileName: { type: Sequelize.STRING(200), allowNull: false },
            mimeType: { type: Sequelize.STRING(80),  allowNull: false },
            size:     { type: Sequelize.INTEGER,     allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.addIndex('attachments', ['prayerId'], { name: 'attachments_prayerId_idx' });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('attachments', 'attachments_prayerId_idx');
        await queryInterface.dropTable('attachments');
    }
};
