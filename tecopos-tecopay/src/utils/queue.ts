import Queue from "bull";
import {
  accountRegisterNotification,
  accountSecPinNotification,
  blockAccountNotification,
  cardRequestNotification,
  chargeAccNotification,
  paymentNotification,
  transactionNotification,
} from "./mailSender";
import {
  AccountData,
  ChargeAccData,
  PaymentData,
  TransactionData,
  cardRequestData,
} from "../interfaces/emailJobData";

// Initialize Bull queue
export const emailQueue = new Queue("queue", "redis://127.0.0.1:6379");

// Process jobs in the email queue
emailQueue.process((job: Queue.Job<TransactionData>) => {
  const { type, params } = job.data;

  try {
    switch (type) {
      case "TRANSACTION_NOTIFICATION":
        // Send transaction notification email
        transactionNotification({
          to: params.to,
          name_to: params.name_to,
          transactionData: params.transactionData,
        });
        break;
      default:
        console.log("Unsupported email type:", type);
    }
  } catch (error) {
    console.log("Error processing email job:", error);
  }
});

emailQueue.process((job: Queue.Job<PaymentData>) => {
  const { type, params } = job.data;

  try {
    switch (type) {
      case "PAYMENT_NOTIFICATION":
        // Send transaction notification email
        paymentNotification({
          to: params.to,
          name_to: params.name_to,
          transactionData: params.transactionData,
          entityData: params.entityData,
        });
        break;
      default:
        console.log("Unsupported email type:", type);
    }
  } catch (error) {
    console.log("Error processing email job:", error);
  }
});

emailQueue.process((job: Queue.Job<AccountData>) => {
  const { type, params } = job.data;

  try {
    switch (type) {
      case "REGISTER_ACC_NOTIFICATION":
        // Send transaction notification email
        accountRegisterNotification({
          to: params.to,
          name_to: params.name_to,
          accountData: params.accountData,
        });
        break;

      case "CHANGE_SEC_PIN_ACC_NOTIFICATION":
        // Send transaction notification email
        accountSecPinNotification({
          to: params.to,
          name_to: params.name_to,
          securityPinData: params.securityPinData,
        });
        break;

      case "BLOCK_ACC_NOTIFICATION":
        // Send transaction notification email
        blockAccountNotification({
          to: params.to,
          name_to: params.name_to,
          accountData: params.accountData,
        });
        break;

      default:
        console.log("Unsupported email type:", type);
    }
  } catch (error) {
    console.log("Error processing email job:", error);
  }
});

emailQueue.process((job: Queue.Job<ChargeAccData>) => {
  const { type, params } = job.data;

  try {
    switch (type) {
      case "CHARGE_ACC_NOTIFICATION":
        // Send transaction notification email
        chargeAccNotification({
          to: params.to,
          name_to: params.name_to,
          rechargeData: params.rechargeData,
          entityData: params.entityData,
        });
        break;

      default:
        console.log("Unsupported email type:", type);
    }
  } catch (error) {
    console.log("Error processing email job:", error);
  }
});

emailQueue.process((job: Queue.Job<cardRequestData>) => {
  const { type, params } = job.data;

  try {
    switch (type) {
      case "CARD_REQ_NOTIFICATION":
        // Send transaction notification email
        cardRequestNotification({
          to: params.to,
          name_to: params.name_to,
          RequestData: params.RequestData,
        });
        break;

      default:
        console.log("Unsupported email type:", type);
    }
  } catch (error) {
    console.log("Error processing email job:", error);
  }
});
