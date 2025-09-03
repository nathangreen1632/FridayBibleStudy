'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            await queryInterface.addColumn('prayers', 'commentCount', {
                type: Sequelize.INTEGER, allowNull: false, defaultValue: 0
            });
        } catch {}

        try {
            await queryInterface.addColumn('prayers', 'lastCommentAt', {
                type: Sequelize.DATE, allowNull: true
            });
        } catch {}

        try {
            await queryInterface.addColumn('prayers', 'isCommentsClosed', {
                type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false
            });
        } catch {}

        await queryInterface.createTable('comment_reads', {
            prayerId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'prayers', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE',
                primaryKey: true
            },
            userId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE',
                primaryKey: true
            },
            lastSeenAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });
    },

    async down(queryInterface) {
        try { await queryInterface.removeColumn('prayers', 'commentCount'); } catch {}
        try { await queryInterface.removeColumn('prayers', 'lastCommentAt'); } catch {}
        try { await queryInterface.removeColumn('prayers', 'isCommentsClosed'); } catch {}
        try { await queryInterface.dropTable('comment_reads'); } catch {}
    }
};
