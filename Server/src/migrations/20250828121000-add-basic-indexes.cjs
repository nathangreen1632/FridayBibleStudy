'use strict';

module.exports = {
    async up(queryInterface) {
        const q = (sql) => queryInterface.sequelize.query(sql);

        await q('CREATE INDEX IF NOT EXISTS users_name_idx   ON "users" ("name");');
        await q('CREATE INDEX IF NOT EXISTS users_phone_idx  ON "users" ("phone");');
        await q('CREATE INDEX IF NOT EXISTS users_city_idx   ON "users" ("addressCity");');
        await q('CREATE INDEX IF NOT EXISTS users_state_idx  ON "users" ("addressState");');
    },

    async down(queryInterface) {
        const q = (sql) => queryInterface.sequelize.query(sql);
        await q('DROP INDEX IF EXISTS users_state_idx;');
        await q('DROP INDEX IF EXISTS users_city_idx;');
        await q('DROP INDEX IF EXISTS users_phone_idx;');
        await q('DROP INDEX IF EXISTS users_name_idx;');
    }
};
