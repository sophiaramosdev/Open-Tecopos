import { QueryInterface } from "sequelize";
import { Sequelize } from "sequelize";

const users = [
    {
        username: "admin",
        email: "admin@tecopos.domain.com",
        password:
            "$2a$10$Z4vMJ76kcbTUkGnZXb3VBON64VfAJBAu5PewF1xQUZRr.MrnPdCHG",
        isActive: true,
        isSuperAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkInsert("Users", users);
    },

    down: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkDelete("Users", {});
    },
};
