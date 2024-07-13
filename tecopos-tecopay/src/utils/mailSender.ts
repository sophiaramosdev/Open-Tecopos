import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { templateMailHTML } from "./template/templateEmail";

dotenv.config();

const transporterConfig = {
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    ciphers: "SSLv3",
  },
  requireTLS: true,
};

const createTransporter = async () => {
  return nodemailer.createTransport(transporterConfig);
};

export const emailComposer = async (
  to: string,
  subject: string,
  text: string,
  html: string
) => {
  try {
    const transporter = await createTransporter();

    // send mail with defined transport object
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    throw error;
  }
};

export const transactionNotification = async ({
  to,
  name_to,
  transactionData,
}: {
  to: string;
  name_to: string;
  transactionData: {
    sourceAddress: string;
    targetAddress: string;
    amountTransferred: number;
    description: string;
    transactionNumber: any;
  };
}): Promise<void> => {
  // Verifying configuration is not local
  // if (process.env.MODE === 'local') {
  //   return;
  // }

  try {
    const body = `<p>Se ha realizado una transferencia desde su cuenta en TECOPAY. A continuación, los detalles:</p>
    <br>
    <p><b>Fecha y Hora:</b> ${new Date()}</p
    <p><b>Cuenta de Destino:</b> ${transactionData.targetAddress}</p>
    <p><b>Monto Transferido:</b> ${transactionData.amountTransferred} PUNTOS</p>
    <p><b>Número de Transacción:</b> ${transactionData.transactionNumber}</p>
    <p><b>Mensaje:</b> ${transactionData.description}</p>
       
    <style>
      .link {
        font-size: 17px;
        padding: 0.5em 2em;
        border: transparent;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        background: dodgerblue;
        color: white;
        border-radius: 4px;
       }
       
       #link:hover {
        background: rgb(2,0,36);
        background: linear-gradient(90deg, rgba(30,144,255,1) 0%, rgba(0,212,255,1) 100%);
       }       
      </style>
    <br>`;

    await emailComposer(
      to,
      "Notificación de Transferencia",
      "Mensaje de TECOPOS",
      templateMailHTML(name_to, body)
    );
  } catch (error) {
    throw error;
  }
};

export const chargeAccNotification = async ({
  to,
  name_to,
  rechargeData,
  entityData,
}: {
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
}): Promise<void> => {
  // Verifying configuration is not local
  // if (process.env.MODE === 'local') {
  //   return;
  // }

  try {
    const body = `<p>Su cuenta de TECOPAY en la entidad ${
      entityData.entity
    } ha sido recargada. A continuación, los detalles:</p>
    <br>
    <p><b>Fecha y Hora:</b> ${new Date()}</p
    <p><b>Entidad:</b> ${entityData.entity}</p>
    <p><b>Monto Transferido:</b> ${rechargeData.amountTransferred} PUNTOS</p>
    <p><b>Código de transferencia:</b> ${rechargeData.transactionNumber}</p>


    <style>
      .link {
        font-size: 17px;
        padding: 0.5em 2em;
        border: transparent;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        background: dodgerblue;
        color: white;
        border-radius: 4px;
       }
       
       #link:hover {
        background: rgb(2,0,36);
        background: linear-gradient(90deg, rgba(30,144,255,1) 0%, rgba(0,212,255,1) 100%);
       }       
      </style>
    <br>`;

    await emailComposer(
      to,
      "Notificación de Recarga",
      "Mensaje de TECOPOS",
      templateMailHTML(name_to, body)
    );
  } catch (error) {
    throw error;
  }
};

export const paymentNotification = async ({
  to,
  name_to,
  transactionData,
  entityData,
}: {
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
}): Promise<void> => {
  // Verifying configuration is not local
  // if (process.env.MODE === 'local') {
  //   return;
  // }

  try {
    const body = `<p>Se ha realizado un pago desde su cuenta en TECOPAY. A continuación, los detalles:</p>
    <br>
    <p><b>Fecha y Hora:</b> ${new Date()}</p
    <p><b>Entidad de Destino:</b> ${entityData.entity}</p>
    <p><b>Monto Transferido:</b> ${transactionData.amountTransferred} PUNTOS</p>
    <p><b>Código de transferencia:</b> ${transactionData.transactionNumber}</p>
    <p><b>Número de Orden:</b> ${transactionData.reference}</p>
    <p><b>Descripción:</b> ${transactionData.description}</p>

       
    <style>
      .link {
        font-size: 17px;
        padding: 0.5em 2em;
        border: transparent;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        background: dodgerblue;
        color: white;
        border-radius: 4px;
       }
       
       #link:hover {
        background: rgb(2,0,36);
        background: linear-gradient(90deg, rgba(30,144,255,1) 0%, rgba(0,212,255,1) 100%);
       }       
      </style>
    <br>`;

    await emailComposer(
      to,
      "Notificación de Transferencia",
      "Mensaje de TECOPOS",
      templateMailHTML(name_to, body)
    );
  } catch (error) {
    throw error;
  }
};

export const accountRegisterNotification = async ({
  to,
  name_to,
  accountData,
}: {
  to: string;
  name_to: string;
  accountData: {
    name: string;
    accountNumber: string;
    entity: any;    
  };
}): Promise<void> => {
  // Verifying configuration is not local
  // if (process.env.MODE === 'local') {
  //   return;
  // }

  try {
    const body = `<p>Felicitaciones ${
      accountData.name
    } su cuenta en TECOPAY ha sido creada exitosamente para operar en la entidad ${
      accountData.entity
    }.</p>
    <br>
    <p><b>Fecha y Hora:</b> ${new Date()}</p
    <p><b>Entidad de la cuenta:</b> ${accountData.entity}</p>
    <p><b>Número de Cuenta:</b> ${accountData.accountNumber}</p>
         
    <style>
      .link {
        font-size: 17px;
        padding: 0.5em 2em;
        border: transparent;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        background: dodgerblue;
        color: white;
        border-radius: 4px;
       }
       
       #link:hover {
        background: rgb(2,0,36);
        background: linear-gradient(90deg, rgba(30,144,255,1) 0%, rgba(0,212,255,1) 100%);
       }       
      </style>
    <br>`;

    await emailComposer(
      to,
      "Notificación de Registro de Cuenta",
      "Mensaje de TECOPOS",
      templateMailHTML(name_to, body)
    );
  } catch (error) {
    throw error;
  }
};

export const accountSecPinNotification = async ({
  to,
  name_to,
  securityPinData,
}: {
  to: string;
  name_to: string;
  securityPinData: {
    name: string;
    securityPin: string;
  };
}): Promise<void> => {
  // Verifying configuration is not local
  // if (process.env.MODE === 'local') {
  //   return;
  // }

  try {
    const body = `<p> Hola ${
      securityPinData.name
    }, su contraseña de pago en TECOPAY ha sido actualizada correctamente.</p>
    <br>
    <p><b>Detalles del cambio:</b></p>
    <p><b>Nueva contraseña:</b>${securityPinData.securityPin}</p>
    <p><b>Fecha y Hora:</b> ${new Date()}</p>

       
    <style>
      .link {
        font-size: 17px;
        padding: 0.5em 2em;
        border: transparent;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        background: dodgerblue;
        color: white;
        border-radius: 4px;
       }
       
       #link:hover {
        background: rgb(2,0,36);
        background: linear-gradient(90deg, rgba(30,144,255,1) 0%, rgba(0,212,255,1) 100%);
       }       
      </style>
    <br>`;

    await emailComposer(
      to,
      "Confirmación de Cambio de Contraseña de Pago",
      "Mensaje de TECOPOS",
      templateMailHTML(name_to, body)
    );
  } catch (error) {
    throw error;
  }
};

export const blockAccountNotification = async ({
  to,
  name_to,
  accountData,
}: {
  to: string;
  name_to: string;
  accountData: {
    name: string;
    accountNumber: string;
    entity: any;
  };
}): Promise<void> => {
  // Verifying configuration is not local
  // if (process.env.MODE === 'local') {
  //   return;
  // }

  try {
    const body = `<p> Hola ${
      accountData.name
    }, su cuenta de TECOPAY en la entidad ${
      accountData.entity
    } ha sido bloqueada.</p>
    <br>
    <p><b>Detalles del cambio:</b></p>
    <p><b>Número de cuenta:</b>${accountData.accountNumber}</p>
    <p><b>Propietario:</b> ${accountData.name}</p>
    <p><b>Entidad Emisora:</b> ${accountData.entity}</p

    <p><b>Fecha y Hora:</b> ${new Date()}</p



       
    <style>
      .link {
        font-size: 17px;
        padding: 0.5em 2em;
        border: transparent;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        background: dodgerblue;
        color: white;
        border-radius: 4px;
       }
       
       #link:hover {
        background: rgb(2,0,36);
        background: linear-gradient(90deg, rgba(30,144,255,1) 0%, rgba(0,212,255,1) 100%);
       }       
      </style>
    <br>`;

    await emailComposer(
      to,
      "Notificación de Bloqueo de Cuenta",
      "Mensaje de TECOPOS",
      templateMailHTML(name_to, body)
    );
  } catch (error) {
    throw error;
  }
};

export const cardRequestNotification = async ({
  to,
  name_to,
  RequestData,
}: {
  to: string;
  name_to: string;
  RequestData: {
    holderName: string;
    quantity: number;
    priority: any;
    entity: any;
    category: any;
  };
}): Promise<void> => {
  // Verifying configuration is not local
  // if (process.env.MODE === 'local') {
  //   return;
  // }

  try {
    const body = `<p> Hola ${
      RequestData.holderName
    }, usted ha solicitado una tarjeta TECOPAY en la entidad ${
      RequestData.entity
    }.</p>
    <br>
    <p><b>Detalles de la soilicitud:</b></p>
    <p><b>Fecha y Hora:</b> ${new Date()}</p>
    <p><b>Solicitante:</b> ${RequestData.holderName}</p>
    <p><b>Entidad emisora:</b> ${RequestData.entity}</p>
    <p><b>Prioridad:</b> ${RequestData.priority}</p>
    <p><b>Categoría:</b> ${RequestData.category}</p>
      
    <style>
      .link {
        font-size: 17px;
        padding: 0.5em 2em;
        border: transparent;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        background: dodgerblue;
        color: white;
        border-radius: 4px;
       }
       
       #link:hover {
        background: rgb(2,0,36);
        background: linear-gradient(90deg, rgba(30,144,255,1) 0%, rgba(0,212,255,1) 100%);
       }       
      </style>
    <br>`;

    await emailComposer(
      to,
      "Notificación de Solicitud de Tarjeta",
      "Mensaje de TECOPOS",
      templateMailHTML(name_to, body)
    );
  } catch (error) {
    throw error;
  }
};
