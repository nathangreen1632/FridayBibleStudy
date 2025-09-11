// Server/src/migrations/20250910100000-add-note-to-attachments.cjs
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            await queryInterface.addColumn('attachments', 'note', {
                type: Sequelize.STRING(512), // or Sequelize.TEXT if you want unlimited length
                allowNull: true,
            });
        } catch (e) {
            console.error('Failed to add note column to attachments:', e);
        }
    },

    async down(queryInterface) {
        try {
            await queryInterface.removeColumn('attachments', 'note');
        } catch (e) {
            console.error('Failed to remove note column from attachments:', e);
        }
    },
};
