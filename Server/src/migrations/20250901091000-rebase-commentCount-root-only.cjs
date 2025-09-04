'use strict';

module.exports = {
    async up(queryInterface /*, Sequelize */) {
        // Reset and repopulate commentCount to count only non-deleted ROOT comments (depth = 0).
        await queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.sequelize.query(
                `UPDATE "prayers" SET "commentCount" = 0;`,
                { transaction: t }
            );

            await queryInterface.sequelize.query(
                `
        UPDATE "prayers" p
        SET "commentCount" = sub.cnt
        FROM (
          SELECT "prayerId", COUNT(*)::int AS cnt
          FROM "comments"
          WHERE depth = 0 AND "deletedAt" IS NULL
          GROUP BY "prayerId"
        ) AS sub
        WHERE p.id = sub."prayerId";
        `,
                { transaction: t }
            );
        });
    },

    async down(queryInterface /*, Sequelize */) {
        // Best-effort rollback: count ALL non-deleted comments (roots + replies).
        await queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.sequelize.query(
                `UPDATE "prayers" SET "commentCount" = 0;`,
                { transaction: t }
            );

            await queryInterface.sequelize.query(
                `
        UPDATE "prayers" p
        SET "commentCount" = sub.cnt
        FROM (
          SELECT "prayerId", COUNT(*)::int AS cnt
          FROM "comments"
          WHERE "deletedAt" IS NULL
          GROUP BY "prayerId"
        ) AS sub
        WHERE p.id = sub."prayerId";
        `,
                { transaction: t }
            );
        });
    },
};
