import { QueryInterface } from "sequelize";
import { Sequelize } from "sequelize";

const businessCategories = [
    {
        name: "Restaurante",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Bar",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Tienda",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkInsert(
            "BusinessCategories",
            businessCategories
        );
    },

    down: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkDelete("BusinessCategories", {});
    },
};
