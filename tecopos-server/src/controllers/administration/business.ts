import { Response } from "express";
import db from "../../database/connection";

import User from "../../database/models/user";
import Business from "../../database/models/business";
import Address from "../../database/models/address";
import SocialNetwork from "../../database/models/socialNetwork";
import Image from "../../database/models/image";
import Phone from "../../database/models/phone";
import ImageBusiness from "../../database/models/imageBusiness";
import PhoneBusiness from "../../database/models/phoneBusiness";
import { getUrlSocialNetwork } from "../../helpers/utils";
import Logger from "../../lib/logger";
import { myBusinessToReturn } from "../helpers/business";

//Business
export const editMyBusiness = async (req: any, res: Response) => {
    const t = await db.transaction();
    try {
        const { images, address, phones, socialNetworks, ...params } = req.body;
        const user: User = req.user;

        const paramsKey = Object.keys(params);

        const business = await Business.findByPk(user.businessId, {
            include: [
                Address,
                SocialNetwork,
                {
                    model: Image,
                    as: "images",
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Phone,
                    through: {
                        attributes: [],
                    },
                },
            ],
        });

        if (!business) {
            t.rollback();
            return res.status(400).json({
                message: `Su usuario no tiene ningún negocio asociado. Acceso denegado.`,
            });
        }

        //Checking email
        if (params.email !== undefined && params.email !== "") {
            if (
                !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
                    params.email
                )
            ) {
                t.rollback();
                return res.status(400).json({
                    message: `El correo electrónico proporcionado no es válido.`,
                });
            } else {
                business.email = params.email;
            }
        } else {
            //@ts-ignore
            business.email = null;
        }

        const allowedAttributes = [
            "name",
            "promotionalText",
            "description",
            "email",
            "footerTicket",
            "color",
            "openHours",
            "bannerId",
            "logoId",
            "logoTicketId",
            "indexSinTerceros",
            "includeShop",
            "enableManagementOrders",
        ];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                business[att] = params[att];
            }
        });

        //Images
        if (images) {
            const images_found = await Image.findAll({
                where: {
                    id: images,
                },
            });

            let bulkImagesCreate = [];
            let bulkToDelete = business.images?.map(item => item.id);

            for (const imageId of images) {
                const exist = images_found.find(item => item.id == imageId);

                if (!exist) {
                    t.rollback();
                    return res.status(400).json({
                        message: `La imagen con id ${imageId} no fue encontrada.`,
                    });
                }

                //Checking if is already in product
                const isInProduct = business.images?.find(
                    item => item.id === imageId
                );

                if (isInProduct) {
                    bulkToDelete = bulkToDelete?.filter(
                        item => item !== imageId
                    );
                } else {
                    bulkImagesCreate.push({
                        imageId,
                        businessId: business.id,
                    });
                }
            }

            await ImageBusiness.bulkCreate(bulkImagesCreate, {
                transaction: t,
            });
            await Image.destroy({
                where: {
                    id: bulkToDelete,
                },
            });
        }

        if (address) {
            if (business.address) {
                await Address.update(address, {
                    where: {
                        id: business.addressId,
                    },
                    transaction: t,
                });
            } else {
                const new_address = Address.build(address);
                await new_address.save({ transaction: t });
                business.addressId = new_address.id;
            }
        }

        if (phones) {
            //Removing other phones
            const phone_business = await PhoneBusiness.findAll({
                where: {
                    businessId: business.id,
                },
            });

            if (phone_business.length !== 0) {
                await PhoneBusiness.destroy({
                    where: {
                        businessId: business.id,
                    },
                    transaction: t,
                });

                await Phone.destroy({
                    where: {
                        id: phone_business.map(item => item.phoneId),
                    },
                    transaction: t,
                });
            }

            //Creting new phones
            const phones_created = await Phone.bulkCreate(phones, {
                transaction: t,
                returning: true,
            });

            let addBulk = [];
            for (let phone of phones_created) {
                addBulk.push({
                    businessId: business.id,
                    phoneId: phone.id,
                });
            }

            await PhoneBusiness.bulkCreate(addBulk, { transaction: t });
        }

        if (socialNetworks) {
            let addBulkSocial: any = [];
            let updatedBulkSocial: any = [];
            let notToDelete: Array<string> = [];
            let deleteIds: Array<number> = [];

            socialNetworks.forEach((social: any) => {
                const found = business.socialNetworks.find(
                    item => item.type === social.type
                );

                if (found) {
                    updatedBulkSocial.push({
                        id: found.id,
                        user: social.user,
                        url: `${getUrlSocialNetwork(found.type)}${social.user}`,
                    });
                    notToDelete.push(social.type);
                } else {
                    addBulkSocial.push({
                        user: social.user,
                        url: `${getUrlSocialNetwork(social.type)}${
                            social.user
                        }`,
                        type: social.type,
                        businessId: user.businessId,
                    });
                }
            });

            //Filtering to delete
            business.socialNetworks.forEach(item => {
                if (!notToDelete.includes(item.type)) {
                    deleteIds.push(item.id);
                }
            });

            await SocialNetwork.bulkCreate(addBulkSocial, { transaction: t });
            await SocialNetwork.bulkCreate(updatedBulkSocial, {
                updateOnDuplicate: ["user", "url"],
                transaction: t,
            });

            await SocialNetwork.destroy({
                where: {
                    id: deleteIds,
                },
                transaction: t,
            });
        }

        await business.save({ transaction: t });

        await t.commit();

        const business_to_emit = await myBusinessToReturn(user);

        if (!business_to_emit) {
            return res.status(404).json({
                message: `User has not a business associated`,
            });
        }

        res.status(200).json(business_to_emit);

        //Emit via socket
        (global as any).socket
            .to(`business:${user.businessId}`)
            .emit("business/update", {
                data: {
                    business: business_to_emit,
                },
                from: user.id,
                fromName: user.displayName || user.email,
                origin: req.header("X-App-Origin"),
            });
    } catch (error: any) {
        Logger.error(error, {
            "X-App-Origin": req.header("X-App-Origin"),
            businessId: req.business.id,
            userId: req.user.id,
        });
        t.rollback();
        res.status(500).json({
            message:
                error.toString() ||
                "Ha ocurrido un error interno. Por favor consulte al administrador.",
        });
    }
};

export const getMyBusiness = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const business = await myBusinessToReturn(user);

        if (!business) {
            return res.status(404).json({
                message: `User has not a business associated`,
            });
        }

        res.status(200).json(business);
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

export const getMyBranches = async (req: any, res: Response) => {
    try {
        const user: User = req.user;

        const business = await Business.findByPk(user.businessId);

        if (!business) {
            return res.status(404).json({
                message: `User has not a business associated`,
            });
        }

        //Obtaining the associated business
        let branches: any = [];
        if (
            business.mode === "GROUP" &&
            user.roles?.map(item => item.code).includes("GROUP_OWNER")
        ) {
            const extend_business = await Business.findByPk(business.id, {
                include: [
                    {
                        model: Business,
                        as: "branches",
                        through: {
                            attributes: [],
                        },
                        attributes: ["id", "name"],
                        include: [
                            {
                                model: Image,
                                as: "logo",
                                attributes: [
                                    "id",
                                    "src",
                                    "thumbnail",
                                    "blurHash",
                                ],
                            },
                        ],
                        order: ["name", "ASC"],
                    },
                ],
            });

            if (extend_business && extend_business?.branches?.length !== 0) {
                const main_business = await Business.findByPk(user.businessId, {
                    attributes: ["id", "name"],
                    include: [
                        {
                            model: Image,
                            as: "logo",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                });

                branches = [
                    {
                        //@ts-ignore
                        ...main_business.dataValues,
                        isMain: true,
                    },
                    ...(extend_business.branches || []),
                ];
            }
        }

        res.status(200).json(branches);
    } catch (error: any) {
        console.log(error);
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
