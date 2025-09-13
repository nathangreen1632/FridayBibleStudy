// Server/src/migrations/20250911190500-create-events.cjs
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('events', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },

            // Ownership
            group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            author_user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },

            // Content
            title: {
                type: Sequelize.STRING(200),
                allowNull: false,
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            location: {
                type: Sequelize.STRING(200),
                allowNull: true,
            },

            // Timing
            starts_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            ends_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },

            // Status
            status: {
                type: Sequelize.ENUM('draft', 'published'),
                allowNull: false,
                defaultValue: 'published',
            },

            // Timestamps
            createdAt: Sequelize.DATE,
            updatedAt: Sequelize.DATE,
        });

        // Helpful composite index for filtering/sorting within a group by start time
        await queryInterface.addIndex('events', ['group_id', 'starts_at']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('events');
        // Note: Sequelize leaves the ENUM type around in Postgres; safe to leave.
    },
};
