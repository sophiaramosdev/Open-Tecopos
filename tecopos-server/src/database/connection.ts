import { Sequelize } from "sequelize-typescript";
require("dotenv").config();

const db = new Sequelize({
    dialect: "postgres",
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: !!(process.env.APP_ENV === "development"),
    models: [__dirname + "/models"],
    pool: {
        max: 30,
        min: 0,
        acquire: 30000,
        idle: 5000,
    },
});

export default db;
