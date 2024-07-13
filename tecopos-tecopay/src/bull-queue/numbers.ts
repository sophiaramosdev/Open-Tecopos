import Queue, { Job } from "bull";
import { JobNumberInterface } from "../interfaces/serverInterfaces";
import { generateBulkNumbers } from "../utils/helpers";
import AccountNumber from "../database/models/accountNumber";
import CardNumber from "../database/models/cardNumber";
import Logger from "../utils/logger";

export const numbersQueue = new Queue("sequence-number");

numbersQueue.process(async (job: Job<JobNumberInterface>, done) => {
  try {
    const accountNumbers = generateBulkNumbers({
      businessId: job.data.businessId,
      entityId: job.data.entityId,
      type: "ACCOUNT",
    });

    const cardNumbers = generateBulkNumbers({
        businessId: job.data.businessId,
        entityId: job.data.entityId,
      type: "CARD",
    });

    const newAccounts = accountNumbers.map((item) => ({
        code: item,
        issueEntityId: job.data.entityId,
      }));
  
      const newCards = cardNumbers.map((item) => ({
        code: item,
        issueEntityId: job.data.entityId,
      }));
  
      await AccountNumber.bulkCreate(newAccounts);
      await CardNumber.bulkCreate(newCards);

      console.log("Pool de Cuentas y tarjetas creadas");

      done();

  } catch (e:any) {
    Logger.error(e);
    done(new Error(e.toString()));
  }
});
