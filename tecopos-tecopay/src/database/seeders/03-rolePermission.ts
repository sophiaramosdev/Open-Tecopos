"use strict";

import { Sequelize } from "sequelize";

module.exports = {
  up: (queryInterface: any, Sequelize: Sequelize) => {
    return queryInterface.bulkInsert("RolePermissions", [
      {
        roleId: 1,
        permissionId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: (queryInterface: any, Sequelize: Sequelize) => {
    // No need to define down method for this seeder
    // Add it only if you want to delete the inserted data
  },
};
