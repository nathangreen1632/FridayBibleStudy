'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prayers_category') THEN
          CREATE TYPE "enum_prayers_category" AS ENUM('prayer','long-term','salvation','pregnancy','birth');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prayers_status') THEN
          CREATE TYPE "enum_prayers_status" AS ENUM('active','praise','archived');
        END IF;
      END$$;
    `);

        await queryInterface.createTable('prayers', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            groupId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'groups', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            authorUserId: {
                type: Sequelize.INTEGER, allowNull: false, // keep in sync with your model
                references: { model: 'users', key: 'id' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            title:   { type: Sequelize.STRING(200), allowNull: false },
            content: { type: Sequelize.TEXT,        allowNull: false },
            category:{ type: 'enum_prayers_category', allowNull: false },
            status:  { type: 'enum_prayers_status',   allowNull: false, defaultValue: 'active' },
            position:{ type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            impersonatedByAdminId: {
                type: Sequelize.INTEGER, allowNull: true,
                references: { model: 'users', key: 'id' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        });

        await queryInterface.addIndex('prayers', ['groupId', 'status', 'position'], { name: 'prayers_group_status_position' });
        await queryInterface.addIndex('prayers', ['category'], { name: 'prayers_category_idx' });
        await queryInterface.addIndex('prayers', ['status'], { name: 'prayers_status_idx' });
        await queryInterface.addIndex('prayers', ['createdAt'], { name: 'prayers_createdAt_idx' });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('prayers', 'prayers_createdAt_idx');
        await queryInterface.removeIndex('prayers', 'prayers_status_idx');
        await queryInterface.removeIndex('prayers', 'prayers_category_idx');
        await queryInterface.removeIndex('prayers', 'prayers_group_status_position');
        await queryInterface.dropTable('prayers');

        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_prayers_status";');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_prayers_category";');
    }
};
