import { Response } from "express";
import { Op, where, fn, col } from "sequelize";

import db from "../../database/connection";
import { pag_params } from "../../database/pag_params";

import Attribute from "../../database/models/attribute";
import User from "../../database/models/user";
import Product from "../../database/models/product";
import ProductAttribute from "../../database/models/productAttribute";
import StockAreaVariation from "../../database/models/stockAreaVariation";
import Variation from "../../database/models/variation";
import Price from "../../database/models/price";
import Image from "../../database/models/image";
import Business from "../../database/models/business";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import PriceSystem from "../../database/models/priceSystem";
import VariationProductAttribute from "../../database/models/variationProductAttribute";
import Logger from "../../lib/logger";

//Variations
export const findAllAttributes = async (req: any, res: Response) => {
    try {
        const attributes = await Attribute.findAll({
            attributes: ["id", "name", "code"],
        });

        res.status(200).json(attributes);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const addProductAttribute = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { attributeId, values } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const [attribute, product] = await Promise.all([
            Attribute.findByPk(attributeId),
            Product.findByPk(id),
        ]);

        if (!product) {
            return res.status(404).json({
                message: `El producto con id ${id} no fue encontrado.`,
            });
        }

        if (product.type !== "VARIATION") {
            return res.status(400).json({
                message: `El producto proporcionado no es de tipo Variable.`,
            });
        }

        if (!attribute) {
            return res.status(404).json({
                message: `El atributo proporcionado no fue encontrado.`,
            });
        }

        //Permission Check
        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        //Check if there is similar attributes
        const exiting_attributes = await ProductAttribute.findAll({
            where: {
                productId: product.id,
            },
        });

        let isAlreadyRegistered = false;
        exiting_attributes.forEach(item => {
            if (item.code === attribute.code && values.includes(item.value)) {
                isAlreadyRegistered = true;
            }
        });

        if (isAlreadyRegistered) {
            return res.status(400).json({
                message: `Ya existe un atributo con el mismo valor asociado al producto.`,
            });
        }

        //Analyzing if variations
        const isANewAttribute = !exiting_attributes.some(
            item => item.code === attribute.code
        );
        const variations = await Variation.count({
            where: {
                productId: product.id,
            },
        });

        if (isANewAttribute && variations !== 0) {
            return res.status(400).json({
                message: `No es posible agregar nuevos atributos al producto, pues ya existen variaciones de este. Elimine todas las variaciones para continuar.`,
            });
        }

        const bulkList = [];
        for (const value of values) {
            bulkList.push({
                name: attribute.name,
                code: attribute.code,
                value,
                productId: id,
            });
        }

        const affectedRows = await ProductAttribute.bulkCreate(bulkList, {
            returning: true,
        });

        const to_return = await ProductAttribute.scope("to_return").findAll({
            where: {
                id: affectedRows.map(item => item.id),
            },
        });

        res.status(201).json(to_return);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getProductAttributes = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const [attributes, product] = await Promise.all([
            ProductAttribute.findAll({
                attributes: ["id", "name", "code", "value"],
                where: {
                    productId: id,
                },
            }),
            Product.findByPk(id),
        ]);

        if (!product) {
            return res.status(404).json({
                message: `El producto con id ${id} no fue encontrado.`,
            });
        }

        if (product.type !== "VARIATION") {
            return res.status(400).json({
                message: `El producto proporcionado no es de tipo Variable.`,
            });
        }

        //Permission Check
        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        res.status(201).json(attributes);
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteProductAttribute = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const variationAttribute = await ProductAttribute.findByPk(id, {
            include: [Product],
        });

        if (!variationAttribute) {
            return res.status(404).json({
                message: `El atributo proporcionado no fue encontrado.`,
            });
        }

        //Permission Check
        if (variationAttribute.product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        //Checking if exist products with variations
        const found = await Variation.findAll({
            include: [
                {
                    model: ProductAttribute,
                    as: "attributes",
                    through: {
                        attributes: [],
                    },
                    where: {
                        id,
                    },
                },
            ],
        });

        if (found.length !== 0) {
            return res.status(400).json({
                message: `La operación no fue completada porque existen variaciones con el atributo proporcionado.`,
            });
        }

        await variationAttribute.destroy();

        res.status(200).json({
            message: "Operation completed",
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editProductAttribute = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { value } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const productAttribute = await ProductAttribute.findByPk(id, {
            include: [Product],
        });

        if (!productAttribute) {
            return res.status(404).json({
                message: `El atributo proporcionado no fue encontrado.`,
            });
        }

        //Permission Check
        if (productAttribute.product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        productAttribute.value = value;

        await productAttribute.save();

        res.status(200).json({
            id: productAttribute.id,
            code: productAttribute.code,
            name: productAttribute.name,
            value: productAttribute.value,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getProductVariations = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                message: `El producto con id ${id} no fue encontrado.`,
            });
        }

        if (product.type !== "VARIATION") {
            return res.status(400).json({
                message: `El producto proporcionado no es de tipo Variable.`,
            });
        }

        //Permission Check
        if (product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        const variations = await Variation.scope("to_return").findAll({
            where: {
                productId: id,
            },
        });

        const attributes = await ProductAttribute.findAll({
            where: {
                productId: id,
            },
        });

        let data_to_return: any = {};
        let uniqueAtt: Array<string> = [];
        for (const att of attributes) {
            if (!uniqueAtt.includes(att.code)) {
                uniqueAtt.push(att.code);
                data_to_return[att.code] = [att.value];
            } else {
                data_to_return[att.code].push(att.value);
            }
        }

        res.status(200).json({
            attributes: data_to_return,
            variations,
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const addProductVariation = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { id } = req.params;
        const { attributes, price, ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const [product, business, all_product_variations] = await Promise.all([
            Product.findByPk(id, {
                include: [ProductAttribute],
            }),
            Business.findOne({
                where: {
                    id: user.businessId,
                },
                include: [
                    {
                        model: AvailableCurrency,
                        include: [Currency],
                    },
                    PriceSystem,
                ],
            }),
            Variation.findAll({
                where: {
                    productId: id,
                },
                include: [
                    {
                        model: ProductAttribute,
                        through: {
                            attributes: [],
                        },
                    },
                ],
            }),
        ]);

        if (!product) {
            t.rollback();
            return res.status(404).json({
                message: `El producto con id ${id} no fue encontrado.`,
            });
        }

        if (!business) {
            t.rollback();
            return res.status(404).json({
                message: `El negocio asociado no fue encontrado.`,
            });
        }

        if (product.type !== "VARIATION") {
            t.rollback();
            return res.status(400).json({
                message: `El producto proporcionado no es de tipo Variable.`,
            });
        }

        //Permission Check
        if (product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        //Price
        let toAdd: any = {};
        if (price) {
            const availableCurrency = business.availableCurrencies.find(
                ac => ac.currency.code === price.codeCurrency
            );

            if (!availableCurrency) {
                t.rollback();
                return res.status(400).json({
                    message: `Available currency provided not found.`,
                });
            }

            toAdd.price = {
                codeCurrency: price.codeCurrency,
                amount: price.amount,
            };
        }

        const variation = Variation.build(
            {
                productId: id,
                imageId: params.imageId,
                description: params.description,
                ...toAdd,
            },
            { include: [{ model: Price, as: "price" }] }
        );

        await variation.save({ transaction: t });

        //Attributes
        //Validating all attributes are configured
        if (product.attributes && product.attributes?.length !== 0) {
            let uniqueAtt: Array<string> = [];
            for (const att of product.attributes) {
                if (!uniqueAtt.includes(att.code)) {
                    uniqueAtt.push(att.code);
                }
            }

            if (uniqueAtt.length !== Object.keys(attributes).length) {
                t.rollback();
                return res.status(401).json({
                    message: `La cantidad de atributos proporcionada no cubre todas las posibilidades.`,
                });
            }

            let addBulk = [];
            let name: Array<string> = [];
            for (const att of Object.keys(attributes)) {
                const found_att_product = product.attributes.find(
                    item => item.code === att && item.value === attributes[att]
                );

                if (!found_att_product) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La variación ${att}-${attributes[att]} no fue encontrada`,
                    });
                }

                addBulk.push({
                    variationId: variation.id,
                    productAttributeId: found_att_product.id,
                });

                name.push(`${attributes[att]}`);
            }

            //Checking if the variation already exist
            for (const variation of all_product_variations) {
                const keyReceived = Object.keys(attributes);
                let matched = 0;
                variation.attributes?.forEach(item => {
                    if (
                        keyReceived.includes(item.code) &&
                        item.value === attributes[item.code]
                    ) {
                        matched++;
                    }
                });

                if (matched === keyReceived.length) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La variación [${variation.attributes
                            ?.map(item => `${item.name}-${item.value}`)
                            .join(",")}] ya existe en el producto seleccionado`,
                    });
                }
            }

            await VariationProductAttribute.bulkCreate(addBulk, {
                transaction: t,
            });

            variation.name = name.join(",");
        } else {
            t.rollback();
            return res.status(400).json({
                message: `El producto seleccionado no tiene atributos configurados.`,
            });
        }

        await variation.save({ transaction: t });

        const variation_to_emit = await Variation.findByPk(variation.id, {
            attributes: ["id", "description", "onSale", "name"],
            include: [
                {
                    model: Price,
                    as: "price",
                    attributes: ["codeCurrency", "amount"],
                },
                {
                    model: Price,
                    as: "onSalePrice",
                    attributes: ["codeCurrency", "amount"],
                },
                {
                    model: Image,
                    attributes: ["id", "src", "thumbnail", "blurHash"],
                },
                {
                    model: ProductAttribute,
                    attributes: ["name", "code", "value"],
                    through: {
                        attributes: [],
                    },
                },
            ],
            transaction: t,
        });

        await t.commit();

        res.status(201).json(variation_to_emit);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const deleteProductVariation = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const variation = await Variation.findByPk(id, {
            include: [Product],
        });

        if (!variation) {
            return res.status(404).json({
                message: `La variacion del producto proporcionado no fue encontrada.`,
            });
        }

        //Permission Check
        if (variation.product.businessId !== user.businessId) {
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        //Checking if exist products with variations
        const found = await StockAreaVariation.findAll({
            where: {
                variationId: id,
            },
        });

        if (found.length !== 0) {
            return res.status(400).json({
                message: `La operación no fue completada porque existen productos asociados a la variación proporcionada.`,
            });
        }

        await variation.destroy();

        res.status(200).json({
            message: "Operation completed",
        });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const editProductVariation = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { price, enablePrice, onSalePrice, attributes, ...params } =
            req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const variation = await Variation.findByPk(id, {
            include: [
                Product,
                {
                    model: Price,
                    as: "price",
                },
                {
                    model: Price,
                    as: "onSalePrice",
                },
                {
                    model: ProductAttribute,
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!variation) {
            t.rollback();
            return res.status(404).json({
                message: `La variación proporcionada no fue encontrada.`,
            });
        }

        //Permission Check
        if (variation.product.businessId !== user.businessId) {
            t.rollback();
            return res.status(401).json({
                message: `No está autorizado a realizar operaciones sobre este producto.`,
            });
        }

        const modelKeys = Object.keys(Variation.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "productId", "createdAt", "updatedAt", "deletedAt"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `No puede modificar el atributo ${att}.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(400).json({ message });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                variation[att] = params[att];
            }
        });

        if (enablePrice) {
            if (price) {
                if (variation.price) {
                    variation.price.amount = price.amount;
                    variation.price.codeCurrency = price.codeCurrency;

                    await variation.price.save({ transaction: t });
                } else {
                    const new_price = Price.build({
                        amount: price.amount,
                        codeCurrency: price.codeCurrency,
                    });

                    await new_price.save({ transaction: t });
                    variation.priceId = new_price.id;
                }
            } else {
                t.rollback();
                return res.status(400).json({
                    message: `Debe definirle un precio a la variación.`,
                });
            }
        } else {
            if (variation.price) {
                await variation.price.destroy({ transaction: t });
            }
        }

        if (onSalePrice) {
            if (variation.onSalePrice) {
                variation.onSalePrice.amount = onSalePrice.amount;
                variation.onSalePrice.codeCurrency = onSalePrice.codeCurrency;
                await variation.onSalePrice.save({ transaction: t });
            } else {
                const new_price = Price.build({
                    amount: onSalePrice.amount,
                    codeCurrency: onSalePrice.codeCurrency,
                });

                await new_price.save({ transaction: t });
                variation.onSalePriceId = new_price.id;
            }
        }

        //Attributes
        let name: Array<string> = [];
        if (attributes) {
            let uniqueAtt: Array<string> = [];
            if (variation.attributes) {
                for (const att of variation.attributes) {
                    if (!uniqueAtt.includes(att.code)) {
                        uniqueAtt.push(att.code);
                    }
                }

                if (uniqueAtt.length !== Object.keys(attributes).length) {
                    t.rollback();
                    return res.status(401).json({
                        message: `La cantidad de atributos proporcionada no cubre todas las posibilidades.`,
                    });
                }
            }

            let editBulk = [];
            for (const att of Object.keys(attributes)) {
                const found_att_product = variation.attributes?.find(
                    item => item.code === att
                );

                if (!found_att_product) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La variación ${att} no fue encontrada`,
                    });
                }

                editBulk.push({
                    id: found_att_product.id,
                    value: attributes[att],
                });

                name.push(`${attributes[att]}`);
            }

            await ProductAttribute.bulkCreate(editBulk, {
                updateOnDuplicate: ["value"],
                transaction: t,
            });

            variation.name = name.join(",");
        }

        await variation.save({ transaction: t });

        const variation_to_emit = await Variation.scope("to_return").findByPk(
            variation.id,
            {
                transaction: t,
            }
        );

        await t.commit();
        res.status(201).json(variation_to_emit);
    } catch (error: any) {
        t.rollback();
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};
