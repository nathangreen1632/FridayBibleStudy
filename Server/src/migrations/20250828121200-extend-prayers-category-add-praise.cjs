'use strict';

module.exports = {
    async up(queryInterface /*, Sequelize */) {
        const t = await queryInterface.sequelize.transaction();
        try {
            // Ensure the enum type exists (fresh DBs running this out of order)
            await queryInterface.sequelize.query(
                `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prayers_category') THEN
             CREATE TYPE "enum_prayers_category" AS ENUM
               ('prayer','long-term','salvation','pregnancy','birth');
           END IF;
         END $$;`,
                { transaction: t }
            );

            // Append the new value
            await queryInterface.sequelize.query(
                `ALTER TYPE "enum_prayers_category" ADD VALUE IF NOT EXISTS 'praise';`,
                { transaction: t }
            );

            await t.commit();
        } catch (e) {
            await t.rollback();
            throw e; // let sequelize report the failure; no new Error constructed
        }
    },

    async down(queryInterface /*, Sequelize */) {
        const t = await queryInterface.sequelize.transaction();
        try {
            // Recreate enum WITHOUT 'praise'
            await queryInterface.sequelize.query(
                `CREATE TYPE "enum_prayers_category_new" AS ENUM
           ('prayer','long-term','salvation','pregnancy','birth');`,
                { transaction: t }
            );

            // Rebind column to the new enum
            await queryInterface.sequelize.query(
                `ALTER TABLE "prayers"
           ALTER COLUMN "category" TYPE "enum_prayers_category_new"
           USING "category"::text::"enum_prayers_category_new";`,
                { transaction: t }
            );

            // Replace old type with the new one (keeps the original enum name)
            await queryInterface.sequelize.query(
                `DROP TYPE "enum_prayers_category";`,
                { transaction: t }
            );
            await queryInterface.sequelize.query(
                `ALTER TYPE "enum_prayers_category_new" RENAME TO "enum_prayers_category";`,
                { transaction: t }
            );

            await t.commit();
        } catch (e) {
            await t.rollback();
            throw e;
        }
    },
};
