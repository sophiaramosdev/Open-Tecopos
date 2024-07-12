import { QueryInterface } from "sequelize";
import { Sequelize } from "sequelize";

const currencies = [
    {
        name: "Dólar norteamericano",
        code: "USD",
        symbol: "$",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Euro",
        code: "EUR",
        symbol: "€",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Peso cubano",
        code: "CUP",
        symbol: "$",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Dólar canadiense",
        code: "CAD",
        symbol: "$",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Moneda Libremente Convertible",
        code: "MLC",
        symbol: "$",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkInsert("Currencies", currencies);
    },

    down: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkDelete("Currencies", {});
    },
};
