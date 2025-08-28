'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('users', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            name: { type: Sequelize.STRING(120), allowNull: false },
            phone: { type: Sequelize.STRING(24), allowNull: false },
            email: { type: Sequelize.STRING(180), allowNull: false, unique: true },
            passwordHash: { type: Sequelize.STRING(200), allowNull: false },
            role: { type: Sequelize.ENUM('classic', 'admin'), allowNull: false, defaultValue: 'classic' },
            emailVerified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

            addressStreet: { type: Sequelize.STRING(180), allowNull: true },
            addressCity:   { type: Sequelize.STRING(120), allowNull: true },
            addressState:  { type: Sequelize.STRING(40),  allowNull: true },
            addressZip:    { type: Sequelize.STRING(20),  allowNull: true },
            spouseName:    { type: Sequelize.STRING(120), allowNull: true },

            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.addIndex('users', ['email'], { name: 'users_email_idx' });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('users', 'users_email_idx');
        await queryInterface.dropTable('users');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
    }
};
