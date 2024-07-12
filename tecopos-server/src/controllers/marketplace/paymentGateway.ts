import { Request, Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";
import { Tropipay } from "@yosle/tropipayjs";

import PaymentGateway from "../../database/models/paymentGateway";
import Logger from "../../lib/logger";
import Business from "../../database/models/business";
import ConfigurationKey from "../../database/models/configurationKey";
import OrderReceipt from "../../database/models/orderReceipt";
import OrderReceiptTotal from "../../database/models/OrderReceiptTotal";
import User from "../../database/models/user";
import Client from "../../database/models/client";
import moment from "moment";
import SelledProduct from "../../database/models/selledProduct";
import { config_transactions } from "../../database/seq-transactions";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import { getTitleOrderRecord } from "../../helpers/translator";
import OrderReceiptRecord from "../../database/models/orderReceiptRecord";
import CurrencyPayment from "../../database/models/currencyPayment";

export const getActivesPaymentGateway = async (req: any, res: Response) => {
    try {
        const business: Business = req.business;

        const found_payment_gateways = await PaymentGateway.findAll({
            attributes: [
                "id",
                "externalId",
                "name",
                "code",
                "description",
                "isActive",
                "paymentWay",
            ],
            where: {
                businessId: business.id,
                isActive: true,
            },
        });

        res.status(200).json(found_payment_gateways);
    } catch (error: any) {
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const createPaymentLinkTropipay = async (req: any, res: Response) => {
    try {
        const { orderId } = req.body;
        const business: Business = req.business;
        const user: User = req.user;

        const foundPayments = await PaymentGateway.findAll({
            where: {
                businessId: business.id,
                isActive: true,
            },
        });

        const found_Tropipay = foundPayments.find(
            item => item.code === "G_TROPIPAY"
        );

        if (!found_Tropipay) {
            Logger.warn(
                `El método de pago Tropipay no está habilitado para este negocio.`,
                {
                    "X-App-Origin": req.header("X-App-Origin"),
                    businessId: business.id,
                }
            );
            return res.status(404).json({
                message: `El método de pago Tropipay no está habilitado para este negocio.`,
            });
        }

        //Configurations
        const foundConfigurations = await ConfigurationKey.findAll({
            where: {
                businessId: business.id,
                key: ["tropipay_client_id", "tropipay_client_secret"],
            },
        });

        const clientId = foundConfigurations.find(
            item => item.key === "tropipay_client_id"
        )?.value;
        const clientSecret = foundConfigurations.find(
            item => item.key === "tropipay_client_secret"
        )?.value;

        if (!clientId || !clientSecret) {
            return res.status(404).json({
                message: `No se encontraron las claves de acceso a Tropipay.`,
            });
        }

        //Found order
        const order = await OrderReceipt.findByPk(orderId, {
            include: [OrderReceiptTotal, SelledProduct],
        });

        if (!order) {
            return res.status(404).json({
                message: `La orden no fue encontrada.`,
            });
        }

        if (["CANCELLED", "BILLED", "REFUNDED"].includes(order.status)) {
            return res.status(400).json({
                message: `La orden solicitada ya ha sido cerrada y no puede ser pagada. Consulte al administrador del negocio.`,
            });
        }

        if (order.totalToPay.length === 0) {
            return res.status(400).json({
                message: `La orden no contiene monto a pagar. Acción no permitida`,
            });
        }

        if (order.totalToPay.length > 1) {
            return res.status(400).json({
                message: `La orden contiene múltiples monedas a pagar. Acción no permitida`,
            });
        }

        let amount = order.totalToPay[0].amount;
        if (amount.toString().split(".").length > 1) {
            const merge = amount.toString().split(".").join("");
            amount = Number(merge);
        } else {
            const merge = amount.toString() + "00";
            amount = Number(merge);
        }
        const codeCurrency = order.totalToPay[0].codeCurrency;

        const allowedCurrencies = ["EUR", "USD", "GBP"];

        if (!allowedCurrencies.includes(codeCurrency)) {
            return res.status(400).json({
                message: `La moneda ${codeCurrency} no está permitida para este método de pago. Acción no permitida.`,
            });
        }

        //Checking customer
        const client = await Client.scope("to_return").findOne({
            where: {
                businessId: business.id,
                userId: user.id,
            },
        });

        if (!client) {
            return res.status(404).json({
                message: `El cliente no fue encontrado.`,
            });
        }

        // //---> TROPIPAY API
        const config = {
            clientId,
            clientSecret,
            serverMode: "Production",
        };
        //@ts-ignore
        const tpp = new Tropipay(config);

        const description = order.selledProducts
            .map(item => `(x${item.quantity})${item.name}`)
            .join(",");

        const payload = {
            reference: `${order.id}`,
            concept: `Compra de productos utilizando Marketplace Tecopos - ${business.name}`,
            favorite: "true",
            amount,
            currency: codeCurrency,
            description,
            singleUse: "true",
            reasonId: 4,
            expirationDays: 1,
            client: null,
            lang: "es",
            urlSuccess: `https://tienda.tecopos.com/${business.slug}/paymentsuccess`,
            urlFailed: `https://tienda.tecopos.com/${business.slug}/paymentfailed`,
            urlNotification: `https://api.tecopos.com/api/v1/marketplace/paymentgateway/feedback-tropipay`,
            serviceDate: moment().format("YYYY-MM-DD"),
            directPayment: "true",
        };

        //@ts-ignore
        const paylink = await tpp.paymentCards.create(payload);

        res.status(200).json({
            qrImage: paylink.qrImage,
            shortUrl: paylink.shortUrl,
        });
    } catch (error: any) {
        Logger.error(error.toString(), {
            "X-App-Origin": req.header("X-App-Origin"),
        });
        res.status(500).json({
            message:
                `Ha ocurrido un error mientras nos comunicábamos con Tropipay. Por favor, vuelva a intentarlo. Si el error persiste contacte al negocio. ${error.toString()}`,
        });
    }
};

export const feedbackTropiPay = async (req: any, res: Response) => {
    const t = await db.transaction(config_transactions);

    try {
        const { status, data } = req.body;
        const origin = req.get("origin");

        const orderId = data.reference;

        const order = await OrderReceipt.findByPk(orderId, {
            include: [OrderReceiptPrice],
            transaction: t,
        });

        if (!order) {
            t.rollback();
            Logger.error(`La orden con id ${orderId} no fue encontrada.`, {
                "X-App-Origin": req.header("X-App-Origin"),
                TropipayData: JSON.stringify(data),
            });
            return res.status(404).json({
                message: `Order not found`,
            });
        }

        if (status !== "OK") {
            const listRecords = [];
            listRecords.push({
                action: "WITH_ERRORS",
                title: getTitleOrderRecord("WITH_ERRORS"),
                details: `Intento de pago en Tropipay. ${JSON.stringify(data)}`,
                orderReceiptId: order.id,
                madeById: 1,
                isPublic: false,
            });

            await OrderReceiptRecord.bulkCreate(listRecords, {
                transaction: t,
            });

            return res.status(400).json({
                message: `La transacción fue rechazada.`,
            });
        }

        order.closedDate = data.createdAt;
        order.paidAt = data.createdAt;
        order.status = "BILLED";

        await order.save({ transaction: t });

        const listRecords = [];
        listRecords.push({
            action: "ORDER_BILLED",
            title: getTitleOrderRecord("ORDER_BILLED"),
            details: `Facturada en Tropipay. ${JSON.stringify(data)}`,
            orderReceiptId: order.id,
            madeById: 1,
            isPublic: false,
        });

        await OrderReceiptRecord.bulkCreate(listRecords, {
            transaction: t,
        });

        let addBulkCurrencies: any = [];

        //Registering payment
        addBulkCurrencies.push({
            amount: data.amount,
            codeCurrency: data.currency,
            orderReceiptId: order.id,
            paymentWay: "TROPIPAY",
        });

        //Setting final data
        await CurrencyPayment.bulkCreate(addBulkCurrencies, {
            transaction: t,
        });

        await t.commit();

        res.status(200).json({
            message: `Action completed`,
        });
    } catch (error: any) {
        t.rollback();
        Logger.error(error, { "X-App-Origin": req.header("X-App-Origin") });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
