"use strict";

import { QueryInterface, Sequelize } from "sequelize/types";

const plans = [
    {
        name: "Gratuito",
        code: "FREE",
        description: "",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Básico",
        code: "STANDARD",
        description: "",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Popular",
        code: "POPULAR",
        description: "",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Profesional",
        code: "FULL",
        description: "",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Personalizado",
        code: "CUSTOM",
        description: "",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkInsert("SubscriptionPlans", plans);
    },

    down: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkDelete("SubscriptionPlans", {});
    },
};
