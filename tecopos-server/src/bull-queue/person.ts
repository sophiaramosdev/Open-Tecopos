import Queue from "bull";

import { JobPeopleData } from "./interfaces";
import Logger from "../lib/logger";
import Person from "../database/models/person";
import { getBusinessConfigCache } from "../helpers/redisStructure";
import PersonAccessRecord from "../database/models/personAccessRecord";
import moment from "moment";
import User from "../database/models/user";

export const personQueue = new Queue(
    `person-${process.env.DB_NAME}`,
    "redis://127.0.0.1:6379"
);

//Processators
personQueue.process(async (job: Queue.Job<JobPeopleData>, done) => {
    try {
        switch (job.data.code) {
            case "CHECK_PEOPLE_IN_BUSINESS":
                {
                    const { businessId } = job.data.params;

                    try {
                        const now = moment(new Date());

                        const foundPeople = await Person.findAll({
                            where: {
                                businessId,
                                isActive: true,
                                isInBusiness: true,
                            },
                            include: [
                                {
                                    model: PersonAccessRecord,
                                    limit: 2,
                                    order: [["createdAt", "DESC"]],
                                },
                            ],
                        });

                        const configurations = await getBusinessConfigCache(
                            businessId
                        );
                        const maximum_day_working_hours =
                            configurations.find(
                                item => item.key === "maximum_day_working_hours"
                            )?.value || 12;

                        let bulkUpdate = [];

                        for (const person of foundPeople) {
                            const foundLastEntry = person.accessRecords.find(
                                item => item.type === "ENTRY"
                            );

                            if (foundLastEntry) {
                                if (
                                    now.diff(
                                        moment(foundLastEntry.createdAt),
                                        "hour"
                                    ) > Number(maximum_day_working_hours)
                                ) {
                                    //Emit via Scokets
                                    if (person.userId) {
                                        (global as any).socket
                                            .to(`user:${person.userId}`)
                                            .emit("logout-user");
                                    }

                                    bulkUpdate.push({
                                        id: person.id,
                                        firstName: person.firstName,
                                        isInBusiness: false,
                                    });
                                }
                            } else {
                                //Emit via Scokets
                                if (person.userId) {
                                    (global as any).socket
                                        .to(`user:${person.userId}`)
                                        .emit("logout-user");
                                }

                                bulkUpdate.push({
                                    id: person.id,
                                    firstName: person.firstName,
                                    isInBusiness: false,
                                });
                            }
                        }

                        if (bulkUpdate.length > 0) {
                            await Person.bulkCreate(bulkUpdate, {
                                updateOnDuplicate: ["isInBusiness"],
                            });

                            Logger.info(
                                `Se han expulsado del negocio automáticamente a ${bulkUpdate.length} personas.`,
                                {
                                    businessId,
                                }
                            );
                        }
                    } catch (error: any) {
                        Logger.error(
                            error.toString() ||
                                "Ha ocurrido un error inesperado.",
                            {
                                origin: "personQueue/CHECK_PEOPLE_IN_BUSINESS",
                            }
                        );
                    } finally {
                        done();
                    }
                }
                break;
        }
    } catch (error: any) {
        Logger.error(error);
        done(new Error(error.toString()));
    }
});
