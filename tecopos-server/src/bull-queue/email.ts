import Queue from "bull";

import { JobEmailData } from "./interfaces";
import Business from "../database/models/business";
import {
  codeToRecoverPassword,
  codeToRecoverPasswordFromMarketPlace,
  newMasterOwnerNotification,
  newUserNotification,
  notificationAdmin,
  notificationChangeOrderStatus,
  notificationNewOrder,
  notificationReservations,
} from "../helpers/emailComposer";
import Logger from "../lib/logger";
import Address from "../database/models/address";
import Municipality from "../database/models/municipality";
import Province from "../database/models/province";
import Country from "../database/models/country";
import Phone from "../database/models/phone";
import OrderReceiptRecord from "../database/models/orderReceiptRecord";
import { getTitleOrderRecord } from "../helpers/translator";
import OrderReceipt from "../database/models/orderReceipt";

export const emailQueue = new Queue(
  `email-${process.env.DB_NAME}`,
  "redis://127.0.0.1:6379"
);

//Processators
emailQueue.process(async (job: Queue.Job<JobEmailData>, done) => {
  try {
    switch (job.data.code) {
      case "CODE_TO_RECOVER_PASS_FROM_MARKETPLACE":
        {
          const { user, code } = job.data.params;
          codeToRecoverPasswordFromMarketPlace(user, code);
          done();
        }
        break;
      case "CODE_TO_RECOVER_PASS":
        {
          const { businessId, user, code } = job.data.params;

          const business = await Business.findByPk(businessId, {
            include: [
              {
                model: Address,
                attributes: [
                  "street_1",
                  "street_2",
                  "description",
                  "city",
                  "postalCode",
                ],
                include: [
                  {
                    model: Municipality,
                    attributes: ["id", "name", "code"],
                  },
                  {
                    model: Province,
                    attributes: ["id", "name", "code"],
                  },
                  {
                    model: Country,
                    attributes: ["id", "name", "code"],
                  },
                ],
              },
              {
                model: Phone,
                attributes: ["number", "description", "isMain"],
                through: {
                  attributes: [],
                },
              },
            ],
          });

          if (business) {
            codeToRecoverPassword(user, code, business);
          }
          done();
        }
        break;
      case "MASTER_CHANGE":
        {
          const business = await Business.findByPk(job.data.params.businessId);

          if (business) {
            newMasterOwnerNotification(business);
          }
          done();
        }

        break;
      case "NEW_ADMIN_USER":
        {
          const { email, displayName, generatedPassword } = job.data.params;

          newUserNotification(email, displayName, generatedPassword);
          done();
        }

        break;
      case "CHANGE_PASS_REQUEST":
        {
          const { email, displayName, generatedPassword } = job.data.params;

          newUserNotification(email, displayName, generatedPassword);
          done();
        }

        break;
      case "NEW_ORDER_NOTIFICATION":
        {
          const { email, order_to_emit, business, isOwner, isBuyer } = job.data.params;

          notificationNewOrder({
            to: email,
            order: order_to_emit,
            business,
            isOwner,
            isBuyer
          });

          done();
        }

        break;
      case "NEW_ORDER_NOTIFICATION_ADMIN":
        {
          const { email, order_to_emit, business, type } = job.data.params;

          notificationAdmin({
            to: email,
            order: order_to_emit,
            business,
            type,
          });

          const record = OrderReceiptRecord.build({
            action: "PAYMENT_REMINDER_SENT",
            title: getTitleOrderRecord("PAYMENT_REMINDER_SENT"),
            details: `Enviado a: ${email}`,
            orderReceiptId: order_to_emit.id,
            madeById: 1,
          });
          await record.save();

          done();
        }

        break;
      case "NOTIFICATION_RESERVATIONS":
        {
          const { email, order_to_emit, business, type } = job.data.params;

          notificationReservations({
            to: email,
            order: order_to_emit,
            business,
            type,
          });

          done();
        }

        break;
      case "CHANGE_ORDER_STATUS_NOTIFICATION":
        {
          const { order } = job.data.params;

          const ord = order as OrderReceipt;

          const business = await Business.findByPk(ord.businessId)


          notificationChangeOrderStatus({
            to: order.client.email,
            order,
            business:business!            
          });

          done();
        }

        break;
    }
  } catch (error: any) {
    Logger.error(error);
    done(new Error(error.toString()));
  }
});
