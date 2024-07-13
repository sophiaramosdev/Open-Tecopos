export interface TransactionData {
  type: string;
  params: {
    to: string;
    name_to: string;
    transactionData: {
      sourceAddress: string;
      targetAddress: string;
      amountTransferred: number;
      description: string;
      transactionNumber: any;
    };
  };
}

export interface PaymentData {
  type: string;
  params: {
    to: string;
    name_to: string;
    transactionData: {
      sourceAddress: string;
      targetAddress: string;
      amountTransferred: number;
      description: string;
      reference: string;
      transactionNumber: any;
    };
    entityData: {
      entity: string;
    };
  };
}

export interface ChargeAccData {
  type: string;
  params: {
    to: string;
    name_to: string;
    rechargeData: {
      transactionNumber: any;
      targetAddress: string;
      amountTransferred: number;
      description: string;
    };
    entityData: {
      entity: string;
    };
  };
}

export interface AccountData {
  type: string;
  params: {
    to: string;
    name_to: string;
    accountData: {
      name: string;
      accountNumber: string;
      entity: any;
      securityPin: string;
    };
    securityPinData: {
      name: string;
      securityPin: string;
    };
  };
}

export interface cardRequestData {
  type: string;
  params: {
    to: string;
    name_to: string;
    RequestData: {
      holderName: string;
      quantity: number;
      priority: any;
      entity: any;
      category: any;
    };
    CardData: {
      holderName: string;
      address: string;
    };
  };
}
