import { QueryInterface } from "sequelize";
import { Sequelize } from "sequelize";

const roles = [
    {
        name: "Propietario de grupo",
        code: "GROUP_OWNER",
        type: "CONTROL",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Propietario de negocio",
        code: "OWNER",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Administrador",
        code: "ADMIN",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Operador de Punto de venta",
        code: "MANAGER_SALES",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Jefe de turno",
        code: "MANAGER_SHIFT",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Jefe de Almacén",
        code: "MANAGER_AREA",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Jefe de Producción",
        code: "MANAGER_PRODUCTION",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Camarero(a)",
        code: "WEITRESS",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Comprador(a)",
        code: "BUYER",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Jefe de Producción",
        code: "CHIEF_PRODUCTION",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de precios y costos",
        code: "MANAGER_COST_PRICES",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Usuario de sistema",
        code: "CUSTOMER",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de productos",
        code: "PRODUCT_PROCESATOR",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de ciclos económicos",
        code: "MANAGER_ECONOMIC_CYCLE",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de cartelera digital",
        code: "MANAGER_TV",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Operador de cuentas bancarias",
        code: "MANAGER_CONTABILITY",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de clientes",
        code: "MANAGER_CUSTOMERS",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de proveedores",
        code: "MANAGER_SUPPLIERS",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de recursos humanos",
        code: "MANAGER_HUMAN_RESOURCES",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de salarios y nómina",
        code: "MANAGER_SALARY_RULES",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de punto de acceso",
        code: "MANAGER_ACCESS_POINT",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Operario de Tienda online",
        code: "MANAGER_SHOP_ONLINE",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de monedas",
        code: "MANAGER_CURRENCIES",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de configuraciones",
        code: "MANAGER_CONFIGURATIONS",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Manejador de reportes",
        code: "ANALYSIS_REPORT",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        name: "Operador de facturas",
        code: "MANAGER_BILLING",
        type: "ADMINISTRATION",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkInsert("Roles", roles);
    },

    down: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkDelete("Roles", {});
    },
};
