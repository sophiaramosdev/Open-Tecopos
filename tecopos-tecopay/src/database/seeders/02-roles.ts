"use strict";

import { Sequelize } from "sequelize";

module.exports = {
  up: (queryInterface: any) => {
    return queryInterface.bulkInsert("Roles", [
      {
        code: "OWNER_ENTITY",
        name: "Propietario de entidad",
        description:
          "Todos los permisos asociados a su entidad",
        reserved:true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } 
    ]);
  },

  down: (queryInterface: any, Sequelize: Sequelize) => {
    // No need to define down method for this seeder
    // Add it only if you want to delete the inserted data
  },
};
