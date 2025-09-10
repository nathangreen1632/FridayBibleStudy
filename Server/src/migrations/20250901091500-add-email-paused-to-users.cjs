'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            const table = await queryInterface.describeTable('users');
            const hasCol = Boolean(table && table.email_paused);
            if (!hasCol) {
                await queryInterface.addColumn('users', 'email_paused', {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                });
            }
        } catch (e) {
            console.error('addColumn users.email_paused skipped/failed', e);
        }
    },

    async down(queryInterface) {
        try {
            const table = await queryInterface.describeTable('users');
            const hasCol = Boolean(table && table.email_paused);
            if (hasCol) {
                await queryInterface.removeColumn('users', 'email_paused');
            }
        } catch (e) {
            console.error('removeColumn users.email_paused skipped/failed', e);
        }
    },
};
