'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('otpTokens', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            userId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            otpHash:   { type: Sequelize.STRING(200), allowNull: false },
            expiresAt: { type: Sequelize.DATE,        allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.addIndex('otpTokens', ['userId'], { name: 'otpTokens_userId_idx' });
        await queryInterface.addIndex('otpTokens', ['expiresAt'], { name: 'otpTokens_expiresAt_idx' });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('otpTokens', 'otpTokens_expiresAt_idx');
        await queryInterface.removeIndex('otpTokens', 'otpTokens_userId_idx');
        await queryInterface.dropTable('otpTokens');
    }
};
