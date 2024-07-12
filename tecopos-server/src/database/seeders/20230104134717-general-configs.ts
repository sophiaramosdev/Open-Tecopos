import { QueryInterface, Sequelize } from "sequelize/types";

const configs = [
    {
        key: "payment_methods_enabled",
        value: "CASH,TRANSFER",
        origin: "Tecopos-Alma",
        isSensitive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "payment_currency_enabled",
        value: "USD",
        origin: "Tecopos-Alma",
        isSensitive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "max_upload_photo_size",
        value: "300",
        origin: "General",
        isSensitive: false,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "mail_host",
        value: "mail.gandi.net",
        origin: "Tecopos-Alma",
        isSensitive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "mail_port",
        value: "587",
        origin: "Tecopos-Alma",
        isSensitive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "mail_user",
        value: "no-reply@tecopos.com",
        origin: "Tecopos-Alma",
        isSensitive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "mail_password",
        value: "",
        origin: "Tecopos-Alma",
        isSensitive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "mail_from",
        value: `"TECOPOS" <no-reply@tecopos.com>`,
        origin: "Tecopos-Alma",
        isSensitive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "public_admin_host",
        value: "https://admin.tecopos.com",
        origin: "General",
        isSensitive: false,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "public_api_host",
        value: "https://api.tecopos.com",
        origin: "General",
        isSensitive: false,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "public_shop_host",
        value: "https://tienda.tecopos.com",
        origin: "General",
        isSensitive: false,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "is_maintenance_management",
        value: "false",
        origin: "Tecopos-Management",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "management_min_version_ios",
        value: "",
        origin: "Tecopos-Management",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "management_min_version_android",
        value: "",
        origin: "Tecopos-Management",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "management_url_google_play",
        value: "",
        origin: "Tecopos-Management",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "management_url_app_store",
        value: "",
        origin: "Tecopos-Management",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "is_maintenance_tecopos",
        value: "false",
        origin: "Tecopos",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "tecopos_min_version_ios",
        value: "",
        origin: "Tecopos",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "tecopos_min_version_android",
        value: "",
        origin: "Tecopos",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "tecopos_url_google_play",
        value: "",
        origin: "Tecopos",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        key: "tecopos_url_app_store",
        value: "",
        origin: "Tecopos",
        isSensitive: false,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkInsert("GeneralConfigs", configs);
    },

    down: async (queryInterface: QueryInterface, Sequelize: Sequelize) => {
        await queryInterface.bulkDelete("GeneralConfigs", {});
    },
};