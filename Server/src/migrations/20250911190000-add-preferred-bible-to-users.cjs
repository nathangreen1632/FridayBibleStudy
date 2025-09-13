// Server/src/migrations/20250911190000-add-preferred-bible-to-users.cjs
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Option A: portable check via describeTable
        const desc = await queryInterface.describeTable('users');

        if (!desc.preferred_bible_id) {
            await queryInterface.addColumn('users', 'preferred_bible_id', {
                type: Sequelize.STRING(64),
                allowNull: true,
                // comment: 'Preferred Bible version id (e.g., de4e12af7f28f599-01)',
            });
        }
        // else: column already there → no-op
    },

    async down(queryInterface) {
        const desc = await queryInterface.describeTable('users');
        if (desc.preferred_bible_id) {
            await queryInterface.removeColumn('users', 'preferred_bible_id');
        }
        // else: no-op
    },
};
