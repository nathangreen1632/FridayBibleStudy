require('dotenv/config');

const common = {
    dialect: 'postgres',
    logging: console.log,
    define: { underscored: false },
};

module.exports = {
    development: {
        ...common,
        url: process.env.DATABASE_URL ||
            `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`,
    },
    test: {
        ...common,
        url: process.env.TEST_DATABASE_URL,
    },
    production: {
        ...common,
        url: process.env.DATABASE_URL,
    },
};
