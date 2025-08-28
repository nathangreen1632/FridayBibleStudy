'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

        await queryInterface.sequelize.query(
            'CREATE INDEX IF NOT EXISTS users_name_trgm_idx ON users USING gin (name gin_trgm_ops);'
        );
        await queryInterface.sequelize.query(
            'CREATE INDEX IF NOT EXISTS users_email_trgm_idx ON users USING gin (email gin_trgm_ops);'
        );

        await queryInterface.sequelize.query(
            'CREATE INDEX IF NOT EXISTS prayers_title_trgm_idx ON prayers USING gin (title gin_trgm_ops);'
        );
        await queryInterface.sequelize.query(
            'CREATE INDEX IF NOT EXISTS prayers_content_trgm_idx ON prayers USING gin (content gin_trgm_ops);'
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS prayers_content_trgm_idx;');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS prayers_title_trgm_idx;');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_email_trgm_idx;');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_name_trgm_idx;');
    }
};
