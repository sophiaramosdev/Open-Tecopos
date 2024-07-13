"use strict";

import { Sequelize } from "sequelize";

module.exports = {
  up: (queryInterface: any, Sequelize: Sequelize) => {
    return queryInterface.bulkInsert("Permissions", [
      {
        code: "ALL",
        name: "Acceso total",
        description:
          "Acceso a total a todas las secciones administrativas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "ENTITIES_VIEW",
        name: "Visualizar entidades",
        description:
          "Otorga acceso para ver todas las entidades a las que está asociado el usuario",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "ENTITIES_EDIT",
        name: "Editar entidades",
        description:
          "Otorga permisos para editar entidades a las que está asociado el usuario",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      //USUARIOS
      {
        code: "USERS_FULL",
        name: "Acceso total",
        description:
          "Acceso total a los usuarios de la entidad a la que está asociado el usuario",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "USERS_VIEW",
        name: "Visualizar usuarios",
        description: "Acceso a visualizar los usuarios asociados a su entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "USERS_CREATE",
        name: "Crear usuarios",
        description:
          "Acceso a crear usuarios en el sistema y asignar roles asociados a su entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "USERS_EDIT",
        name: "Editar usuarios",
        description:
          "Acceso a editar usuarios en el sistema y asignar roles asociados a su entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "USERS_DELETE",
        name: "Eliminar usuarios",
        description:
          "Acceso a eliminar usuarios en el sistema y asignar roles asociados a su entidad",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // CUENTAS
      {
        code: "ACCOUNTS_FULL",
        name: "Acceso total",
        description: "Otorga acceso total al módulo las cuentas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "ACCOUNTS_VIEW",
        name: "Visualizar cuentas",
        description:
          "Otorga acceso ta visualizar las cuentas de las entidades a las que está asociado el usuario",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "ACCOUNTS_CREATE",
        name: "Crear cuentas",
        description: "Otorga acceso para crear cuentas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "ACCOUNTS_RELOAD",
        name: "Recargar cuentas",
        description: "Otorga acceso para recargar cuentas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "ACCOUNTS_EDIT",
        name: "Editar cuentas",
        description: "Otorga acceso para editar cuentas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "ACCOUNTS_DELETE",
        name: "Eliminar cuentas",
        description: "Otorga acceso para eliminar cuentas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // SOLICITUDES
      {
        code: "REQUESTS_FULL",
        name: "Acceso total",
        description: "Otorga acceso para ver todas las solicitudes de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "REQUESTS_VIEW",
        name: "Visualizar solicitudes",
        description: "Otorga acceso para visualizar solicitudes de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "REQUESTS_CREATE",
        name: "Crear solicitudes",
        description: "Otorga acceso para crear nuevas solicitudes de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "REQUESTS_UPDATE",
        name: "Modificar solicitudes",
        description:
          "Otorga acceso a modificar estado de las solicitudes de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "REQUESTS_DELETE",
        name: "Eliminar solicitudes",
        description: "Otorga acceso a eliminar las solicitudes de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // TARJETAS
      {
        code: "CARDS_FULL",
        name: "Acceso total",
        description: "Otorga acceso total al módulo de tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "CARDS_VIEW",
        name: "Visualizar",
        description: "Otorga acceso para vizualizar las tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "CARDS_UPDATE",
        name: "Modificar estados de tarjeta",
        description: "Otorga acceso para modificar los estados de las tarjetas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // TRANSACCIONES
      {
        code: "TRANSACTIONS_FULL",
        name: "Acceso total",
        description: "Otorga acceso para ver todas las transacciones",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "TRANSACTIONS_EXPORT",
        name: "Exportar transacciones",
        description: "Otorga acceso para exportar transacciones",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // TRAZAS
      {
        code: "TRACES_ALL",
        name: "Acceso a todos los rastros",
        description: "Otorga acceso para ver todos las trazas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: "TRACES_EXPORT",
        name: "Exportar trazas",
        description: "Otorga acceso para exportar trazas",
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
