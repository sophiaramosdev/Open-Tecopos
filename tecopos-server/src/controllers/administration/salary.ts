import { Response } from "express";
import { Op, where, fn, col } from "sequelize";
import db from "../../database/connection";

import { pag_params } from "../../database/pag_params";
import User from "../../database/models/user";
import Logger from "../../lib/logger";
import PersonPost from "../../database/models/personPost";
import SalaryRule from "../../database/models/salaryRule";
import { getAllBranchBusiness } from "../helpers/utils";
import PersonCategory from "../../database/models/personCategory";
import Business from "../../database/models/business";
import ConfigurationKey from "../../database/models/configurationKey";
import moment, { Moment } from "moment";
import EconomicCycle from "../../database/models/economicCycle";
import Person from "../../database/models/person";
import {
    CycleDataReportItem,
    SalaryReportItem,
    SimplePrice,
} from "../../interfaces/commons";
import PersonAccessRecord from "../../database/models/personAccessRecord";
import {
    getBaseReferenceOpenAndCloseAt,
    mathOperation,
    truncateValue,
} from "../../helpers/utils";
import Store from "../../database/models/store";
import { GeneralAreaIncome } from "../../interfaces/models";
import OrderReceipt from "../../database/models/orderReceipt";
import OrderReceiptPrice from "../../database/models/orderReceiptPrice";
import ProductionTicket from "../../database/models/productionTicket";
import AvailableCurrency from "../../database/models/availableCurrency";
import Currency from "../../database/models/currency";
import SalaryReport from "../../database/models/salaryReport";
import SalaryReportPerson from "../../database/models/salaryReportPerson";
import Image from "../../database/models/image";
import {
    getBusinessConfigCache,
    getCurrenciesCache,
} from "../../helpers/redisStructure";

export const newSalaryRule = async (req: any, res: Response) => {
    try {
        const { ...params } = req.body;
        const user: User = req.user;

        //Obtaining all branch business if exist
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(params.businessId || user.businessId)) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const salaryRule: SalaryRule = SalaryRule.build({
            ...params,
        });

        await salaryRule.save();

        const to_return = await SalaryRule.scope("to_return").findByPk(
            salaryRule.id
        );

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

export const editSalaryRule = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(SalaryRule.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt"].forEach(att => {
            if (paramsKey.includes(att)) {
                message = `You are not allowed to change ${att} attribute.`;
            }
        });

        if (message) {
            return res.status(406).json({ message });
        }

        //Obtaining all branch business if exist
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        const salaryRule = await SalaryRule.findOne({
            where: {
                id,
                businessId: moreBusiness,
            },
        });

        if (!salaryRule) {
            return res.status(404).json({
                message: `SalaryRule not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                salaryRule[att] = params[att];
            }
        });

        await salaryRule.save();

        const to_return = await SalaryRule.scope("to_return").findByPk(
            salaryRule.id
        );
        res.status(200).json(to_return);
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

export const findAllSalaryRules = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data, ...params } =
            req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};

        //Searchable
        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.and] = [
                where(fn("unaccent", col("SalaryRule.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["name", "ASC"]];
        }

        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_salary_rules = await SalaryRule.findAndCountAll({
            attributes: [
                "id",
                "name",
                "isFixedSalary",
                "counting",
                "amountFixedSalary",
                "referencePercent",
                "percentAmountToIncrement",
                "percentAmountToDecrement",
                "reference",
                "includeTips",
                "modeTips",
                "amountTip",
                "divideEquivalentByPost",
                "codeCurrency",
                "includeRechargeInSpecialHours",
                "specialHours",
                "restrictionsByDays",
                "amountSpecialHours",
                "restrictedDays",
            ],
            include: [
                {
                    model: PersonPost,
                    attributes: ["id", "name"],
                },
                {
                    model: PersonCategory,
                    attributes: ["id", "name"],
                },
                {
                    model: Business,
                    attributes: ["id", "name"],
                },
            ],
            distinct: true,
            where: { businessId: moreBusiness, ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_salary_rules.count / limit);
        if (found_salary_rules.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_salary_rules.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_salary_rules.rows,
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

export const deleteSalaryRule = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const salaryRule = await SalaryRule.findByPk(id);

        if (!salaryRule) {
            return res.status(404).json({
                message: `SalaryRule not found`,
            });
        }

        //Obtaining all branch business if exist
        const moreBusiness: Array<number> = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(salaryRule.businessId)&& !user.isSuperAdmin) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await salaryRule.destroy();

        res.status(200).json({
            message: `State deleted successfully`,
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

export const processSalaryReport = async (req: any, res: Response) => {
    try {
        //Enought time to process this request
        req.setTimeout(300000); //5 minutes = 60*5*1000

        const { startsAt, endsAt, businessId, codeCurrency, businesses, name } =
            req.body;
        const user: User = req.user;

        //Legacy in order to receive more businesses
        const receivedBusinesses: Array<number> = businesses
            ? businesses
            : [businessId];

        //Gell all business to check permissions
        const moreBusiness = await getAllBranchBusiness(user);

        if (
            receivedBusinesses.some(
                item => !moreBusiness.includes(Number(item))
            ) ||
            !moreBusiness.includes(user.businessId)
        ) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        //Business details
        const businessDetails = await Business.findAll({
            where: {
                id: receivedBusinesses,
            },
        });

        //General Data
        let transformedMatrix: Array<SalaryReportItem> = [];
        //Store of economicCycleData
        let listEconomicCycleData: Array<{
            id: number;
            startsAt: string;
            endsAt: string;
            totalSales: SimplePrice[];
            totalIncomes: SimplePrice[];
            totalTips: SimplePrice[];
            amountPeopleWorked: number;
            totalSalesInMainCurrency: number;
            totalIncomesInMainCurrency: number;
            totalTipsInMainCurrency: number;
            peopleByPost: Array<{
                postName: string;
                postId: number;
                amountPeople: number;
                businessId: number;
            }>;
            amountPeopleToIncludeInTips: number;
            businessId: number;
            businessName: string;
        }> = [];

        //Limit to determine where or not in a cycle
        const limit_edge_in_minutes_ecocycles = 140;

        //Iterating each business
        for (const business of receivedBusinesses) {
            const businessData = businessDetails.find(
                item => item.id === business
            );

            //Obtaining all rules
            const allRules = await SalaryRule.findAll({
                where: {
                    businessId: business,
                },
            });

            //Open and close dates configurations
            const configurations = await getBusinessConfigCache(business);

            const enforce_business_open_close =
                configurations.find(
                    item => item.key === "enforce_business_open_close"
                )?.value === "true";

            let business_startsat_working_hours = "0";
            let business_endsat_working_hours = "23";
            if (enforce_business_open_close) {
                business_startsat_working_hours =
                    configurations.find(
                        item => item.key === "business_startsat_working_hours"
                    )?.value || "0";
                business_endsat_working_hours =
                    configurations.find(
                        item => item.key === "business_endsat_working_hours"
                    )?.value || "23";
            }

            //Amount of Working days
            const resultInit = getBaseReferenceOpenAndCloseAt(
                business_startsat_working_hours,
                business_endsat_working_hours,
                startsAt
            );

            const resultEnds = getBaseReferenceOpenAndCloseAt(
                business_startsat_working_hours,
                business_endsat_working_hours,
                endsAt
            );

            let control: Array<{
                startsAt: string;
                endsAt: string;
                listEconomicCycles: Array<{
                    id: number;
                    startsAt: string;
                    endsAt: string;
                }>;
            }> = [];

            let iterator = resultInit;
            while (iterator.workStartsAt.isBefore(resultEnds.workEndsAt)) {
                const foundEconomicCycles = await EconomicCycle.findAll({
                    where: {
                        createdAt: {
                            [Op.gte]: iterator.workStartsAt.format(
                                "YYYY-MM-DD HH:mm:ss"
                            ),
                            [Op.lte]: iterator.workEndsAt.format(
                                "YYYY-MM-DD HH:mm:ss"
                            ),
                        },
                        businessId: business,
                    },
                });

                control.push({
                    startsAt: iterator.workStartsAt.format(
                        "YYYY-MM-DD HH:mm:ss"
                    ),
                    endsAt: iterator.workEndsAt.format("YYYY-MM-DD HH:mm:ss"),
                    listEconomicCycles: foundEconomicCycles.map(item => {
                        return {
                            id: item.id,
                            startsAt: moment(item.openDate).format(
                                "YYYY-MM-DD HH:mm"
                            ),
                            endsAt: moment(item.closedDate).format(
                                "YYYY-MM-DD HH:mm"
                            ),
                        };
                    }),
                });

                const nextDay = iterator.workStartsAt
                    .add(1, "day")
                    .format("YYYY-MM-DD");
                iterator = getBaseReferenceOpenAndCloseAt(
                    business_startsat_working_hours,
                    business_endsat_working_hours,
                    nextDay
                );
            }

            let allECSaved: Array<{
                id: number;
                startsAt: string;
                endsAt: string;
            }> = [];
            control.forEach(item => {
                allECSaved = allECSaved.concat(item.listEconomicCycles);
            });

            const foundAllStore = await Store.findAll({
                where: {
                    type: "EC_INCOME_GENERAL",
                    economicCycleId: allECSaved.map(item => item.id),
                },
            });

            //Formating data in main currency
            const availableCurrencies = await getCurrenciesCache(business);

            //Saving EC data
            for (const economicC of allECSaved) {
                const found = listEconomicCycleData.find(
                    item => item.id === economicC.id
                );
                if (!found) {
                    const foundStore = foundAllStore.find(
                        item => item.economicCycleId === economicC.id
                    );

                    if (foundStore) {
                        const data: GeneralAreaIncome = JSON.parse(
                            foundStore.data
                        );

                        const businessDetail = businessDetails.find(
                            item => item.id === business
                        );

                        let totalSalesMC = 0;
                        let totalIncomesMC = 0;
                        let totalTipsMC = 0;

                        //Sales
                        data.totalSales.forEach(element => {
                            if (element.codeCurrency === codeCurrency) {
                                totalSalesMC = mathOperation(
                                    element.amount,
                                    totalSalesMC,
                                    "addition"
                                );
                            } else {
                                const availableCurrency =
                                    availableCurrencies.find(
                                        item =>
                                            item.currency.code ===
                                            element.codeCurrency
                                    );

                                if (availableCurrency) {
                                    totalSalesMC += mathOperation(
                                        element.amount,
                                        availableCurrency.exchangeRate,
                                        "multiplication",
                                        2
                                    );
                                }
                            }
                        });

                        //Incomes
                        data.totalIncomes.forEach(element => {
                            if (element.codeCurrency === codeCurrency) {
                                totalIncomesMC = mathOperation(
                                    element.amount,
                                    totalIncomesMC,
                                    "addition"
                                );
                            } else {
                                const availableCurrency =
                                    availableCurrencies.find(
                                        item =>
                                            item.currency.code ===
                                            element.codeCurrency
                                    );

                                if (availableCurrency) {
                                    totalIncomesMC += mathOperation(
                                        element.amount,
                                        availableCurrency.exchangeRate,
                                        "multiplication",
                                        2
                                    );
                                }
                            }
                        });

                        //Tips
                        data.totalTips.forEach(element => {
                            if (element.codeCurrency === codeCurrency) {
                                totalTipsMC = mathOperation(
                                    element.amount,
                                    totalTipsMC,
                                    "addition"
                                );
                            } else {
                                const availableCurrency =
                                    availableCurrencies.find(
                                        item =>
                                            item.currency.code ===
                                            element.codeCurrency
                                    );

                                if (availableCurrency) {
                                    totalTipsMC += mathOperation(
                                        element.amount,
                                        availableCurrency.exchangeRate,
                                        "multiplication",
                                        2
                                    );
                                }
                            }
                        });

                        listEconomicCycleData.push({
                            ...economicC,
                            totalSales: data.totalSales,
                            totalIncomes: data.totalIncomes,
                            totalTips: data.totalTips,
                            amountPeopleWorked: 0,
                            totalSalesInMainCurrency: totalSalesMC,
                            totalIncomesInMainCurrency: totalIncomesMC,
                            totalTipsInMainCurrency: totalTipsMC,
                            amountPeopleToIncludeInTips: 0,
                            peopleByPost: [],
                            businessId: business,
                            businessName: businessDetail?.name || ``,
                        });
                    }
                }
            }

            //Forming matrix people
            let matrix: Array<{
                person: any;
                listEconomicCyclesWorked: Array<{
                    id: number;
                    startsAt: string;
                    endsAt: string;
                }>;
                listDaysWorked: Array<string>;
                entries: Array<string>;
                exits: Array<string>;
                counting: "cycles" | "days" | "unique" | undefined;
                amountHoursWorked: number;
                totalOrdersSalesInPOS: Array<SimplePrice>;
                totalOrdersManaged: Array<SimplePrice>;
                totalOrdersManagedByZone: Array<SimplePrice>;
                totalOrdersServed: Array<SimplePrice>;
                totalProductsProduced: Array<SimplePrice>;
                referencePercent: number;
                totalSales: Array<SimplePrice>;
                totalReferenceToPay: Array<SimplePrice>;
                totalReferenceToPayInMainCurrency: SimplePrice;
                percentIncreased: number;
                percentDecresed: number;
                tips: SimplePrice;
                realToPay: SimplePrice;
                fixedAmount: SimplePrice;
                specialHours: SimplePrice;
                observations: string;
            }> = [];

            const blankItem = {
                entries: [],
                exits: [],
                counting: undefined,
                listEconomicCyclesWorked: [],
                listDaysWorked: [],
                amountHoursWorked: 0,
                totalOrdersSalesInPOS: [],
                totalOrdersManaged: [],
                totalOrdersManagedByZone: [],
                totalOrdersServed: [],
                totalProductsProduced: [],
                referencePercent: 0,
                totalSales: [],
                totalReferenceToPay: [],
                percentIncreased: 0,
                percentDecresed: 0,
                fixedAmount: {
                    amount: 0,
                    codeCurrency: codeCurrency,
                },
                specialHours: {
                    amount: 0,
                    codeCurrency: codeCurrency,
                },
                tips: {
                    amount: 0,
                    codeCurrency: codeCurrency,
                },
                realToPay: {
                    amount: 0,
                    codeCurrency: codeCurrency,
                },
                totalReferenceToPayInMainCurrency: {
                    amount: 0,
                    codeCurrency: codeCurrency,
                },
                observations: "",
            };

            //1. Obtaining orders for working later
            const allOrders = await OrderReceipt.findAll({
                where: {
                    businessId: business,
                    status: "BILLED",
                    houseCosted: false,
                    createdAt: {
                        [Op.gte]: resultInit.workStartsAt.format(
                            "YYYY-MM-DD HH:mm:ss"
                        ),
                        [Op.lte]: resultEnds.workEndsAt.format(
                            "YYYY-MM-DD HH:mm:ss"
                        ),
                    },
                },
                include: [OrderReceiptPrice, ProductionTicket],
            });

            //2. Finding all people record acess
            const allPeopleRecords = await PersonAccessRecord.findAll({
                include: [
                    {
                        model: Person,
                        include: [
                            {
                                model: PersonPost,
                                attributes: ["id", "name"],
                            },
                            {
                                model: PersonCategory,
                                attributes: ["id", "name"],
                            },
                        ],
                    },
                ],
                where: {
                    createdAt: {
                        [Op.gte]: moment(startsAt, "YYYY-MM-DD HH:mm").format(
                            "YYYY-MM-DD HH:mm:ss"
                        ),
                        [Op.lte]: moment(endsAt, "YYYY-MM-DD HH:mm").format(
                            "YYYY-MM-DD HH:mm:ss"
                        ),
                    },
                },
            });

            //3. Finding all people to process
            const allPeople = await Person.findAll({
                where: {
                    businessId: business,
                    isActive: true,
                },
                include: [PersonCategory, PersonPost],
            });

            //4. Analyzing each person
            for (const person of allPeople) {
                //4.1 Finding all rules by post and categories
                const rulesByPost = allRules.filter(
                    item =>
                        item.postId === person.postId &&
                        item.personCategoryId === person.personCategoryId
                );

                const bodyPerson = {
                    id: person.id,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    personCategory: {
                        id: person.personCategory?.id,
                        name: person.personCategory?.name,
                    },
                    post: {
                        id: person.post?.id,
                        name: person.post?.name,
                    },
                    business: {
                        id: businessData?.id,
                        name: businessData?.name,
                    },
                    userId: person.userId,
                    postId: person.postId,
                    personCategoryId: person.personCategoryId,
                };

                if (rulesByPost.length === 0) {
                    matrix.push({
                        ...blankItem,
                        person: bodyPerson,
                        observations: `No se encontraron reglas para esta persona con ${
                            person.post ? person.post?.name : `cargo indefinido`
                        } y ${
                            person.personCategory
                                ? person.personCategory?.name
                                : `categoría indefinida`
                        }`,
                    });
                    continue;
                }

                //4.2 Getting counting
                const counting = rulesByPost[0].counting;
                if (rulesByPost.some(item => item.counting !== counting)) {
                    return res.status(400).json({
                        message: `Existe más de una regla para el cargo ${person.post?.name} y categoría ${person.personCategory?.name} con modos de conteo diferentes.`,
                    });
                }

                let listECWorked: Array<{
                    id: number;
                    startsAt: string;
                    endsAt: string;
                }> = [];
                let amountHours = 0;
                let idsAdded: Array<number> = [];
                let entries: Array<string> = [];
                let exits: Array<string> = [];
                let listDaysWorked: Array<string> = [];

                if (counting === "cycles") {
                    //4.3.1 Obtaining person records
                    for (const element of control) {
                        let recordsPerson = allPeopleRecords.filter(
                            item =>
                                item.personId === person.id &&
                                moment(item.createdAt).isAfter(
                                    moment(element.startsAt).subtract(
                                        limit_edge_in_minutes_ecocycles,
                                        "minutes"
                                    )
                                ) &&
                                moment(item.createdAt).isBefore(
                                    moment(element.endsAt).add(
                                        limit_edge_in_minutes_ecocycles,
                                        "minutes"
                                    )
                                )
                        );

                        //4.3.2. Obtaining list entries and exits
                        //Removing first record if EXIT
                        if (
                            recordsPerson.length > 0 &&
                            recordsPerson[0].type === "EXIT"
                        ) {
                            recordsPerson.shift();
                        }

                        for (const record of recordsPerson) {
                            if (record.type === "ENTRY") {
                                entries.push(
                                    moment(record.createdAt).format(
                                        "YYYY-MM-DD HH:mm:ss"
                                    )
                                );
                            } else {
                                exits.push(
                                    moment(record.createdAt).format(
                                        "YYYY-MM-DD HH:mm:ss"
                                    )
                                );
                            }
                        }

                        entries.forEach((entry, index) => {
                            element.listEconomicCycles.forEach(item => {
                                const entry = moment(entries[index]);
                                const difference = Math.abs(
                                    entry.diff(moment(item.startsAt), "minutes")
                                );

                                if (
                                    difference <
                                        limit_edge_in_minutes_ecocycles &&
                                    !idsAdded.includes(item.id)
                                ) {
                                    listECWorked.push(item);
                                    idsAdded.push(item.id);
                                }
                            });

                            if (exits[index]) {
                                amountHours += moment(exits[index]).diff(
                                    entry,
                                    "hour"
                                );
                            }
                        });
                    }

                    //Increasing people worked
                    listECWorked.forEach((ecWorked: any) => {
                        const foundCycleInMatrix =
                            listEconomicCycleData.findIndex(
                                item => item.id === ecWorked.id
                            );

                        if (foundCycleInMatrix !== -1) {
                            listEconomicCycleData[foundCycleInMatrix]
                                .amountPeopleWorked++;

                            //Increasing according tip
                            if (rulesByPost.some(item => !!item.includeTips)) {
                                listEconomicCycleData[foundCycleInMatrix]
                                    .amountPeopleToIncludeInTips++;
                            }

                            //Increasing by post
                            const foundPostIndex = listEconomicCycleData[
                                foundCycleInMatrix
                            ].peopleByPost.findIndex(
                                item => item.postId === person.postId
                            );

                            if (foundPostIndex !== -1) {
                                listEconomicCycleData[foundCycleInMatrix]
                                    .peopleByPost[foundPostIndex]
                                    .amountPeople++;
                            } else {
                                listEconomicCycleData[
                                    foundCycleInMatrix
                                ].peopleByPost.push({
                                    postId: person.postId,
                                    amountPeople: 1,
                                    businessId: person.businessId,
                                    postName:
                                        person.post?.name || `Sin definir`,
                                });
                            }
                        }
                    });

                    matrix.push({
                        ...blankItem,
                        person: bodyPerson,
                        amountHoursWorked: amountHours,
                        listEconomicCyclesWorked: listECWorked,
                        counting,
                        entries,
                        exits: exits.sort(
                            //@ts-ignore
                            (a: string, b: string) => moment(a) - moment(b)
                        ),
                    });
                } else if (counting === "days") {
                    const recordsPerson = allPeopleRecords.filter(
                        item => item.personId === person.id
                    );

                    for (const record of recordsPerson) {
                        if (record.type === "ENTRY") {
                            entries.push(
                                moment(record.createdAt).format(
                                    "YYYY-MM-DD HH:mm:ss"
                                )
                            );
                        } else {
                            exits.push(
                                moment(record.createdAt).format(
                                    "YYYY-MM-DD HH:mm:ss"
                                )
                            );
                        }
                    }

                    for (const entry of entries) {
                        const day = moment(entry).format("YYYY-MM-DD");
                        if (!listDaysWorked.includes(day)) {
                            listDaysWorked.push(day);
                        }

                        const foundEconomicCycles =
                            listEconomicCycleData.filter(
                                item =>
                                    moment(item.startsAt).isAfter(
                                        moment(entry).startOf("day")
                                    ) &&
                                    moment(item.startsAt).isBefore(
                                        moment(entry).endOf("day")
                                    )
                            );
                        listECWorked = listECWorked.concat(
                            foundEconomicCycles.map(element => {
                                return {
                                    id: element.id,
                                    startsAt: element.startsAt,
                                    endsAt: element.endsAt,
                                };
                            })
                        );
                    }

                    //Adding person in matrix
                    matrix.push({
                        ...blankItem,
                        person: bodyPerson,
                        amountHoursWorked: amountHours,
                        listEconomicCyclesWorked: listECWorked,
                        listDaysWorked,
                        counting,
                        entries,
                        exits: exits.sort(
                            //@ts-ignore
                            (a: string, b: string) => moment(a) - moment(b)
                        ),
                    });
                } else if (counting === "unique") {
                    matrix.push({
                        ...blankItem,
                        person: bodyPerson,
                        amountHoursWorked: 0,
                        listEconomicCyclesWorked: [],
                        counting,
                        entries,
                        exits: exits.sort(
                            //@ts-ignore
                            (a: string, b: string) => moment(a) - moment(b)
                        ),
                    });
                }
            }

            //5. Populating data
            for (const personMatrix of matrix) {
                let eeData: Array<CycleDataReportItem> = [];

                //Finding all rules by post and categories
                const rulesByPost = allRules.filter(
                    item =>
                        item.postId === personMatrix.person.postId &&
                        item.personCategoryId ===
                            personMatrix.person.personCategoryId
                );

                if (personMatrix.counting === "cycles") {
                    //4.3.1 By cycles
                    for (const economicCycle of personMatrix.listEconomicCyclesWorked) {
                        let body: CycleDataReportItem = {
                            startsAt: economicCycle.startsAt,
                            endsAt: economicCycle.endsAt,
                            economicCycleId: economicCycle.id,
                            totalOrdersSalesInPOS: [],
                            totalOrdersManaged: [],
                            totalOrdersManagedByZone: [],
                            totalOrdersServed: [],
                            totalProductsProduced: [],
                            referencePercent: 0,
                            totalSales: [],
                            totalReferenceToPay: [],
                            percentIncreased: 0,
                            percentDecresed: 0,
                            baseAmount: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            amountFixed: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            specialHours: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            plusAmount: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            tips: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            realToPay: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            totalReferenceToPayInMainCurrency: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            observations: "",
                        };

                        ///4.3.2 Finding individual sales
                        let totalOrdersSalesInPOS: Array<SimplePrice> = [];
                        let totalOrdersManaged: Array<SimplePrice> = [];
                        let totalOrdersServed: Array<SimplePrice> = [];
                        let listOrdersIncluded: Array<number> = [];

                        if (personMatrix.person.userId) {
                            //2.1.1 Obtainig orders sales
                            const orders_sales = allOrders.filter(
                                item =>
                                    item.economicCycleId === economicCycle.id &&
                                    item.salesById ===
                                        personMatrix.person.userId &&
                                    item.managedById ===
                                        personMatrix.person.userId
                            );

                            if (orders_sales.length !== 0) {
                                for (const order of orders_sales) {
                                    listOrdersIncluded.push(order.id);

                                    if (!order.prices) {
                                        body.observations += `No se encontraron precios en la orden #${
                                            order.operationNumber
                                        } del ${moment(order.createdAt).format(
                                            "DD/MM hh:mm A"
                                        )}\n`;
                                    }

                                    order.prices?.forEach(item => {
                                        const isInTotalSales =
                                            totalOrdersSalesInPOS.find(
                                                localPrice =>
                                                    localPrice.codeCurrency ===
                                                    item.codeCurrency
                                            );
                                        if (isInTotalSales) {
                                            totalOrdersSalesInPOS =
                                                totalOrdersSalesInPOS.map(
                                                    localPrice => {
                                                        if (
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                        ) {
                                                            return {
                                                                ...localPrice,
                                                                amount:
                                                                    localPrice.amount +
                                                                    item.price,
                                                            };
                                                        }
                                                        return localPrice;
                                                    }
                                                );
                                        } else {
                                            totalOrdersSalesInPOS.push({
                                                codeCurrency: item.codeCurrency,
                                                amount: item.price,
                                            });
                                        }
                                    });
                                }
                            }

                            //2.1.2 orders managed
                            const orders_managed = allOrders.filter(
                                item =>
                                    item.economicCycleId === economicCycle.id &&
                                    item.managedById ===
                                        personMatrix.person.userId
                            );

                            if (orders_managed.length !== 0) {
                                for (const order of orders_managed) {
                                    if (
                                        listOrdersIncluded.find(
                                            id => id === order.id
                                        )
                                    ) {
                                        continue;
                                    }

                                    listOrdersIncluded.push(order.id);

                                    if (!order.prices) {
                                        body.observations += `No se encontraron precios en la orden #${
                                            order.operationNumber
                                        } del ${moment(order.createdAt).format(
                                            "DD/MM hh:mm A"
                                        )}\n`;
                                    }

                                    order.prices?.forEach(item => {
                                        const isInManagedOrders =
                                            totalOrdersManaged.find(
                                                localPrice =>
                                                    localPrice.codeCurrency ===
                                                    item.codeCurrency
                                            );
                                        if (isInManagedOrders) {
                                            totalOrdersManaged =
                                                totalOrdersManaged.map(
                                                    localPrice => {
                                                        if (
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                        ) {
                                                            return {
                                                                ...localPrice,
                                                                amount:
                                                                    localPrice.amount +
                                                                    item.price,
                                                            };
                                                        }
                                                        return localPrice;
                                                    }
                                                );
                                        } else {
                                            totalOrdersManaged.push({
                                                codeCurrency: item.codeCurrency,
                                                amount: item.price,
                                            });
                                        }
                                    });
                                }
                            }

                            //2.1.3 orders served
                            const filtered = allOrders.filter(
                                item =>
                                    item.economicCycleId === economicCycle.id
                            );
                            let orders_served = [];
                            for (const filterItem of filtered) {
                                const ticketsPeople = filterItem.tickets.map(
                                    item => item.preparedById
                                );
                                if (
                                    ticketsPeople.includes(
                                        personMatrix.person.userId
                                    )
                                ) {
                                    orders_served.push(filterItem);
                                }
                            }

                            if (orders_served.length !== 0) {
                                for (const order of orders_served) {
                                    if (
                                        listOrdersIncluded.find(
                                            id => id === order.id
                                        )
                                    ) {
                                        continue;
                                    }

                                    listOrdersIncluded.push(order.id);

                                    if (!order.prices) {
                                        body.observations += `No se encontraron precios en la orden #${
                                            order.operationNumber
                                        } del ${moment(order.createdAt).format(
                                            "DD/MM hh:mm A"
                                        )}\n`;
                                    }

                                    order.prices?.forEach(item => {
                                        const isInTotalServed =
                                            totalOrdersServed.find(
                                                localPrice =>
                                                    localPrice.codeCurrency ===
                                                    item.codeCurrency
                                            );
                                        if (isInTotalServed) {
                                            totalOrdersServed =
                                                totalOrdersServed.map(
                                                    localPrice => {
                                                        if (
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                        ) {
                                                            return {
                                                                ...localPrice,
                                                                amount:
                                                                    localPrice.amount +
                                                                    item.price,
                                                            };
                                                        }
                                                        return localPrice;
                                                    }
                                                );
                                        } else {
                                            totalOrdersServed.push({
                                                codeCurrency: item.codeCurrency,
                                                amount: item.price,
                                            });
                                        }
                                    });
                                }
                            }
                        }

                        ///4.3.3 Obtaining the dominant rule
                        let rule;
                        if (rulesByPost.length === 1) {
                            rule = rulesByPost[0];
                        } else if (rulesByPost.length > 1) {
                            //Analyzing day restriction and selecting it
                            const found = rulesByPost.filter(
                                item => item.restrictionsByDays
                            );
                            if (found.length > 0) {
                                const rawDay = moment(
                                    economicCycle.startsAt
                                ).format("YYYY-MM-DD");
                                const dayOfWeek = moment(rawDay, "YYYY-MM-DD")
                                    .utc(false)
                                    .weekday();
                                const ruleDayRestriction = rulesByPost.filter(
                                    item =>
                                        item.restrictionsByDays &&
                                        item.restrictedDays
                                            .split(",")
                                            .includes(dayOfWeek.toString())
                                );

                                if (ruleDayRestriction.length === 1) {
                                    rule = ruleDayRestriction[0];
                                } else {
                                    return res.status(400).json({
                                        message: `Existe más de una regla para el cargo ${personMatrix.person.post?.name} y categoría ${personMatrix.person.personCategory?.name} para el día ${dayOfWeek}`,
                                    });
                                }
                            }
                        }

                        if (!rule) {
                            body.observations += `No se encontraron reglas para esta persona en el ciclo ${moment(
                                economicCycle.startsAt
                            ).format("DD/MM HH:mm")}\n`;
                            continue;
                        }

                        ///4.3.4 Applying rules
                        if (!rule.isFixedSalary) {
                            switch (rule.reference) {
                                case "totalSales":
                                    const economicGeneralData =
                                        listEconomicCycleData.find(
                                            item => item.id === economicCycle.id
                                        );
                                    if (economicGeneralData) {
                                        if (!economicGeneralData.totalSales) {
                                            body.observations += `No se encontraron datos en economicGeneralData.totalSales Regla ${rule.name}\n`;
                                        }

                                        economicGeneralData.totalSales?.forEach(
                                            item => {
                                                const isInTotal =
                                                    body.totalSales.find(
                                                        localPrice =>
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                    );
                                                if (isInTotal) {
                                                    body.totalSales =
                                                        body.totalSales.map(
                                                            localPrice => {
                                                                if (
                                                                    localPrice.codeCurrency ===
                                                                    item.codeCurrency
                                                                ) {
                                                                    return {
                                                                        ...localPrice,
                                                                        amount:
                                                                            localPrice.amount +
                                                                            item.amount,
                                                                    };
                                                                }
                                                                return localPrice;
                                                            }
                                                        );
                                                } else {
                                                    body.totalSales.push({
                                                        codeCurrency:
                                                            item.codeCurrency,
                                                        amount: item.amount,
                                                    });
                                                }
                                            }
                                        );

                                        //Updating in totalReferenceToPay
                                        body.totalSales.forEach(item => {
                                            const isInTotal =
                                                body.totalReferenceToPay.find(
                                                    localPrice =>
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                );
                                            if (isInTotal) {
                                                body.totalReferenceToPay =
                                                    body.totalReferenceToPay.map(
                                                        localPrice => {
                                                            if (
                                                                localPrice.codeCurrency ===
                                                                item.codeCurrency
                                                            ) {
                                                                return {
                                                                    ...localPrice,
                                                                    amount:
                                                                        localPrice.amount +
                                                                        item.amount,
                                                                };
                                                            }
                                                            return localPrice;
                                                        }
                                                    );
                                            } else {
                                                body.totalReferenceToPay.push({
                                                    codeCurrency:
                                                        item.codeCurrency,
                                                    amount: item.amount,
                                                });
                                            }
                                        });
                                    }

                                    break;

                                case "salesInPos":
                                    if (totalOrdersSalesInPOS.length !== 0) {
                                        totalOrdersSalesInPOS?.forEach(item => {
                                            const isInTotal =
                                                body.totalOrdersSalesInPOS.find(
                                                    localPrice =>
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                );
                                            if (isInTotal) {
                                                body.totalOrdersSalesInPOS =
                                                    body.totalOrdersSalesInPOS.map(
                                                        localPrice => {
                                                            if (
                                                                localPrice.codeCurrency ===
                                                                item.codeCurrency
                                                            ) {
                                                                return {
                                                                    ...localPrice,
                                                                    amount:
                                                                        localPrice.amount +
                                                                        item.amount,
                                                                };
                                                            }
                                                            return localPrice;
                                                        }
                                                    );
                                            } else {
                                                body.totalOrdersSalesInPOS.push(
                                                    {
                                                        ...item,
                                                        amount: item.amount,
                                                    }
                                                );
                                            }
                                        });

                                        //Updating in totalReferenceToPay
                                        body.totalOrdersSalesInPOS.forEach(
                                            item => {
                                                const isInTotal =
                                                    body.totalReferenceToPay.find(
                                                        localPrice =>
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                    );
                                                if (isInTotal) {
                                                    body.totalReferenceToPay =
                                                        body.totalReferenceToPay.map(
                                                            localPrice => {
                                                                if (
                                                                    localPrice.codeCurrency ===
                                                                    item.codeCurrency
                                                                ) {
                                                                    return {
                                                                        ...localPrice,
                                                                        amount:
                                                                            localPrice.amount +
                                                                            item.amount,
                                                                    };
                                                                }
                                                                return localPrice;
                                                            }
                                                        );
                                                } else {
                                                    body.totalReferenceToPay.push(
                                                        {
                                                            codeCurrency:
                                                                item.codeCurrency,
                                                            amount: item.amount,
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    }
                                    break;

                                case "manageOrders":
                                    if (totalOrdersManaged.length !== 0) {
                                        totalOrdersManaged?.forEach(item => {
                                            const isInTotal =
                                                body.totalOrdersManaged.find(
                                                    localPrice =>
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                );
                                            if (isInTotal) {
                                                body.totalOrdersManaged =
                                                    body.totalOrdersManaged.map(
                                                        localPrice => {
                                                            if (
                                                                localPrice.codeCurrency ===
                                                                item.codeCurrency
                                                            ) {
                                                                return {
                                                                    ...localPrice,
                                                                    amount:
                                                                        localPrice.amount +
                                                                        item.amount,
                                                                };
                                                            }
                                                            return localPrice;
                                                        }
                                                    );
                                            } else {
                                                body.totalOrdersManaged.push({
                                                    codeCurrency:
                                                        item.codeCurrency,
                                                    amount: item.amount,
                                                });
                                            }
                                        });

                                        //Updating in totalReferenceToPay
                                        body.totalOrdersManaged.forEach(
                                            item => {
                                                const isInTotal =
                                                    body.totalReferenceToPay.find(
                                                        localPrice =>
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                    );
                                                if (isInTotal) {
                                                    body.totalReferenceToPay =
                                                        body.totalReferenceToPay.map(
                                                            localPrice => {
                                                                if (
                                                                    localPrice.codeCurrency ===
                                                                    item.codeCurrency
                                                                ) {
                                                                    return {
                                                                        ...localPrice,
                                                                        amount:
                                                                            localPrice.amount +
                                                                            item.amount,
                                                                    };
                                                                }
                                                                return localPrice;
                                                            }
                                                        );
                                                } else {
                                                    body.totalReferenceToPay.push(
                                                        {
                                                            codeCurrency:
                                                                item.codeCurrency,
                                                            amount: item.amount,
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    }
                                    break;

                                case "serveOrders":
                                    if (totalOrdersServed.length !== 0) {
                                        totalOrdersServed?.forEach(item => {
                                            const isInTotal =
                                                body.totalOrdersServed.find(
                                                    localPrice =>
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                );
                                            if (isInTotal) {
                                                body.totalOrdersServed =
                                                    body.totalOrdersServed.map(
                                                        localPrice => {
                                                            if (
                                                                localPrice.codeCurrency ===
                                                                item.codeCurrency
                                                            ) {
                                                                return {
                                                                    ...localPrice,
                                                                    amount:
                                                                        localPrice.amount +
                                                                        item.amount,
                                                                };
                                                            }
                                                            return localPrice;
                                                        }
                                                    );
                                            } else {
                                                body.totalOrdersServed.push({
                                                    codeCurrency:
                                                        item.codeCurrency,
                                                    amount: item.amount,
                                                });
                                            }
                                        });

                                        //Updating in totalReferenceToPay
                                        body.totalOrdersServed.forEach(item => {
                                            const isInTotal =
                                                body.totalReferenceToPay.find(
                                                    localPrice =>
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                );
                                            if (isInTotal) {
                                                body.totalReferenceToPay =
                                                    body.totalReferenceToPay.map(
                                                        localPrice => {
                                                            if (
                                                                localPrice.codeCurrency ===
                                                                item.codeCurrency
                                                            ) {
                                                                return {
                                                                    ...localPrice,
                                                                    amount:
                                                                        localPrice.amount +
                                                                        item.amount,
                                                                };
                                                            }
                                                            return localPrice;
                                                        }
                                                    );
                                            } else {
                                                body.totalReferenceToPay.push({
                                                    codeCurrency:
                                                        item.codeCurrency,
                                                    amount: item.amount,
                                                });
                                            }
                                        });
                                    }
                                    break;
                            }

                            //4.3.4.1 In case post and category dont apply
                            if (
                                totalOrdersSalesInPOS.length !== 0 &&
                                !["salesInPos", "totalSales"].includes(
                                    rule.reference
                                )
                            ) {
                                totalOrdersSalesInPOS?.forEach(item => {
                                    const isInTotal =
                                        body.totalOrdersSalesInPOS.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalOrdersSalesInPOS =
                                            body.totalOrdersSalesInPOS.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalOrdersSalesInPOS.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });

                                //Updating in totalReferenceToPay
                                body.totalOrdersSalesInPOS.forEach(item => {
                                    const isInTotal =
                                        body.totalReferenceToPay.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalReferenceToPay =
                                            body.totalReferenceToPay.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalReferenceToPay.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });
                            }

                            if (
                                totalOrdersManaged.length !== 0 &&
                                !["manageOrders", "totalSales"].includes(
                                    rule.reference
                                )
                            ) {
                                totalOrdersManaged?.forEach(item => {
                                    const isInTotal =
                                        body.totalOrdersManaged.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalOrdersManaged =
                                            body.totalOrdersManaged.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalOrdersManaged.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });

                                //Updating in totalReferenceToPay
                                body.totalOrdersManaged.forEach(item => {
                                    const isInTotal =
                                        body.totalReferenceToPay.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalReferenceToPay =
                                            body.totalReferenceToPay.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalReferenceToPay.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });
                            }

                            if (
                                totalOrdersServed.length !== 0 &&
                                !["serveOrders", "totalSales"].includes(
                                    rule.reference
                                )
                            ) {
                                totalOrdersServed?.forEach(item => {
                                    const isInTotal =
                                        body.totalOrdersServed.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalOrdersServed =
                                            body.totalOrdersServed.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalOrdersServed.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });

                                //Updating in totalReferenceToPay
                                body.totalOrdersServed.forEach(item => {
                                    const isInTotal =
                                        body.totalReferenceToPay.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalReferenceToPay =
                                            body.totalReferenceToPay.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalReferenceToPay.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });
                            }
                        } else {
                            body.totalReferenceToPay.push({
                                amount: rule.amountFixedSalary,
                                codeCurrency: rule.codeCurrency,
                            });

                            body.amountFixed = {
                                amount: rule.amountFixedSalary,
                                codeCurrency: rule.codeCurrency,
                            };
                        }

                        //4.3.5 Calculating totalReferenceToPay amount
                        //Transforming all in Main Currency
                        body.totalReferenceToPay.forEach(pay => {
                            if (pay.codeCurrency === codeCurrency) {
                                body.totalReferenceToPayInMainCurrency.amount =
                                    mathOperation(
                                        pay.amount,
                                        body.totalReferenceToPayInMainCurrency
                                            .amount,
                                        "addition"
                                    );
                            } else {
                                const availableCurrency =
                                    availableCurrencies.find(
                                        item =>
                                            item.currency.code ===
                                            pay.codeCurrency
                                    );
                                if (availableCurrency) {
                                    body.totalReferenceToPayInMainCurrency.amount +=
                                        mathOperation(
                                            pay.amount,
                                            availableCurrency.exchangeRate,
                                            "multiplication",
                                            2
                                        );
                                }
                            }
                        });

                        //4.3.6 Verifying special hours
                        if (rule.includeRechargeInSpecialHours) {
                            const specialHours = rule.specialHours
                                .split(",")
                                .map(item => {
                                    return item.padStart(2, "0");
                                });

                            if (specialHours.length !== 0) {
                                let hour = moment(economicCycle.startsAt);
                                let includedHours: Array<string> = [];
                                while (
                                    hour.isBefore(moment(economicCycle.endsAt))
                                ) {
                                    includedHours.push(hour.format("HH"));
                                    hour.add(1, "hours");
                                }

                                if (
                                    includedHours.some(item =>
                                        specialHours.includes(item)
                                    )
                                ) {
                                    body.specialHours.amount =
                                        rule.amountSpecialHours;
                                }
                            }
                        }

                        //4.3.7 Analyzing Tip
                        if (rule.includeTips) {
                            const economicGeneralData =
                                listEconomicCycleData.find(
                                    item => item.id === economicCycle.id
                                );

                            if (economicGeneralData) {
                                let partialTip;
                                if (rule.modeTips === "equivalent") {
                                    partialTip = Math.round(
                                        economicGeneralData.totalTipsInMainCurrency /
                                            economicGeneralData.amountPeopleToIncludeInTips
                                    );
                                } else if (rule.modeTips === "percent") {
                                    partialTip = Math.round(
                                        (economicGeneralData.totalTipsInMainCurrency *
                                            rule.amountTip) /
                                            100
                                    );
                                } else {
                                    partialTip = rule.amountTip || 0;
                                }

                                body.tips.amount += partialTip || 0;
                            }
                        }

                        //4.3.8 Calculating totalReferenceToPay and analyzing if person must be increased or decreased
                        let toPayAmount = 0;
                        if (rule.isFixedSalary) {
                            toPayAmount = body.amountFixed.amount;
                        } else {
                            toPayAmount =
                                (body.totalReferenceToPayInMainCurrency.amount *
                                    rule.referencePercent) /
                                100;
                        }
                        body.baseAmount.amount = truncateValue(toPayAmount);

                        //4.3.8.1 Including specialHours
                        if (body.specialHours.amount) {
                            toPayAmount += rule.amountSpecialHours;
                        }

                        //4.3.8.2
                        if (rule.percentAmountToDecrement) {
                            const decrement =
                                (toPayAmount * rule.percentAmountToDecrement) /
                                100;
                            toPayAmount = toPayAmount - decrement;
                            body.plusAmount.amount = Math.abs(decrement) * -1;
                        } else if (rule.percentAmountToIncrement) {
                            const increment =
                                (toPayAmount * rule.percentAmountToDecrement) /
                                100;
                            toPayAmount = toPayAmount + increment;

                            body.plusAmount.amount = increment;
                        }

                        if (body.tips) {
                            toPayAmount += body.tips.amount;
                        }

                        body.realToPay.amount = Math.round(toPayAmount);
                        body.percentDecresed = rule.percentAmountToDecrement;
                        body.percentIncreased = rule.percentAmountToIncrement;

                        eeData.push(body);
                    }

                    //Total
                    let total: any = {
                        totalOrdersSalesInPOS: [],
                        totalOrdersManaged: [],
                        totalOrdersManagedByZone: [],
                        totalOrdersServed: [],
                        totalProductsProduced: [],
                        totalSales: [],
                        totalReferenceToPay: [],
                        specialHours: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        amountFixed: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        baseAmount: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        tips: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        plusAmount: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        realToPay: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        totalReferenceToPayInMainCurrency: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        observations: personMatrix.observations + "\n",
                    };

                    for (const dataItem of eeData) {
                        total.observations += dataItem.observations + "\n";

                        [
                            "totalOrdersSalesInPOS",
                            "totalOrdersManaged",
                            "totalOrdersManagedByZone",
                            "totalOrdersServed",
                            "totalProductsProduced",
                            "totalSales",
                            "totalReferenceToPay",
                        ].forEach(key => {
                            //@ts-ignore
                            dataItem[key].forEach((insideItem: any) => {
                                const isInTotal = total[key].find(
                                    (localPrice: any) =>
                                        localPrice.codeCurrency ===
                                        insideItem.codeCurrency
                                );
                                if (isInTotal) {
                                    total[key] = total[key].map(
                                        (localPrice: any) => {
                                            if (
                                                localPrice.codeCurrency ===
                                                insideItem.codeCurrency
                                            ) {
                                                return {
                                                    ...localPrice,
                                                    amount:
                                                        localPrice.amount +
                                                        insideItem.amount,
                                                };
                                            }
                                            return localPrice;
                                        }
                                    );
                                } else {
                                    total[key].push({
                                        codeCurrency: insideItem.codeCurrency,
                                        amount: insideItem.amount,
                                    });
                                }
                            });
                        });

                        total.baseAmount.amount += truncateValue(
                            dataItem.baseAmount.amount
                        );
                        total.specialHours.amount +=
                            dataItem.specialHours.amount;
                        total.tips.amount += dataItem.tips.amount;
                        total.plusAmount.amount += dataItem.plusAmount.amount;
                        total.realToPay.amount = mathOperation(
                            total.realToPay.amount,
                            dataItem.realToPay.amount,
                            "addition",
                            0
                        );
                        total.totalReferenceToPayInMainCurrency.amount +=
                            dataItem.totalReferenceToPayInMainCurrency.amount;
                    }

                    transformedMatrix.push({
                        person: personMatrix.person,
                        listEconomicCycles: eeData,
                        amountEconomicCycles: eeData.length,
                        ...total,
                    });
                } else if (personMatrix.counting === "days") {
                    for (const day of personMatrix.listDaysWorked) {
                        let body: CycleDataReportItem = {
                            startsAt: day,
                            endsAt: undefined,
                            economicCycleId: undefined,
                            totalOrdersSalesInPOS: [],
                            totalOrdersManaged: [],
                            totalOrdersManagedByZone: [],
                            totalOrdersServed: [],
                            totalProductsProduced: [],
                            referencePercent: 0,
                            totalSales: [],
                            totalReferenceToPay: [],
                            percentIncreased: 0,
                            percentDecresed: 0,
                            baseAmount: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            amountFixed: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            specialHours: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            plusAmount: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            tips: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            realToPay: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            totalReferenceToPayInMainCurrency: {
                                amount: 0,
                                codeCurrency: codeCurrency,
                            },
                            observations: "",
                        };

                        const economicCyclesInDays =
                            personMatrix.listEconomicCyclesWorked.filter(
                                item =>
                                    moment(item.startsAt).isAfter(
                                        moment(day).startOf("day")
                                    ) &&
                                    moment(item.startsAt).isBefore(
                                        moment(day).endOf("day")
                                    )
                            );

                        let listOrdersIncluded: Array<number> = [];

                        if (personMatrix.person.userId) {
                            for (const economicCycle of economicCyclesInDays) {
                                ///4.3.2 Finding individual sales
                                let totalOrdersSalesInPOS: Array<SimplePrice> =
                                    [];
                                let totalOrdersManaged: Array<SimplePrice> = [];
                                let totalOrdersServed: Array<SimplePrice> = [];

                                if (personMatrix.person.userId) {
                                    //2.1.1 Obtainig orders sales
                                    const orders_sales = allOrders.filter(
                                        item =>
                                            item.economicCycleId ===
                                                economicCycle.id &&
                                            item.salesById ===
                                                personMatrix.person.userId &&
                                            item.managedById ===
                                                personMatrix.person.userId
                                    );

                                    if (orders_sales.length !== 0) {
                                        for (const order of orders_sales) {
                                            listOrdersIncluded.push(order.id);

                                            if (!order.prices) {
                                                body.observations += `No se encontraron precios en la orden #${
                                                    order.operationNumber
                                                } del ${moment(
                                                    order.createdAt
                                                ).format("DD/MM hh:mm A")}\n`;
                                            }

                                            order.prices?.forEach(item => {
                                                const isInTotalSales =
                                                    totalOrdersSalesInPOS.find(
                                                        localPrice =>
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                    );
                                                if (isInTotalSales) {
                                                    totalOrdersSalesInPOS =
                                                        totalOrdersSalesInPOS.map(
                                                            localPrice => {
                                                                if (
                                                                    localPrice.codeCurrency ===
                                                                    item.codeCurrency
                                                                ) {
                                                                    return {
                                                                        ...localPrice,
                                                                        amount:
                                                                            localPrice.amount +
                                                                            item.price,
                                                                    };
                                                                }
                                                                return localPrice;
                                                            }
                                                        );
                                                } else {
                                                    totalOrdersSalesInPOS.push({
                                                        codeCurrency:
                                                            item.codeCurrency,
                                                        amount: item.price,
                                                    });
                                                }
                                            });
                                        }
                                    }

                                    //2.1.2 orders managed
                                    const orders_managed = allOrders.filter(
                                        item =>
                                            item.economicCycleId ===
                                                economicCycle.id &&
                                            item.managedById ===
                                                personMatrix.person.userId
                                    );

                                    if (orders_managed.length !== 0) {
                                        for (const order of orders_managed) {
                                            if (
                                                listOrdersIncluded.find(
                                                    id => id === order.id
                                                )
                                            ) {
                                                continue;
                                            }

                                            listOrdersIncluded.push(order.id);

                                            if (!order.prices) {
                                                body.observations += `No se encontraron precios en la orden #${
                                                    order.operationNumber
                                                } del ${moment(
                                                    order.createdAt
                                                ).format("DD/MM hh:mm A")}\n`;
                                            }

                                            order.prices?.forEach(item => {
                                                const isInManagedOrders =
                                                    totalOrdersManaged.find(
                                                        localPrice =>
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                    );
                                                if (isInManagedOrders) {
                                                    totalOrdersManaged =
                                                        totalOrdersManaged.map(
                                                            localPrice => {
                                                                if (
                                                                    localPrice.codeCurrency ===
                                                                    item.codeCurrency
                                                                ) {
                                                                    return {
                                                                        ...localPrice,
                                                                        amount:
                                                                            localPrice.amount +
                                                                            item.price,
                                                                    };
                                                                }
                                                                return localPrice;
                                                            }
                                                        );
                                                } else {
                                                    totalOrdersManaged.push({
                                                        codeCurrency:
                                                            item.codeCurrency,
                                                        amount: item.price,
                                                    });
                                                }
                                            });
                                        }
                                    }

                                    //2.1.3 orders served
                                    const filtered = allOrders.filter(
                                        item =>
                                            item.economicCycleId ===
                                            economicCycle.id
                                    );
                                    let orders_served = [];
                                    for (const filterItem of filtered) {
                                        const ticketsPeople =
                                            filterItem.tickets.map(
                                                item => item.preparedById
                                            );
                                        if (
                                            ticketsPeople.includes(
                                                personMatrix.person.userId
                                            )
                                        ) {
                                            orders_served.push(filterItem);
                                        }
                                    }

                                    if (orders_served.length !== 0) {
                                        for (const order of orders_served) {
                                            if (
                                                listOrdersIncluded.find(
                                                    id => id === order.id
                                                )
                                            ) {
                                                continue;
                                            }

                                            listOrdersIncluded.push(order.id);

                                            if (!order.prices) {
                                                body.observations += `No se encontraron precios en la orden #${
                                                    order.operationNumber
                                                } del ${moment(
                                                    order.createdAt
                                                ).format("DD/MM hh:mm A")}\n`;
                                            }

                                            order.prices?.forEach(item => {
                                                const isInTotalServed =
                                                    totalOrdersServed.find(
                                                        localPrice =>
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                    );
                                                if (isInTotalServed) {
                                                    totalOrdersServed =
                                                        totalOrdersServed.map(
                                                            localPrice => {
                                                                if (
                                                                    localPrice.codeCurrency ===
                                                                    item.codeCurrency
                                                                ) {
                                                                    return {
                                                                        ...localPrice,
                                                                        amount:
                                                                            localPrice.amount +
                                                                            item.price,
                                                                    };
                                                                }
                                                                return localPrice;
                                                            }
                                                        );
                                                } else {
                                                    totalOrdersServed.push({
                                                        codeCurrency:
                                                            item.codeCurrency,
                                                        amount: item.price,
                                                    });
                                                }
                                            });
                                        }
                                    }
                                }

                                ///4.3.3 Obtaining the dominant rule
                                let rule;
                                if (rulesByPost.length === 1) {
                                    rule = rulesByPost[0];
                                } else if (rulesByPost.length > 1) {
                                    //Analyzing day restriction and selecting it
                                    const found = rulesByPost.filter(
                                        item => item.restrictionsByDays
                                    );
                                    if (found.length > 0) {
                                        const rawDay = moment(
                                            economicCycle.startsAt
                                        ).format("YYYY-MM-DD");
                                        const dayOfWeek = moment(
                                            rawDay,
                                            "YYYY-MM-DD"
                                        )
                                            .utc(false)
                                            .weekday();
                                        const ruleDayRestriction =
                                            rulesByPost.filter(
                                                item =>
                                                    item.restrictionsByDays &&
                                                    item.restrictedDays
                                                        .split(",")
                                                        .includes(
                                                            dayOfWeek.toString()
                                                        )
                                            );

                                        if (ruleDayRestriction.length === 1) {
                                            rule = ruleDayRestriction[0];
                                        } else {
                                            return res.status(400).json({
                                                message: `Existe más de una regla para el cargo ${personMatrix.person.post?.name} y categoría ${personMatrix.person.personCategory?.name} para el día ${dayOfWeek}`,
                                            });
                                        }
                                    }
                                }

                                if (!rule) {
                                    body.observations += `No se encontraron reglas para esta persona en el ciclo ${moment(
                                        economicCycle.startsAt
                                    ).format("DD/MM HH:mm")}\n`;
                                    continue;
                                }

                                totalOrdersSalesInPOS.forEach(item => {
                                    const isInTotalSales =
                                        body.totalOrdersSalesInPOS.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotalSales) {
                                        body.totalOrdersSalesInPOS =
                                            body.totalOrdersSalesInPOS.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalOrdersSalesInPOS.push(item);
                                    }
                                });

                                totalOrdersManaged.forEach(item => {
                                    const isInTotalSales =
                                        body.totalOrdersManaged.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotalSales) {
                                        body.totalOrdersManaged =
                                            body.totalOrdersManaged.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalOrdersManaged.push(item);
                                    }
                                });

                                totalOrdersServed.forEach(item => {
                                    const isInTotalSales =
                                        body.totalOrdersServed.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotalSales) {
                                        body.totalOrdersServed =
                                            body.totalOrdersServed.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalOrdersServed.push(item);
                                    }
                                });
                            }
                        }

                        ///4.3.3 Obtaining the dominant rule
                        let rule;
                        if (rulesByPost.length === 1) {
                            rule = rulesByPost[0];
                        } else if (rulesByPost.length > 1) {
                            //Analyzing day restriction and selecting it
                            const found = rulesByPost.filter(
                                item => item.restrictionsByDays
                            );
                            if (found.length > 0) {
                                const rawDay = moment(day).format("YYYY-MM-DD");
                                const dayOfWeek = moment(rawDay, "YYYY-MM-DD")
                                    .utc(false)
                                    .weekday();
                                const ruleDayRestriction = rulesByPost.filter(
                                    item =>
                                        item.restrictionsByDays &&
                                        item.restrictedDays
                                            .split(",")
                                            .includes(dayOfWeek.toString())
                                );

                                if (ruleDayRestriction.length === 1) {
                                    rule = ruleDayRestriction[0];
                                } else {
                                    return res.status(400).json({
                                        message: `Existe más de una regla para el cargo ${personMatrix.person.post?.name} y categoría ${personMatrix.person.personCategory?.name} para el día ${dayOfWeek}`,
                                    });
                                }
                            }
                        }

                        if (!rule) {
                            body.observations += `No se encontraron reglas para esta persona en el ciclo ${moment(
                                day
                            ).format("DD/MM HH:mm")}\n`;
                            continue;
                        }

                        if (!rule.isFixedSalary) {
                            switch (rule.reference) {
                                case "totalSales":
                                    for (const economicCycle of economicCyclesInDays) {
                                        const economicGeneralData =
                                            listEconomicCycleData.find(
                                                item =>
                                                    item.id === economicCycle.id
                                            );
                                        if (economicGeneralData) {
                                            if (
                                                !economicGeneralData.totalSales
                                            ) {
                                                body.observations += `No se encontraron datos en economicGeneralData.totalSales Regla ${rule.name}\n`;
                                            }

                                            economicGeneralData.totalSales?.forEach(
                                                item => {
                                                    const isInTotal =
                                                        body.totalSales.find(
                                                            localPrice =>
                                                                localPrice.codeCurrency ===
                                                                item.codeCurrency
                                                        );
                                                    if (isInTotal) {
                                                        body.totalSales =
                                                            body.totalSales.map(
                                                                localPrice => {
                                                                    if (
                                                                        localPrice.codeCurrency ===
                                                                        item.codeCurrency
                                                                    ) {
                                                                        return {
                                                                            ...localPrice,
                                                                            amount:
                                                                                localPrice.amount +
                                                                                item.amount,
                                                                        };
                                                                    }
                                                                    return localPrice;
                                                                }
                                                            );
                                                    } else {
                                                        body.totalSales.push({
                                                            codeCurrency:
                                                                item.codeCurrency,
                                                            amount: item.amount,
                                                        });
                                                    }
                                                }
                                            );
                                        }
                                    }

                                    //Updating in totalReferenceToPay
                                    body.totalSales.forEach(item => {
                                        const isInTotal =
                                            body.totalReferenceToPay.find(
                                                localPrice =>
                                                    localPrice.codeCurrency ===
                                                    item.codeCurrency
                                            );
                                        if (isInTotal) {
                                            body.totalReferenceToPay =
                                                body.totalReferenceToPay.map(
                                                    localPrice => {
                                                        if (
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                        ) {
                                                            return {
                                                                ...localPrice,
                                                                amount:
                                                                    localPrice.amount +
                                                                    item.amount,
                                                            };
                                                        }
                                                        return localPrice;
                                                    }
                                                );
                                        } else {
                                            body.totalReferenceToPay.push({
                                                codeCurrency: item.codeCurrency,
                                                amount: item.amount,
                                            });
                                        }
                                    });
                                    break;

                                case "salesInPos":
                                    if (
                                        body.totalOrdersSalesInPOS.length !== 0
                                    ) {
                                        //Updating in totalReferenceToPay
                                        body.totalOrdersSalesInPOS.forEach(
                                            item => {
                                                const isInTotal =
                                                    body.totalReferenceToPay.find(
                                                        localPrice =>
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                    );
                                                if (isInTotal) {
                                                    body.totalReferenceToPay =
                                                        body.totalReferenceToPay.map(
                                                            localPrice => {
                                                                if (
                                                                    localPrice.codeCurrency ===
                                                                    item.codeCurrency
                                                                ) {
                                                                    return {
                                                                        ...localPrice,
                                                                        amount:
                                                                            localPrice.amount +
                                                                            item.amount,
                                                                    };
                                                                }
                                                                return localPrice;
                                                            }
                                                        );
                                                } else {
                                                    body.totalReferenceToPay.push(
                                                        {
                                                            codeCurrency:
                                                                item.codeCurrency,
                                                            amount: item.amount,
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    }
                                    break;

                                case "manageOrders":
                                    if (body.totalOrdersManaged.length !== 0) {
                                        //Updating in totalReferenceToPay
                                        body.totalOrdersManaged.forEach(
                                            item => {
                                                const isInTotal =
                                                    body.totalReferenceToPay.find(
                                                        localPrice =>
                                                            localPrice.codeCurrency ===
                                                            item.codeCurrency
                                                    );
                                                if (isInTotal) {
                                                    body.totalReferenceToPay =
                                                        body.totalReferenceToPay.map(
                                                            localPrice => {
                                                                if (
                                                                    localPrice.codeCurrency ===
                                                                    item.codeCurrency
                                                                ) {
                                                                    return {
                                                                        ...localPrice,
                                                                        amount:
                                                                            localPrice.amount +
                                                                            item.amount,
                                                                    };
                                                                }
                                                                return localPrice;
                                                            }
                                                        );
                                                } else {
                                                    body.totalReferenceToPay.push(
                                                        {
                                                            codeCurrency:
                                                                item.codeCurrency,
                                                            amount: item.amount,
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    }
                                    break;

                                case "serveOrders":
                                    if (body.totalOrdersServed.length !== 0) {
                                        //Updating in totalReferenceToPay
                                        body.totalOrdersServed.forEach(item => {
                                            const isInTotal =
                                                body.totalReferenceToPay.find(
                                                    localPrice =>
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                );
                                            if (isInTotal) {
                                                body.totalReferenceToPay =
                                                    body.totalReferenceToPay.map(
                                                        localPrice => {
                                                            if (
                                                                localPrice.codeCurrency ===
                                                                item.codeCurrency
                                                            ) {
                                                                return {
                                                                    ...localPrice,
                                                                    amount:
                                                                        localPrice.amount +
                                                                        item.amount,
                                                                };
                                                            }
                                                            return localPrice;
                                                        }
                                                    );
                                            } else {
                                                body.totalReferenceToPay.push({
                                                    codeCurrency:
                                                        item.codeCurrency,
                                                    amount: item.amount,
                                                });
                                            }
                                        });
                                    }
                                    break;
                            }

                            //4.3.4.1 In case post and category dont apply
                            if (
                                body.totalOrdersSalesInPOS.length !== 0 &&
                                !["salesInPos", "totalSales"].includes(
                                    rule.reference
                                )
                            ) {
                                //Updating in totalReferenceToPay
                                body.totalOrdersSalesInPOS.forEach(item => {
                                    const isInTotal =
                                        body.totalReferenceToPay.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalReferenceToPay =
                                            body.totalReferenceToPay.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalReferenceToPay.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });
                            }

                            if (
                                body.totalOrdersManaged.length !== 0 &&
                                !["manageOrders", "totalSales"].includes(
                                    rule.reference
                                )
                            ) {
                                //Updating in totalReferenceToPay
                                body.totalOrdersManaged.forEach(item => {
                                    const isInTotal =
                                        body.totalReferenceToPay.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalReferenceToPay =
                                            body.totalReferenceToPay.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalReferenceToPay.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });
                            }

                            if (
                                body.totalOrdersServed.length !== 0 &&
                                !["serveOrders", "totalSales"].includes(
                                    rule.reference
                                )
                            ) {
                                //Updating in totalReferenceToPay
                                body.totalOrdersServed.forEach(item => {
                                    const isInTotal =
                                        body.totalReferenceToPay.find(
                                            localPrice =>
                                                localPrice.codeCurrency ===
                                                item.codeCurrency
                                        );
                                    if (isInTotal) {
                                        body.totalReferenceToPay =
                                            body.totalReferenceToPay.map(
                                                localPrice => {
                                                    if (
                                                        localPrice.codeCurrency ===
                                                        item.codeCurrency
                                                    ) {
                                                        return {
                                                            ...localPrice,
                                                            amount:
                                                                localPrice.amount +
                                                                item.amount,
                                                        };
                                                    }
                                                    return localPrice;
                                                }
                                            );
                                    } else {
                                        body.totalReferenceToPay.push({
                                            codeCurrency: item.codeCurrency,
                                            amount: item.amount,
                                        });
                                    }
                                });
                            }
                        } else {
                            body.totalReferenceToPay.push({
                                amount: rule.amountFixedSalary,
                                codeCurrency: rule.codeCurrency,
                            });

                            body.amountFixed = {
                                amount: rule.amountFixedSalary,
                                codeCurrency: rule.codeCurrency,
                            };
                        }

                        //4.3.5 Calculating totalReferenceToPay amount
                        //Transforming all in Main Currency
                        body.totalReferenceToPay.forEach(pay => {
                            if (pay.codeCurrency === codeCurrency) {
                                body.totalReferenceToPayInMainCurrency.amount =
                                    mathOperation(
                                        pay.amount,
                                        body.totalReferenceToPayInMainCurrency
                                            .amount,
                                        "addition"
                                    );
                            } else {
                                const availableCurrency =
                                    availableCurrencies.find(
                                        item =>
                                            item.currency.code ===
                                            pay.codeCurrency
                                    );
                                if (availableCurrency) {
                                    body.totalReferenceToPayInMainCurrency.amount +=
                                        mathOperation(
                                            pay.amount,
                                            availableCurrency.exchangeRate,
                                            "multiplication",
                                            2
                                        );
                                }
                            }
                        });

                        //4.3.6 Verifying special hours
                        if (rule.includeRechargeInSpecialHours) {
                            const specialHours = rule.specialHours
                                .split(",")
                                .map(item => {
                                    return item.padStart(2, "0");
                                });
                            if (specialHours.length !== 0) {
                                //Analyzing start and ends
                                let startHour: string | undefined = undefined;
                                let endsHour: string | undefined = undefined;
                                const dayEntries = personMatrix.entries.filter(
                                    item =>
                                        moment(item).isAfter(
                                            moment(day).startOf("day")
                                        ) &&
                                        moment(item).isBefore(
                                            moment(day).endOf("day")
                                        )
                                );

                                if (dayEntries.length !== 0) {
                                    startHour = dayEntries[0];
                                    const foundExits =
                                        personMatrix.exits.filter(item =>
                                            moment(item).isAfter(startHour)
                                        );
                                    if (foundExits.length !== 0) {
                                        if (
                                            moment(foundExits[0]).diff(
                                                moment(startHour),
                                                "hour"
                                            ) < 24
                                        ) {
                                            endsHour = foundExits[0];
                                        }
                                    }
                                }

                                if (startHour && endsHour) {
                                    let hour = moment(startHour);
                                    let includedHours: Array<string> = [];
                                    while (
                                        hour.isBefore(moment(endsHour), "hour")
                                    ) {
                                        includedHours.push(hour.format("HH"));
                                        hour.add(1, "hours");
                                    }

                                    if (
                                        includedHours.some(item =>
                                            specialHours.includes(item)
                                        )
                                    ) {
                                        body.specialHours.amount =
                                            rule.amountSpecialHours;
                                    }
                                }
                            }
                        }

                        //4.3.7 Analyzing Tip
                        if (rule.includeTips) {
                            for (const economicCycle of economicCyclesInDays) {
                                const economicGeneralData =
                                    listEconomicCycleData.find(
                                        item => item.id === economicCycle.id
                                    );
                                if (economicGeneralData) {
                                    let partialTip;
                                    if (rule.modeTips === "equivalent") {
                                        partialTip = Math.round(
                                            economicGeneralData.totalTipsInMainCurrency /
                                                economicGeneralData.amountPeopleToIncludeInTips
                                        );
                                    } else if (rule.modeTips === "percent") {
                                        partialTip = Math.round(
                                            (economicGeneralData.totalTipsInMainCurrency *
                                                rule.amountTip) /
                                                100
                                        );
                                    } else {
                                        partialTip = rule.amountTip || 0;
                                    }

                                    body.tips.amount += partialTip || 0;
                                }
                            }
                        }

                        //4.3.8 Calculating totalReferenceToPay and analyzing if person must be increased or decreased
                        let toPayAmount = 0;
                        if (rule.isFixedSalary) {
                            toPayAmount = body.amountFixed.amount;
                        } else {
                            toPayAmount =
                                (body.totalReferenceToPayInMainCurrency.amount *
                                    rule.referencePercent) /
                                100;
                        }
                        body.baseAmount.amount = truncateValue(toPayAmount);

                        //4.3.8.1 Including specialHours
                        if (body.specialHours.amount) {
                            toPayAmount += rule.amountSpecialHours;
                        }

                        //4.3.8.2
                        if (rule.percentAmountToDecrement) {
                            const decrement =
                                (toPayAmount * rule.percentAmountToDecrement) /
                                100;
                            toPayAmount = toPayAmount - decrement;
                            body.plusAmount.amount = Math.abs(decrement) * -1;
                        } else if (rule.percentAmountToIncrement) {
                            const increment =
                                (toPayAmount * rule.percentAmountToDecrement) /
                                100;
                            toPayAmount = toPayAmount + increment;

                            body.plusAmount.amount = increment;
                        }

                        if (body.tips) {
                            toPayAmount += body.tips.amount;
                        }

                        body.realToPay.amount = Math.round(toPayAmount);
                        body.percentDecresed = rule.percentAmountToDecrement;
                        body.percentIncreased = rule.percentAmountToIncrement;

                        eeData.push(body);
                    }

                    //Total
                    let total: any = {
                        totalOrdersSalesInPOS: [],
                        totalOrdersManaged: [],
                        totalOrdersManagedByZone: [],
                        totalOrdersServed: [],
                        totalProductsProduced: [],
                        totalSales: [],
                        totalReferenceToPay: [],
                        specialHours: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        amountFixed: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        baseAmount: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        tips: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        plusAmount: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        realToPay: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        totalReferenceToPayInMainCurrency: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        observations: personMatrix.observations + "\n",
                    };

                    for (const dataItem of eeData) {
                        total.observations += dataItem.observations + "\n";

                        [
                            "totalOrdersSalesInPOS",
                            "totalOrdersManaged",
                            "totalOrdersManagedByZone",
                            "totalOrdersServed",
                            "totalProductsProduced",
                            "totalSales",
                            "totalReferenceToPay",
                        ].forEach(key => {
                            //@ts-ignore
                            dataItem[key].forEach((insideItem: any) => {
                                const isInTotal = total[key].find(
                                    (localPrice: any) =>
                                        localPrice.codeCurrency ===
                                        insideItem.codeCurrency
                                );
                                if (isInTotal) {
                                    total[key] = total[key].map(
                                        (localPrice: any) => {
                                            if (
                                                localPrice.codeCurrency ===
                                                insideItem.codeCurrency
                                            ) {
                                                return {
                                                    ...localPrice,
                                                    amount:
                                                        localPrice.amount +
                                                        insideItem.amount,
                                                };
                                            }
                                            return localPrice;
                                        }
                                    );
                                } else {
                                    total[key].push({
                                        codeCurrency: insideItem.codeCurrency,
                                        amount: insideItem.amount,
                                    });
                                }
                            });
                        });

                        total.baseAmount.amount += truncateValue(
                            dataItem.baseAmount.amount
                        );
                        total.specialHours.amount +=
                            dataItem.specialHours.amount;
                        total.tips.amount += dataItem.tips.amount;
                        total.plusAmount.amount += dataItem.plusAmount.amount;
                        total.realToPay.amount = mathOperation(
                            total.realToPay.amount,
                            dataItem.realToPay.amount,
                            "addition",
                            0
                        );
                        total.totalReferenceToPayInMainCurrency.amount +=
                            dataItem.totalReferenceToPayInMainCurrency.amount;
                    }

                    transformedMatrix.push({
                        person: personMatrix.person,
                        listEconomicCycles: eeData,
                        amountEconomicCycles: eeData.length,
                        ...total,
                    });
                } else if (personMatrix.counting === "unique") {
                    let total: any = {
                        totalOrdersSalesInPOS: [],
                        totalOrdersManaged: [],
                        totalOrdersManagedByZone: [],
                        totalOrdersServed: [],
                        totalProductsProduced: [],
                        totalSales: [],
                        totalReferenceToPay: [],
                        specialHours: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        amountFixed: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        baseAmount: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        tips: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        plusAmount: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        realToPay: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        totalReferenceToPayInMainCurrency: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        observations: personMatrix.observations + "\n",
                    };

                    ///4.3.3 Obtaining the dominant rule
                    let rule;
                    if (rulesByPost.length === 1) {
                        rule = rulesByPost[0];
                    } else {
                        return res.status(400).json({
                            message: `Existe más de una regla para el cargo ${personMatrix.person.post?.name} y categoría ${personMatrix.person.personCategory?.name}`,
                        });
                    }

                    if (!rule) {
                        total.observations += `No se encontraron reglas para esta persona.\n`;
                        continue;
                    }

                    if (rule.isFixedSalary) {
                        total.totalReferenceToPay.push({
                            amount: rule.amountFixedSalary,
                            codeCurrency: rule.codeCurrency,
                        });

                        total.amountFixed = {
                            amount: rule.amountFixedSalary,
                            codeCurrency: rule.codeCurrency,
                        };
                    }

                    //4.3.5 Calculating totalReferenceToPay amount
                    //Transforming all in Main Currency
                    total.totalReferenceToPay.forEach((pay: any) => {
                        if (pay.codeCurrency === codeCurrency) {
                            total.totalReferenceToPayInMainCurrency.amount =
                                mathOperation(
                                    pay.amount,
                                    total.totalReferenceToPayInMainCurrency
                                        .amount,
                                    "addition"
                                );
                        } else {
                            const availableCurrency = availableCurrencies.find(
                                item => item.currency.code === pay.codeCurrency
                            );
                            if (availableCurrency) {
                                total.totalReferenceToPayInMainCurrency.amount +=
                                    mathOperation(
                                        pay.amount,
                                        availableCurrency.exchangeRate,
                                        "multiplication",
                                        2
                                    );
                            }
                        }
                    });

                    //4.3.8 Calculating totalReferenceToPay and analyzing if person must be increased or decreased
                    let toPayAmount = 0;
                    if (rule.isFixedSalary) {
                        toPayAmount = total.amountFixed.amount;
                    } else {
                        toPayAmount =
                            (total.totalReferenceToPayInMainCurrency.amount *
                                rule.referencePercent) /
                            100;
                    }
                    total.baseAmount.amount = truncateValue(toPayAmount);

                    //4.3.8.2
                    if (rule.percentAmountToDecrement) {
                        const decrement =
                            (toPayAmount * rule.percentAmountToDecrement) / 100;
                        toPayAmount = toPayAmount - decrement;
                        total.plusAmount.amount = Math.abs(decrement) * -1;
                    } else if (rule.percentAmountToIncrement) {
                        const increment =
                            (toPayAmount * rule.percentAmountToDecrement) / 100;
                        toPayAmount = toPayAmount + increment;

                        total.plusAmount.amount = increment;
                    }

                    total.realToPay.amount = Math.round(toPayAmount);
                    total.percentDecresed = rule.percentAmountToDecrement;
                    total.percentIncreased = rule.percentAmountToIncrement;

                    transformedMatrix.push({
                        person: personMatrix.person,
                        listEconomicCycles: eeData,
                        amountEconomicCycles: eeData.length,
                        ...total,
                    });
                } else {
                    transformedMatrix.push({
                        person: personMatrix.person,
                        listEconomicCycles: eeData,
                        amountEconomicCycles: eeData.length,
                        totalOrdersSalesInPOS: [],
                        totalOrdersManaged: [],
                        totalOrdersManagedByZone: [],
                        totalOrdersServed: [],
                        totalProductsProduced: [],
                        totalSales: [],
                        totalReferenceToPay: [],
                        amountFixed: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        specialHours: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        baseAmount: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        tips: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        plusAmount: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        realToPay: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        totalReferenceToPayInMainCurrency: {
                            amount: 0,
                            codeCurrency: codeCurrency,
                        },
                        observations: personMatrix.observations + "\n",
                    });
                }
            }
        }

        //Getting totals
        let totalToPay = {
            amount: 0,
            codeCurrency,
        };

        let totalTip = {
            amount: 0,
            codeCurrency,
        };

        //Populating general data
        transformedMatrix.forEach(item => {
            //Salary
            totalToPay.amount += item.realToPay.amount;
            totalTip.amount += item.tips.amount;
        });

        let totalSales = {
            amount: 0,
            codeCurrency,
        };

        let totalIncomes = {
            amount: 0,
            codeCurrency,
        };

        listEconomicCycleData.forEach(item => {
            totalSales.amount += item.totalSalesInMainCurrency;
            totalIncomes.amount += item.totalIncomesInMainCurrency;
        });

        //Saving all data in the report
        let bulkSalaryReport = [];
        for (const itemMatrix of transformedMatrix) {
            bulkSalaryReport.push({
                personalData: JSON.stringify({
                    listEconomicCycles: itemMatrix.listEconomicCycles.sort(
                        //@ts-ignore
                        (a, b) => moment(a.startsAt) - moment(b.startsAt)
                    ),
                    person: itemMatrix.person,
                }),
                baseAmount: itemMatrix.baseAmount.amount,
                codeCurrency: itemMatrix.baseAmount.codeCurrency,
                specialHours: itemMatrix.specialHours.amount,
                plusAmount: itemMatrix.plusAmount.amount,
                tips: itemMatrix.tips.amount,
                totalToPay: itemMatrix.realToPay.amount,
                otherPays: 0,
                accordance: 0,
                isPaid: false,
                observations: itemMatrix.observations,
                personId: itemMatrix.person.id,
                personCategoryId: itemMatrix.person.personCategory.id,
                personPostId: itemMatrix.person.post.id,
            });
        }

        const salaryReport = SalaryReport.build(
            {
                name:
                    name ||
                    `Del ${moment(startsAt).format("DD")} al ${moment(
                        endsAt
                    ).format("DD")}`,
                startsAt: moment(startsAt).format("YYYY-MM-DD HH:mm"),
                endsAt: moment(endsAt).format("YYYY-MM-DD HH:mm"),
                economicCycleData: JSON.stringify(listEconomicCycleData),
                codeCurrency,
                status: "CREATED",
                observations: ``,
                totalTips: totalTip.amount,
                totalIncomes: totalIncomes.amount,
                totalSales: totalSales.amount,
                totalToPay: totalToPay.amount,
                businessId: user.businessId,
                salaryReportPersons: bulkSalaryReport,
                generatedById: user.id,
                generatedAt: moment().toDate(),
            },
            { include: [SalaryReportPerson] }
        );

        await salaryReport.save();

        const to_return = await SalaryReport.scope("to_return").findByPk(
            salaryReport.id
        );

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

export const editSalaryReport = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(SalaryReport.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt", "businessId"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            return res.status(406).json({ message });
        }

        const moreBusiness = await getAllBranchBusiness(user);

        const salaryReport = await SalaryReport.findOne({
            where: {
                id,
                businessId: moreBusiness,
            },
        });

        if (!salaryReport) {
            return res.status(404).json({
                message: `SalaryReport not found`,
            });
        }

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(salaryReport.businessId)&& !user.isSuperAdmin) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                salaryReport[att] = params[att];
            }
        });

        await salaryReport.save();

        const to_return = await SalaryReport.scope("to_return").findByPk(
            salaryReport.id
        );
        res.status(200).json(to_return);
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

export const findAllSalaryReports = async (req: any, res: Response) => {
    try {
        const { per_page, page, search, order, orderBy, all_data } = req.query;
        const user: User = req.user;

        //Preparing search
        let where_clause: any = {};

        //Searchable
        if (search) {
            const separatlyWords: Array<string> = search.split(" ");
            let includeToSearch: Array<{ [key: string]: string }> = [];
            separatlyWords.forEach(word => {
                const cleanWord = word
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                includeToSearch.push({ [Op.iLike]: `%${cleanWord}%` });
            });

            where_clause[Op.and] = [
                where(fn("unaccent", col("SalaryReport.name")), {
                    [Op.and]: includeToSearch,
                }),
            ];
        }

        //Order
        let ordenation;
        if (orderBy && ["createdAt"].includes(orderBy)) {
            ordenation = [[orderBy, order ? order : "DESC"]];
        } else {
            ordenation = [["createdAt", "DESC"]];
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const found_salary_reports = await SalaryReport.findAndCountAll({
            attributes: [
                "id",
                "name",
                "startsAt",
                "endsAt",
                "codeCurrency",
                "status",
            ],
            include: [
                {
                    model: User,
                    as: "generatedBy",
                    attributes: ["id", "email", "username", "displayName"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
            ],
            distinct: true,
            where: { businessId: user.businessId, ...where_clause },
            limit: all_data ? undefined : limit,
            offset,
            //@ts-ignore
            order: ordenation,
        });

        let totalPages = Math.ceil(found_salary_reports.count / limit);
        if (found_salary_reports.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        res.status(200).json({
            totalItems: found_salary_reports.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages: all_data ? 1 : totalPages,
            items: found_salary_reports.rows,
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

export const deleteSalaryReport = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const salaryReport = await SalaryReport.findByPk(id);

        if (!salaryReport) {
            return res.status(404).json({
                message: `SalaryReport not found`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        //Checking if action belongs to user Business
        if (!moreBusiness.includes(salaryReport.businessId) && !user.isSuperAdmin) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        await salaryReport.destroy();

        res.status(200).json({
            message: `SalaryReport deleted successfully`,
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

export const getSalaryReport = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const user: User = req.user;

        if (!id) {
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        //Gell all business
        const moreBusiness = await getAllBranchBusiness(user);

        const salaryReport = await SalaryReport.findByPk(id, {
            attributes: [
                "id",
                "name",
                "startsAt",
                "endsAt",
                "codeCurrency",
                "status",
                "businessId",
                "totalTips",
                "totalIncomes",
                "totalSales",
                "totalToPay",
                "economicCycleData",
                "observations",
                "generatedAt",
            ],
            include: [
                { model: SalaryReportPerson },
                {
                    model: User,
                    as: "generatedBy",
                    attributes: ["id", "email", "username", "displayName"],
                    include: [
                        {
                            model: Image,
                            as: "avatar",
                            attributes: ["id", "src", "thumbnail", "blurHash"],
                        },
                    ],
                    paranoid: false,
                },
            ],
        });

        if (!salaryReport) {
            return res.status(404).json({
                message: `El objeto salaryReport no fue encontrado.`,
            });
        }

        //Checking permissions
        if (!moreBusiness.includes(salaryReport.businessId) && !user.isSuperAdmin) {
            return res.status(401).json({
                message: `No tiene acceso al recurso solicitado.`,
            });
        }

        res.status(200).json({
            ...salaryReport.dataValues,
            economicCycleData: JSON.parse(salaryReport.economicCycleData),
            salaryReportPersons: salaryReport.salaryReportPersons.map(item => {
                return {
                    ...JSON.parse(item.personalData),
                    ...item.dataValues,
                    personalData: undefined,
                };
            }),
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

export const editSalaryReportPerson = async (req: any, res: Response) => {
    const t = await db.transaction();

    try {
        const { id } = req.params;
        const { ...params } = req.body;
        const user: User = req.user;

        if (!id) {
            t.rollback();
            return res.status(406).json({
                message: `El parámetro id no fue introducido`,
            });
        }

        const modelKeys = Object.keys(SalaryReportPerson.getAttributes());
        const paramsKey = Object.keys(params);
        let message;
        ["id", "createdAt", "updatedAt", "deletedAt", "businessId"].forEach(
            att => {
                if (paramsKey.includes(att)) {
                    message = `You are not allowed to change ${att} attribute.`;
                }
            }
        );

        if (message) {
            t.rollback();
            return res.status(406).json({ message });
        }

        const moreBusiness = await getAllBranchBusiness(user);

        const salaryPersonReport = await SalaryReportPerson.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: SalaryReport,
                    where: {
                        businessId: moreBusiness,
                    },
                },
            ],
        });

        if (!salaryPersonReport) {
            t.rollback();
            return res.status(404).json({
                message: `SalaryReportPerson not found`,
            });
        }

        const allowedAttributes = [...modelKeys];
        paramsKey.forEach(att => {
            if (allowedAttributes.includes(att)) {
                //@ts-ignore
                salaryPersonReport[att] = params[att];
            }
        });

        await salaryPersonReport.save({ transaction: t });

        //Recalculating the row
        const totalPersonToPay =
            salaryPersonReport.baseAmount +
            salaryPersonReport.specialHours +
            salaryPersonReport.plusAmount +
            salaryPersonReport.tips +
            salaryPersonReport.otherPays;
        salaryPersonReport.totalToPay = truncateValue(totalPersonToPay, 2);

        await salaryPersonReport.save({ transaction: t });

        //Recalculate all the general results
        const salaryReport = await SalaryReport.findByPk(
            salaryPersonReport.salaryReportId,
            {
                include: [SalaryReportPerson],
                transaction: t,
            }
        );

        if (!salaryReport) {
            t.rollback();
            return res.status(404).json({
                message: `SalaryReport not found`,
            });
        }

        let totalToPay = 0;
        let totalTip = 0;

        //Populating general data
        salaryReport?.salaryReportPersons.forEach(item => {
            //Salary
            totalToPay += item.totalToPay;
            totalTip += item.tips;
        });

        salaryReport.totalToPay = totalToPay;
        salaryReport.totalTips = totalTip;

        await salaryReport.save({ transaction: t });

        await t.commit();

        const to_return = await SalaryReportPerson.scope("to_return").findByPk(
            salaryPersonReport.id
        );
        res.status(200).json(to_return);
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

export const findAllSalary = async (req: any, res: Response) => {
    const user: User = req.user;
    const business: Business = req.business;
    const { per_page, page, dateFrom, dateTo } = req.query;
    const { personId } = req.params;

    try {
        let where_clause: any = {};

        //Date filtering
        if (dateFrom && dateTo) {
            //Special case between dates
            where_clause["createdAt"] = {
                [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
                [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                    .endOf("day")
                    .format("YYYY-MM-DD HH:mm:ss"),
            };
        } else {
            if (dateFrom) {
                where_clause["createdAt"] = {
                    [Op.gte]: moment(dateFrom, "YYYY-MM-DD HH:mm")
                        .startOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }

            if (dateTo) {
                where_clause["createdAt"] = {
                    [Op.lte]: moment(dateTo, "YYYY-MM-DD HH:mm")
                        .endOf("day")
                        .format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        }

        //With pagination
        const limit = per_page ? parseInt(per_page) : pag_params.limit;
        const offset = page
            ? (parseInt(page) - 1) * limit
            : pag_params.offset * limit;

        const salry = await SalaryReportPerson.findAndCountAll({
            where: {
                personId,
                ...where_clause,
            },
            order: [["createdAt", "DESC"]],
            include: [{ model: PersonCategory, attributes: ["name", "code"] }],
            limit,
            offset,
        });

        let totalPages = Math.ceil(salry.count / limit);
        if (salry.count === 0) {
            totalPages = 0;
        } else if (totalPages === 0) {
            totalPages = 1;
        }

        return res.json({
            totalItems: salry.count,
            currentPage: page ? parseInt(page) : 1,
            totalPages,
            items: salry.rows,
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
