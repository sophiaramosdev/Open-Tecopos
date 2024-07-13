import BigNumber from "bignumber.js";

export interface CardBulkInteface {
  type: "CARD" | "ACCOUNT";
  businessId: number;
  entityId: number;
}
export const generateBulkNumbers: (params: CardBulkInteface) => string[] = ({
  type,
  businessId,
  entityId,
}: CardBulkInteface) => {
  const business: string = businessId.toString().padStart(3, "0");
  const entity: string = entityId.toString().padStart(3, "0");
  let index = type === "ACCOUNT" ? 1 : 5;
  const end = type === "ACCOUNT" ? 5 : 10;

  //construct sequence
  const sequence: string[] = [];
  for (index; index < end; index++) {
    for (let idx = 0; idx < 10000; idx++) {
      const origin =
        index.toString() +
        business.toString().padStart(3, "0") +
        entity.toString().padStart(3, "0") +
        idx.toString().padStart(4, "0");

      const num: number[] = origin.split("").map((item) => parseInt(item));

      const sum = num.reverse().reduce((total, itm, idx) => {
        let position = itm;
        if (idx % 2 === 0) {
          const double = itm * 2;
          position =
            double > 9
              ? (position = Math.floor(double / 10) + (double % 10))
              : double;
        }

        return total + position;
      }, 0);
      const unitPosition = sum % 10;
      const checkNum = unitPosition !== 0 ? 10 - unitPosition : unitPosition;
      const seq = origin + checkNum;
      sequence.push(seq);
    }
  }

  return sequence;
};

export const generateNoRepeatNumber: (length?:8|16|32) => string = (length = 32) => {
  const date = new Date();
  const transactionNumber = date.getTime().toString(length).toUpperCase();
  return transactionNumber;
};

export const bigNumberOp = (
  operation: "plus" | "minus" | "div" | "mult",
  values: number[]
) => {
  BigNumber.config({ DECIMAL_PLACES: 2 });

  switch (operation) {
    case "plus":
      return values.reduce((total, current) => {
        const x = BigNumber(total);
        const y = BigNumber(current);
        return Number(x.plus(y));
      }, 0);
    case "minus":
      let minus = BigNumber(values[0]);
      values.forEach((current, idx) => {
        if (idx !== 0) minus = minus.minus(current);
      });
      return Number(minus);
    case "div":
      let div = BigNumber(values[0]);
      values.forEach((current, idx) => {
        if (idx !== 0) div = div.dividedBy(current);
      });
      return Number(div);
    case "mult":
      let mult = BigNumber(values[0]);
      values.forEach((current, idx) => {
        if (idx !== 0) mult = mult.multipliedBy(current);
      });
      return Number(mult);

    default:
      break;
  }
};
