import { QueryInterface, Sequelize } from "sequelize/types";

const attributes = [
    {
        name: "Color",
        code: "color",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Tamaño/Talla",
        code: "size",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Material",
        code: "material",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Calidad",
        code: "quality",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Peso",
        code: "weight",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkInsert("Attributes", attributes);
    },

    down: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkDelete("Attributes", {});
    },
};
