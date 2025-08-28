'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('groups', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            name: { type: Sequelize.STRING(160), allowNull: false },
            slug: { type: Sequelize.STRING(160), allowNull: false, unique: true },
            groupEmail: { type: Sequelize.STRING(180), allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });
        await queryInterface.addIndex('groups', ['slug'], { unique: true, name: 'groups_slug_unique' });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('groups', 'groups_slug_unique');
        await queryInterface.dropTable('groups');
    }
};
