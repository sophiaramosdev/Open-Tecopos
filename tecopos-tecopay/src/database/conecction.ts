import { Sequelize } from "sequelize-typescript";

require("dotenv").config();

const db = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "0"),
  models: [__dirname + "/models"],
  logging: process.env.APP_ENV === "development",
  /*pool: {
    max: 50,
    min: 0,
    acquire: 30000,
    idle: 5000,
  },*/
});

export default db;
