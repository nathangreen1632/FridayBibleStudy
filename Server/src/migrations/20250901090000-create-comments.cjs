'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('comments', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            prayerId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'prayers', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            parentId: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'comments', key: 'id' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            threadRootId: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'comments', key: 'id' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            depth: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            authorId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            content: { type: Sequelize.TEXT, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: true },
            deletedAt: { type: Sequelize.DATE, allowNull: true },
        });

        await queryInterface.addIndex('comments', ['prayerId', 'createdAt']);
        await queryInterface.addIndex('comments', ['threadRootId', 'createdAt']);
    },

    async down(queryInterface) {
        try { await queryInterface.dropTable('comments'); } catch {}
    }
};
