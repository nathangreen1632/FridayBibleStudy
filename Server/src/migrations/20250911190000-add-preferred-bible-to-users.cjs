'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'preferred_bible_id', { type: Sequelize.STRING(64), allowNull: true });
    },
    async down(queryInterface) {
        await queryInterface.removeColumn('users', 'preferred_bible_id');
    }
};
