import Queue from "bull";
import axios, { AxiosResponse } from "axios";

import { JobNotificationData } from "./interfaces";
import Logger from "../lib/logger";
import Business from "../database/models/business";
import Client from "../database/models/client";
import User from "../database/models/user";
import OrderReceipt from "../database/models/orderReceipt";
import { getOrderStatus } from "../helpers/translator";

export const notificationsQueue = new Queue(
  `notification-${process.env.DB_NAME}`,
  "redis://127.0.0.1:6379"
);

const URL_FIREBASE_NOTIFICATION = `https://fcm.googleapis.com/fcm/send`;

//Processators
notificationsQueue.process(
  async (job: Queue.Job<JobNotificationData>, done) => {
    try {
      switch (job.data.code) {
        case "SEND_CLIENT":
          {
            const { businessId, title, message, data, clientId } =
              job.data.params;

            const business = await Business.findByPk(businessId);

            if (!business) {
              done();
              Logger.warn(`El negocio ${businessId} no fue encontrado`, {
                businessId,
                origin: "notificationsQueue/SEND_CLIENT",
              });
              return;
            }

            if (!business.notificationServerKey) {
              done();
              Logger.warn(
                `El negocio ${business.name} no tiene habilitado una llave válida en el servidor de notificaciones`,
                {
                  businessId,
                  origin: "notificationsQueue/SEND_CLIENT",
                }
              );
              return;
            }

            const client = await Client.findByPk(clientId);

            if (!client) {
              done();
              Logger.warn(`El cliente con id ${clientId} no fue encontrado`, {
                businessId,
                origin: "notificationsQueue/SEND_CLIENT",
              });
              return;
            }

            if (!client.notificationToken) {
              done();
              return;
            }

            const body = {
              notification: {
                body: message,
                title: title,
              },
              to: client.notificationToken,
              data: data || {},
              direct_boot_ok: true,
            };

            axios
              .post(URL_FIREBASE_NOTIFICATION, body, {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `key=${business.notificationServerKey}`,
                },
              })
              .catch((error) => {
                Logger.error(error.data, {
                  origin: "notificationsQueue/SEND_CLIENT",
                  businessId,
                });
              });
            done();
          }
          break;
        case "SEND_USER":
          {
            const { businessId, title, message, data, userId } =
              job.data.params;

            const business = await Business.findByPk(businessId);

            if (!business) {
              done();
              Logger.warn(`El negocio ${businessId} no fue encontrado`, {
                businessId,
                origin: "notificationsQueue/SEND_USER",
              });
              return;
            }

            if (!business.notificationServerKey) {
              done();
              Logger.warn(
                `El negocio ${business.name} no tiene habilitado una llave válida en el servidor de notificaciones`,
                {
                  businessId,
                  origin: "notificationsQueue/SEND_USER",
                }
              );
              return;
            }

            const user = await User.findByPk(userId);

            if (!user) {
              done();
              Logger.warn(`El usuario con id ${userId} no fue encontrado`, {
                businessId,
                origin: "notificationsQueue/SEND_USER",
              });
              return;
            }

            if (!user.notificationToken) {
              done();
              return;
            }

            const body = {
              notification: {
                body: message,
                title: title,
              },
              to: user.notificationToken,
              data: data || {},
              direct_boot_ok: true,
            };

            axios
              .post(URL_FIREBASE_NOTIFICATION, body, {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `key=${business.notificationServerKey}`,
                },
              })
              .catch((error) => {
                Logger.error(error.data, {
                  origin: "notificationsQueue/SEND_USER",
                  businessId,
                });
              });
            done();
          }
          break;
        case "NOTIFY_ORDER_STATUS_CHANGED":
          {
            const { orderId, force }: { orderId: number; force: boolean } =
              job.data.params;

            const order = await OrderReceipt.findByPk(orderId, {
              include: [{ model: Client }],
            });

            if (!order) {
              done();
              Logger.warn(`La orden ${order} no fue encontrada`, {
                orderId,
                origin: "notificationsQueue/ONLINE_ORDER_STATUS_CHANGED",
              });
              return;
            }

            //Analyzing if clients should be notified
            const statusToBeNotified = [
              "COMPLETED",
              "IN_TRANSIT",
              "DELIVERED",
              "IN_PROCESS",
            ];
            if (
              order.client &&
              order.client.notificationToken &&
              (statusToBeNotified.includes(order.status) || force)
            ) {

              let message = `La orden ${
                order.operationNumber
              } se encuentra ${getOrderStatus(order.status)}`;
              switch (order.status) {
                case "COMPLETED":
                  message = `Hemos completado su orden ${order.operationNumber}.`;
                  break;
                case "IN_TRANSIT":
                  `Ya se encuentra en camino su orden ${order.operationNumber}.`;
                  break;
                case "DELIVERED":
                  `Hemos entragado su orden ${order.operationNumber}.`;
                  break;
                case "IN_PROCESS":
                  `Su orden ${order.operationNumber} esta siendo procesada.`;
                  break;
                default:
                  break;
              }

              notificationsQueue.add(
                {
                  code: "SEND_CLIENT",
                  params: {
                    businessId: order.businessId,
                    title: `¡Su orden ha cambiado de estado!`,
                    message,
                    clientId: order.clientId,
                  },
                },
                {
                  attempts: 1,
                  removeOnComplete: true,
                  removeOnFail: true,
                }
              );              
            }
            done();
          }
          break;
      }
    } catch (error: any) {
      Logger.error(error);
      done(new Error(error.toString()));
    }
  }
);
