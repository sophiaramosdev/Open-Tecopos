import { Op, where, fn, col } from "sequelize";

import Product from "../../database/models/product";
import ProductRawRecipe from "../../database/models/productRawRecipe";
import Recipe from "../../database/models/recipe";
import Supply from "../../database/models/supply";
import Logger from "../../lib/logger";
import User from "../../database/models/user";
import BusinessBranch from "../../database/models/businessBranch";
import moment from "moment";
import Event from "../../database/models/event";
import SelledProduct from "../../database/models/selledProduct";
import OrderReceipt from "../../database/models/orderReceipt";
import { order_receipt_status } from "../../interfaces/nomenclators";

export const hasCircularDependency = async (
    productId: number,
    restrictProductId: number
): Promise<boolean> => {
    let checkControl = 0;
    let listDependenciesProduct: Array<number> = [];

    const getSupplies = async (id: number) => {
        checkControl++;
        const supplies = await Supply.findAll({
            where: {
                baseProductId: id,
            },
        });

        listDependenciesProduct = listDependenciesProduct.concat(
            supplies.map(item => item.supplyId)
        );

        if (checkControl > 100) {
            Logger.warn(
                `El producto ${productId} tiene una dependencia que excede las 100 iteraciones`
            );
            return;
        }

        for await (const supply of supplies) {
            await getSupplies(supply.supplyId);
        }
    };

    await getSupplies(productId);

    const foundCircularDependency = listDependenciesProduct.some(
        item => item === Number(restrictProductId)
    );

    if (foundCircularDependency) {
        return true;
    }

    return false;
};

export const getAllBranchBusiness = async (
    user: User,
    enforcePermission?: boolean
): Promise<Array<number>> => {
    let enforcement = enforcePermission || true;
    const isGroupOwner = user.roles?.find(item => item.code === "GROUP_OWNER");

    if (!isGroupOwner && enforcement) {
        return [user.businessId];
    }

    //@ts-ignore
    const originalBusinessId = user.originalBusinessId || user.businessId;

    let moreBusiness: Array<number> = [user.businessId];
    const branches = await BusinessBranch.findAll({
        where: {
            businessBaseId: originalBusinessId,
        },
    });

    if (branches.length !== 0) {
        moreBusiness = [originalBusinessId].concat(
            branches.map(item => item.branchId)
        );
    }

    return moreBusiness;
};

export const hasRecipeCircularDependency = async (
    productId: number,
    restrictRecipeId: number
): Promise<boolean> => {
    let checkControl = 0;
    let listDependenciesRecipes: Array<number> = [];

    const getRecipes = async (id: number) => {
        checkControl++;
        const recipes = await Recipe.findAll({
            include: [
                {
                    model: ProductRawRecipe,
                    where: {
                        productId: id,
                    },
                    include: [
                        {
                            model: Product,
                            where: {
                                recipeId: {
                                    [Op.not]: null,
                                },
                            },
                        },
                    ],
                },
            ],
        });

        listDependenciesRecipes = listDependenciesRecipes.concat(
            recipes.map(item => item.id)
        );

        if (listDependenciesRecipes.includes(restrictRecipeId)) {
            return;
        }

        if (checkControl > 100) {
            Logger.warn(
                `El producto ${productId} tiene una dependencia que excede las 100 iteraciones`
            );
            return;
        }

        for await (const recipe of recipes) {
            const rawProducts = await ProductRawRecipe.findAll({
                where: {
                    recipeId: recipe.id,
                },
                include: [
                    {
                        model: Product,
                        where: {
                            recipeId: {
                                [Op.not]: null,
                            },
                        },
                    },
                ],
            });

            for await (const productRecipe of rawProducts) {
                await getRecipes(productRecipe.productId);
            }
        }
    };

    await getRecipes(productId);

    const foundCircularDependency = listDependenciesRecipes.some(
        item => item === Number(restrictRecipeId)
    );

    if (foundCircularDependency) {
        return true;
    }

    return false;
};


export function getDiffDays(deadline: Date) {

    const paymentDate = moment(deadline);
    const now = moment();

    const diffDays = now.diff(paymentDate, 'days');

    return Math.ceil(diffDays);

}

interface AvailabilityCheckParams {
    startAt: string;
    endAt: string;
    businessId: number;
    ignoreId?: Array<number | string>
    focusId?: Array<number | string>
}
export async function checkEventAvailability({ startAt, endAt, businessId, ignoreId }: AvailabilityCheckParams): Promise<boolean> {

    let where: any = {}

    if (ignoreId) {
        where.id = {
            [Op.notIn]: ignoreId
        }
    }

    // console.log()
    // console.log({ startAt, endAt, businessId, ignoreId })
    // console.log()

    const existingEvents = await Event.findAll({
        where: {
            businessId,
            startAt: {
                [Op.between]: [
                    moment(startAt, "YYYY-MM-DD HH:mm").startOf("day").toDate(),
                    moment(endAt, "YYYY-MM-DD HH:mm").endOf("day").toDate(),
                ],
            },
            ...where
        }
    });

    return existingEvents.length > 0;
}

export async function checkReservationAvailability({ startAt, endAt, businessId, ignoreId, focusId }: AvailabilityCheckParams): Promise<boolean> {

    let where: any = {}

    if (ignoreId) {
        where.id = {
            [Op.notIn]: ignoreId
        }
    }
    if (focusId) {
        where.productId = focusId
    }

    // console.log("=============================")
    // console.log({ startAt, endAt, businessId, ignoreId, focusId })
    // console.log("=============================")

    const existingReservations = await SelledProduct.findAll({
        where: {
            startDateAt: {
                [Op.between]: [
                    moment(startAt, "YYYY-MM-DD HH:mm").startOf("day").toDate(),
                    moment(endAt, "YYYY-MM-DD HH:mm").endOf("day").toDate(),
                ],
            },
            ...where
        },
        include: [{ model: OrderReceipt, where: { businessId, status: ["BILLED", "CREATED", "PAYMENT_PENDING", "OVERDUE"] } }]
    });

    // console.log(existingReservations)
    return existingReservations.length > 0;
}