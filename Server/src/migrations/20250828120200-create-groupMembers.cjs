'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('groupMembers', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            userId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            groupId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'groups', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.addIndex('groupMembers', ['userId', 'groupId'], {
            unique: true, name: 'groupMembers_user_group_unique'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('groupMembers', 'groupMembers_user_group_unique');
        await queryInterface.dropTable('groupMembers');
    }
};
