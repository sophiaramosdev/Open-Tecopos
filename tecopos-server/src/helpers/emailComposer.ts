import nodemailer from "nodemailer";
import moment from "moment";

import GeneralConfigs from "../database/models/generalConfigs";
import Business from "../database/models/business";
import Logger from "../lib/logger";
import User from "../database/models/user";
import { getFullAddress, truncateValue, formatCurrency } from "./utils";
import SelledProduct from "../database/models/selledProduct";
import OrderReceiptTotal from "../database/models/OrderReceiptTotal";
import OrderReceipt from "../database/models/orderReceipt";
import OrderReceiptPrice from "../database/models/orderReceiptPrice";
import Price from "../database/models/price";
import Image from "../database/models/image";
import { order_receipt_status } from "../interfaces/nomenclators";
import { getBusinessConfigCache } from "./redisStructure";

const DEFAULT_IMAGE_PLACEHOLDER = `https://admin.tecopos.com/static/media/image-default.0eda0e59869d0976d517.jpg`;

export const codeToRecoverPasswordFromMarketPlace = async (
  user: User,
  code: string
) => {
  // Verifiying configuration is not local
  if (process.env.MODE === "local") {
    return;
  }

  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const mail_from = `"Tecopos" <no-reply@tecopos.com>`;

  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const body = `<p>Ha solicitado cambiar su contraseña de acceso al sistema único de autenticación de TECOPOS</p>
      <br>
      <p>Su código es:</p>
      <h1><b>${code}</b></h1>
      <br/>
      <p>Si usted no solicitó cambiar su contraseña ignore este correo.</p>
      <br/>
      <p>Saludos,</p>`;

    // send mail with defined transport object
    transporter
      .sendMail({
        from: mail_from,
        to: user.email, // list of receivers
        subject: "Código de cambio de contraseña", // Subject line
        text: "Mensaje de cambio de contraseña", // plain text body
        html: templateMailHTML(user.displayName || user.email, body),
      })
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

export const codeToRecoverPassword = async (
  user: User,
  code: string,
  business: Business
) => {
  // Verifiying configuration is not local
  if (process.env.MODE === "local") {
    return;
  }

  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const mail_from = `"${business.name}" <no-reply@tecopos.com>`;

  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const body = `<p>Ha solicitado desde ${business.name} cambiar su contraseña de acceso al sistema único de autenticación de TECOPOS</p>
      <br>
      <p>Su código es:</p>
      <h1><b>${code}</b></h1>
      <br/>
      <p>Si usted no solicitó cambiar su contraseña ignore este correo.</p>
      <br/>
      <p>Saludos,</p>`;

    //Principal phone
    let phone = business.phones?.find((item) => item.isMain)?.number;
    if (!phone) {
      phone = business.phones?.[0]?.number;
    }

    const ending_text = `<span class="apple-link">${
      business.name
    } ${getFullAddress(business.address)}</span>
                      ${business.email ? `<br/> ${business.email}` : ""}
                      ${phone ? `<br/> ${phone}` : ""}
                      <br/>`;

    // send mail with defined transport object
    transporter
      .sendMail({
        from: mail_from,
        to: user.email, // list of receivers
        subject: "Código de cambio de contraseña", // Subject line
        text: "Mensaje de cambio de contraseña", // plain text body
        html: templateBusinessMailHTML(
          user.displayName || user.email,
          business.name,
          business.logo ? business.logo.src : DEFAULT_IMAGE_PLACEHOLDER,
          ending_text,
          body
        ), // html body
      })
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

export const newMasterOwnerNotification = async (business: Business) => {
  // Verifiying configuration is not local
  if (process.env.MODE === "local") {
    return;
  }

  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const mail_from = generalConfigs.find(
    (item) => item.key === "mail_from"
  )?.value;
  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;
  const public_shop_host = generalConfigs.find(
    (item) => item.key === "public_shop_host"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const newMasterOwner = business.masterOwner;

    if (!newMasterOwner) {
      return;
    }

    const fullShopUrl = public_shop_host + "/" + business.slug;

    const body = `<p>Ha sido registrado como Propietario Maestro. El Propietario Maestro es el usuario que posee el control total de un negocio registrado en TECOPOS. Debajo los detalles.</p>
      <br>
      <p>Puede acceder a la administración del sistema a través de la siguiente dirección <a href="https://admin.tecopos.com">https://admin.tecopos.com</a></p>
      <p><b>Nombre de negocio:</b> ${business.name}</p>
      <p><b>Plan contratado:</b> ${business.subscriptionPlan.name}</p>
      <p><b>Licencia válida hasta:</b> ${
        business.licenceUntil
          ? moment(business.licenceUntil).format("DD/MM/YYYY")
          : "Indefinido"
      }</p>
      <p><b>URL de la tienda pública:</b> <a href="${fullShopUrl}">${fullShopUrl}</a></p>
      <br>`;

    // send mail with defined transport object
    transporter
      .sendMail({
        from: mail_from,
        to: newMasterOwner.email, // list of receivers
        subject: "Ha sido registrado como Propietario Maestro", // Subject line
        text: "Mensaje de TECOPOS", // plain text body
        html: templateMailHTML(
          newMasterOwner.displayName ?? newMasterOwner.username,
          body
        ), // html body
      })
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

export const newUserNotification = async (
  to: string,
  name_to: string,
  plainTextPassword: string
) => {
  //Verifiying configuration is not local
  if (process.env.MODE === "local") {
    return;
  }

  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const mail_from = generalConfigs.find(
    (item) => item.key === "mail_from"
  )?.value;
  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const body = `<p>Bienvenido(a) a esta gran familia que es el Ecosistema Tecnológico de Puntos de Venta (TECOPOS). Nuestra misión es proveerte las herramientas necesarias para agilizar y optimizar tu trabajo, así como reducir el tiempo en tareas administrativas.</p>
        <br>
        <p>Puede acceder a la administración del sistema a través de la siguiente dirección <a href="https://admin.tecopos.com">https://admin.tecopos.com</a></p>
        <p>Sus credenciales de acceso son:</p>
        <p><b>Usuario:</b> ${to}</p>
        <p><b>Contraseña:</b> ${plainTextPassword}</p>
        <br>`;

    // send mail with defined transport object
    transporter
      .sendMail({
        from: mail_from,
        to: to, // list of receivers
        subject: "¡Bienvenido(a) a TECOPOS!", // Subject line
        text: "Mensaje de TECOPOS", // plain text body
        html: templateMailHTML(name_to, body), // html body
      })
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

export const newBusinessCreated = async (
  to: string,
  name_to: string,
  plainTextPassword: string,
  business: Business
) => {
  //Verifiying configuration is not local
  if (process.env.MODE === "local") {
    return;
  }

  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const mail_from = generalConfigs.find(
    (item) => item.key === "mail_from"
  )?.value;
  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const body = `<p>Bienvenido(a) a esta gran familia que es el Ecosistema Tecnológico de Puntos de Venta (TECOPOS). Desde nuestras plataformas ha completado el registro del negocio ${business.name}, el cual se activará una vez haya iniciado sesión son sus credenciales de acceso. </p>
        <br>
        <p>Puede acceder a la administración del sistema a través de la siguiente dirección <a href="https://admin.tecopos.com">https://admin.tecopos.com</a></p>
        <p>Sus credenciales de acceso son:</p>
        <p><b>Usuario:</b> ${to}</p>
        <p><b>Contraseña:</b> ${plainTextPassword}</p>
        <br>
        <p>Al utilizar TECOPOS una tienda virtual automáticamente es generada. La URL pública es <a href="https://tienda.tecopos.com/${business.slug}">https://tienda.tecopos.com/${business.slug}</a></p>
        <br>`;

    // send mail with defined transport object
    transporter
      .sendMail({
        from: mail_from,
        to: to, // list of receivers
        subject: "¡Bienvenido(a) a TECOPOS!", // Subject line
        text: "Mensaje de TECOPOS", // plain text body
        html: templateMailHTML(name_to, body), // html body
      })
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

export const changePasswordNotification = async (
  to: string,
  name_to: string,
  plainTextPassword: string
) => {
  //Verifiying configuration is not local
  if (process.env.MODE === "local") {
    return;
  }

  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const mail_from = generalConfigs.find(
    (item) => item.key === "mail_from"
  )?.value;
  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const body = `<p>Se le ha solicitado a TECOPOS el reinicio de su contraseña, debajo los detalles. </p>
        <br>
        <p>Puede acceder a la administración del sistema a través de la siguiente dirección <a href="https://admin.tecopos.com">https://admin.tecopos.com</a></p>
        <p>Sus nuevas credenciales de acceso son:</p>
        <p><b>Usuario:</b> ${to}</p>
        <p><b>Contraseña:</b> ${plainTextPassword}</p>
        <br>`;

    // send mail with defined transport object
    transporter
      .sendMail({
        from: mail_from,
        to: to, // list of receivers
        subject: "Cambio de contraseña", // Subject line
        text: "Mensaje de TECOPOS", // plain text body
        html: templateMailHTML(name_to, body), // html body
      })
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

interface notificationNewOrderProps {
  to: string;
  order: OrderReceipt;
  business: Business;
  isOwner: boolean;
  isBuyer?: boolean;
}
export const notificationNewOrder = async ({
  to,
  order,
  business,
  isOwner,
  isBuyer,
}: notificationNewOrderProps) => {
  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const businessConfig = await getBusinessConfigCache(business.id);

  const businessInvoiceName = businessConfig.find(
    (ck) => ck.key === "invoice_business_name"
  )?.value;

  const mail_from = generalConfigs.find(
    (item) => item.key === "mail_from"
  )?.value;
  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const {
      operationNumber,
      preOperationNumber,
      createdAt,
      selledProducts,
      client,
      shippingPrice,
      shipping,
      billing,
      pickUpInStore,
      isPreReceipt,
    } = order;
    //format date
    moment.locale("es");
    let formateDate = moment(createdAt).format(
      "dddd D [de] MMMM [de] YYYY [a las] HH:mm"
    );

    const imageBusiness = await Image.findByPk(business.logoId);

    let addressClient = "Recoger en tienda.";
    let addressBilling = "Recoger en tienda.";
    let footer = "";

    if (!pickUpInStore) {
      const descriptionClient = shipping?.description
        ? `(${shipping?.description})`
        : "";
      const descriptionBilling = billing?.description
        ? `(${billing?.description})`
        : "";
      //format address send
      addressClient = `${shipping?.street_1 ?? ""} ${shipping?.city ?? ""} ${
        shipping?.municipality?.name ?? ""
      } ${shipping?.province?.name ?? ""} ${descriptionClient}`;

      addressBilling = `${billing?.street_1 ?? ""} ${billing?.city ?? ""} ${
        billing?.municipality?.name ?? ""
      } ${billing?.province?.name ?? ""} ${descriptionBilling}`;
    }

    const phonesNumber = new Set<string>()
    client?.phones?.forEach((item) => item.number ?? "");
    if (shipping?.phone) {
      phonesNumber?.add(shipping?.phone);
    }
    if (billing?.phone) {
      phonesNumber?.add(billing?.phone);
    }

    if (order.status !== "BILLED") {
      footer =
        "Esta factura se encuentra pendiente de pago, por favor complete el mismo o póngase en contacto con el negocio.";
    }

    if (order.status === "BILLED") {
      footer = ` <p> Su pago ha sido registrado con éxito.</p>
      <span>Si tiene alguna pregunta o necesita asistencia adicional, no dude en contactarnos.</span>`;

      formateDate = moment(order.paidAt).format(
        "dddd D [de] MMMM [de] YYYY [a las] HH:mm"
      );
    }

    const type: "PRE_ORDER" | "ORDER" = order.isPreReceipt
      ? "PRE_ORDER"
      : "ORDER";

    transporter
      .sendMail({
        from: `"${businessInvoiceName || business.name}" ${
          mail_from?.split(" ")[1]
        }`,
        to: to, // list of receivers
        subject: "Notificación de pedido", // Subject line
        text: "Mensaje de TECOPOS", // plain text body
        html: templateMailHTMLNotificationOrder({
          orderId: isPreReceipt ? preOperationNumber : operationNumber,
          date: formateDate,
          nameBusiness: businessInvoiceName ?? business.name,
          imageBusiness: imageBusiness?.src ?? DEFAULT_IMAGE_PLACEHOLDER,
          products: selledProducts,
          totalPay: order.totalToPay,
          subTotalPrice: order.prices,
          sendPrice: shippingPrice as Price,
          discount: order.discount,
          phoneNumber: Array.from(phonesNumber).join(",") ?? "",
          nameClient: isBuyer ? `${client?.firstName ?? billing?.firstName ?? ""} ${
            client?.lastName ?? billing?.lastName ?? ""
          }` : `${shipping.firstName??""} ${shipping.lastName??""}`,
          isOwner,
          addressClient,
          addressBilling,
          footer,
          status: order.status,
          type,
          isBuyer,
        }),
      })
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

interface ChangeOrderStatusProps {
  to: string;
  order: OrderReceipt;
  business: Business;
}
export const notificationChangeOrderStatus = async ({
  to,
  order,
  business,
}: ChangeOrderStatusProps) => {
  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const businessConfig = await getBusinessConfigCache(business.id);

  const businessInvoiceName = businessConfig.find(
    (ck) => ck.key === "invoice_business_name"
  )?.value;

  const mail_from = generalConfigs.find(
    (item) => item.key === "mail_from"
  )?.value;
  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const imageBusiness = await Image.findByPk(business.logoId);

    const businessImage = imageBusiness?.src ?? DEFAULT_IMAGE_PLACEHOLDER;

    let statusMessage = "";

    switch (order.status) {
      case "IN_TRANSIT":
        statusMessage = "Su pedido está en proceso de entrega.";
        break;

      case "IN_PROCESS":
        statusMessage = "Su pedido esta siendo procesado.";
        break;

      case "DELIVERED":
        statusMessage = "Su pedido ha sido entregado con éxito.";
        break;

      default:
        break;
    }

    transporter
      .sendMail({
        from: `"${businessInvoiceName || business.name}" ${
          mail_from?.split(" ")[1]
        }`,
        to, // list of receivers
        subject: `Estado del pedido #${order.operationNumber}`, // Subject line
        text: "Notificación de TECOPOS", // plain text body
        html: templateMailChangeStatus({
          business,
          businessImage,
          order,
          statusMessage,
        }),
      })
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

interface notificationAdmin {
  to: string;
  order: OrderReceipt;
  business: Business;
  type:
    | "OWNER"
    | "NEW_ORDEN_ONLINE"
    | "NEW_ORDEN_ADMIN"
    | "REMEMBER_ORDER"
    | "PAID_ORDER"
    | "OVERDUE_PAYMENT"
    | "ORDER_EDITED_ADMIN";
}
export const notificationAdmin = async ({
  to,
  order,
  business,
  type,
}: notificationAdmin) => {
  // Verifiying configuration is not local
  if (process.env.MODE === "local") {
    return;
  }

  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const mail_from = generalConfigs.find(
    (item) => item.key === "mail_from"
  )?.value;
  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const {
      operationNumber,
      createdAt,
      selledProducts,
      shippingPrice,
      shipping,
      client,
      paymentDeadlineAt,
      pickUpInStore,
      status,
    } = order;

    //format date
    moment.locale("es");
    const formateDate = moment(createdAt).format(
      "dddd D [de] MMMM [de] YYYY [a las] HH:mm"
    );

    const dateLimit = moment(paymentDeadlineAt).format(
      "dddd D [de] MMMM [de] YYYY "
    );

    const nameClient = `${client?.firstName} ${client?.lastName}`;
    const imageBusiness = await Image.findByPk(business.logoId);

    const descriptionClient = shipping?.description
      ? `(${shipping?.description})`
      : "";
    // const descriptionBilling = billing?.description ? `(${billing?.description})` : ''
    //format address send
    let addressClient = "";
    //let addressBilling = ""
    if (pickUpInStore) {
      addressClient = `${shipping?.street_1 ?? ""}/${shipping?.city ?? ""}/${
        shipping?.municipality?.name ?? ""
      }/${shipping?.province?.name ?? ""} ${descriptionClient}`;

      // addressBilling = `${billing?.street_1 ?? ""}/${billing?.city ?? ""}/${billing?.municipality.name ?? ""}/${billing?.province.name ?? ""} ${descriptionBilling}`
    }

    const totalPay = order?.totalToPay;
    const subTotalPrice = order?.prices;
    const sendPrice = shippingPrice as Price;
    const discount = order?.discount || 0;

    const phoneNumber = shipping?.phone || "";

    let messageHeader = "";
    let sessionPrices = `<p>Subtotal: $${subTotalPrice
      .map((price) => `${price?.price}/${price?.codeCurrency}`)
      .join(", ")}</p>
    ${
      sendPrice
        ? `<p>Envío: $${sendPrice?.amount}/${sendPrice?.codeCurrency}</p>`
        : ""
    }
    ${
      discount
        ? `<p>Descuento: $${discount}/${sendPrice?.codeCurrency}</p>`
        : ""
    }
     <p>Total: $${totalPay
       .map((pay) => `${pay?.amount}/${pay?.codeCurrency}`)
       .join(", ")}</p>`;

    let sendInfo = `<h3>Información de Envío</h3>
    <p>Cliente: ${nameClient}</p>
    <p>Teléfono: ${phoneNumber}</p>
    <p>Dirección de envío: ${addressClient}</p>`;

    let footer = "";
    let extra = "";

    if (status === "PAYMENT_PENDING") {
      extra = `pendiente al pago con una fecha límite para ${dateLimit}`;
    }

    switch (type) {
      case "NEW_ORDEN_ADMIN":
        messageHeader = `<p class="welcome" > Hola ${nameClient}, le agradecemos por su compra en nuestro negocio ${extra}. A continuación su factura más detallada: </p>`;

        footer = `<p>Esta factura ha sido generada desde la administración de nuestro negocio. Ante cualquier inconveniente o duda, por favor, no dude en contactarnos.</p>
        <p>Le agradecemos por elegir nuestros productos/servicios.</p>`;
        break;

      case "REMEMBER_ORDER":
        messageHeader = `<p  class="reminder" > Estimado(a) ${nameClient}, </p>
      <p> Le recordamos amablemente que su compra en nuestro sitio está pendiente de pago.< /p>
        <p> A continuación, detallamos la información de su factura: </p>`;

        footer = `<p>Su pedido tiene fecha límite de pago ${dateLimit}.</p>`;
        break;

      case "OVERDUE_PAYMENT":
        messageHeader = `<p class="overdue">Estimado(a) ${nameClient},</p>
          <p>El pago de su compra está pendiente y se encuentra vencido.</p>
          <p>A continuación, detallamos la información de su factura:</p>`;

        footer = `<p>Si ya ha realizado el pago, por favor contacte a la administración del negocio.</p>`;
        break;

      case "PAID_ORDER":
        messageHeader = `<p class="success">¡Hola ${nameClient}!</p>
        <p>Su pago ha sido registrado con éxito.</p>
        <p>A continuación, detallamos la información de su transacción:</p>`;

        footer = `<p>Si tiene alguna pregunta o necesita asistencia adicional, no dude en contactarnos.</p>
        <p>Le agradecemos por elegir nuestros productos/servicios. ¡Esperamos que disfrute de su compra!</p>`;
        break;

      case "ORDER_EDITED_ADMIN":
        messageHeader = `<p class="edit">¡Hola ${nameClient}!</p>
        <p>Se han realizado algunas modificaciones en su orden. A continuación, le proporcionamos los detalles actualizados:</p>`;

        footer = `<p>Si tienes alguna pregunta o necesitas más información sobre las modificaciones realizadas, no dudes en contactarnos.</p>`;
        break;
    }

    // send mail with defined transport object
    transporter
      .sendMail({
        from: mail_from,
        to: to, // list of receivers
        subject: "Notificación de pedido", // Subject line
        text: "Mensaje de TECOPOS", // plain text body
        html: templateMailHTMLNotificationOrderAdmin({
          operationNumber,
          date: formateDate,
          nameBusiness: business.name,
          imageBusiness: imageBusiness?.src ?? DEFAULT_IMAGE_PLACEHOLDER,
          products: selledProducts,
          messageHeader,
          sessionPrices,
          sendInfo,
          footer,
        }), // html body
      })
      .then((res) => console.log("SEND MAIL"))
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

interface notificationReservation {
  to: string;
  order: OrderReceipt;
  business: Business;
  type:
    | "RESERVATION_REMINDER"
    | "RESERVATION_CONFIRMATION"
    | "RESERVATION_PRE"
    | "RESERVATION_RESCHEDULE"
    | "RESERVATION_CANCELLATION";
}
export const notificationReservations = async ({
  to,
  order,
  business,
  type,
}: notificationReservation) => {
  //Verifiying configuration is not local
  // if (process.env.MODE === "local") {
  //   return;
  // }
  const generalConfigs = await GeneralConfigs.findAll({
    attributes: ["key", "value"],
  });

  const mail_from = generalConfigs.find(
    (item) => item.key === "mail_from"
  )?.value;
  const mail_host = generalConfigs.find(
    (item) => item.key === "mail_host"
  )?.value;
  const mail_port = generalConfigs.find(
    (item) => item.key === "mail_port"
  )?.value;
  const mail_user = generalConfigs.find(
    (item) => item.key === "mail_user"
  )?.value;
  const mail_password = generalConfigs.find(
    (item) => item.key === "mail_password"
  )?.value;

  try {
    let transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port),
      secure: false,
      auth: {
        user: mail_user,
        pass: mail_password,
      },
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true,
    });

    const { reservationNumber, createdAt, selledProducts, client, status } =
      order;
    //format date
    moment.locale("es");

    const service = selledProducts[0];

    let dateStart = moment(service.startDateAt).format("DD/MM/YYYY");
    let dateEnd = moment(service.endDateAt).format("DD/MM/YYYY");
    let reservationFor = "";

    if (service?.product?.hasDuration) {
      dateEnd = moment(service.startDateAt).format("HH:mm");
      reservationFor = service?.product?.duration ?? "00:00";
    }
    const configurations = await getBusinessConfigCache(business.id);
    const nameClient = `${client?.firstName} ${client?.lastName}`;

    const imageBusiness = await Image.findByPk(business.logoId);

    const totalPay = order?.totalToPay;
    const subTotalPrice = order?.prices;
    const discount = order?.discount || 0;

    let messageHeader = "";
    let sessionPrices = `<p>Subtotal: $${subTotalPrice
      .map((price) => `${price?.price}/${price?.codeCurrency}`)
      .join(", ")}</p>
    ${discount ? `<p>Descuento: ${discount}` : ""}
     <p>Total: $${totalPay
       .map((pay) => `${pay?.amount}/${pay?.codeCurrency}`)
       .join(", ")}</p>`;

    let sendInfo = `<h3>Información de Envío</h3>
    <p>Cliente: ${nameClient}</p>`;

    let footer = "";
    let extra = "";
    let subject = "";

    switch (type) {
      case "RESERVATION_REMINDER":
        const reminder_message_template =
          configurations.find(
            (item) => item.key === "reminder_message_template"
          )?.value ?? "";
        const reminder_subject =
          configurations.find((item) => item.key === "reminder_subject")
            ?.value ?? "";
        messageHeader = reminder_message_template;
        subject = reminder_subject;
        break;

      case "RESERVATION_CONFIRMATION":
        const confirmation_subject_online =
          configurations.find(
            (item) => item.key === "confirmation_message_template"
          )?.value ?? "";
        const confirmation_message_template_online =
          configurations.find(
            (item) => item.key === "confirmation_message_template_online"
          )?.value ?? "";
        messageHeader = confirmation_subject_online;
        subject = confirmation_message_template_online;

        break;

      case "RESERVATION_PRE":
        const pre_booking_subject =
          configurations.find((item) => item.key === "pre_booking_subject")
            ?.value ?? "";
        const pre_booking_message_template =
          configurations.find(
            (item) => item.key === "pre_booking_message_template"
          )?.value ?? "";
        messageHeader = pre_booking_subject;
        subject = pre_booking_message_template;
        break;

      case "RESERVATION_RESCHEDULE":
        const reschedule_message_template =
          configurations.find(
            (item) => item.key === "reschedule_message_template"
          )?.value ?? "";
        const reschedule_subject =
          configurations.find((item) => item.key === "reschedule_subject")
            ?.value ?? "";
        messageHeader = reschedule_message_template;
        subject = reschedule_subject;
        break;

      case "RESERVATION_CANCELLATION":
        const set_cancellation_message_template =
          configurations.find(
            (item) => item.key === "cancellation_message_template"
          )?.value ?? "";
        const cancellation_subject =
          configurations.find((item) => item.key === "cancellation_subject")
            ?.value ?? "";
        messageHeader = set_cancellation_message_template;
        subject = cancellation_subject;
        break;
    }

    // send mail with defined transport object
    transporter
      .sendMail({
        from: mail_from,
        to: to, // list of receivers
        subject: subject, // Subject line
        text: "Mensaje de TECOPOS", // plain text body
        html: templateMailHTMLNotificationReservation({
          reservationNumber,
          dateStart,
          dateEnd,
          nameBusiness: business.name,
          imageBusiness: imageBusiness?.src ?? DEFAULT_IMAGE_PLACEHOLDER,
          products: selledProducts,
          reservationFor,
          hasDuration: service?.product?.hasDuration,
          messageHeader,
          footer,
        }), // html body
      })
      .then((res) => console.log("SEND MAIL"))
      .catch((error) => Logger.error(error));
  } catch (error) {
    Logger.error(error);
  }
};

const templateMailHTML = (
  name_to: string,
  body_text: string,
  url_button?: string,
  text_url_button?: string
) => {
  return `<!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Simple Transactional Email</title>
        <style>
          /* -------------------------------------
              GLOBAL RESETS
          ------------------------------------- */
          
          /*All the styling goes here*/
          
          img {
            border: none;
            -ms-interpolation-mode: bicubic;
            max-width: 100%; 
          }
    
          body {
            background-color: #f6f6f6;
            font-family: sans-serif;
            -webkit-font-smoothing: antialiased;
            font-size: 14px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%; 
          }
    
          table {
            border-collapse: separate;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            width: 100%; }
            table td {
              font-family: sans-serif;
              font-size: 14px;
              vertical-align: top; 
          }
    
          /* -------------------------------------
              BODY & CONTAINER
          ------------------------------------- */
    
          .body {
            background-color: #f6f6f6;
            width: 100%; 
          }
    
          /* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */
          .container {
            display: block;
            margin: 0 auto !important;
            /* makes it centered */
            max-width: 580px;
            padding: 10px;
            width: 580px; 
          }
    
          /* This should also be a block element, so that it will fill 100% of the .container */
          .content {
            box-sizing: border-box;
            display: block;
            margin: 0 auto;
            max-width: 580px;
            padding: 10px; 
          }
    
          /* -------------------------------------
              HEADER, FOOTER, MAIN
          ------------------------------------- */
          .main {
            background: #ffffff;
            border-radius: 3px;
            width: 100%; 
          }
    
          .wrapper {
            box-sizing: border-box;
            padding: 20px; 
          }
    
          .content-block {
            padding-bottom: 10px;
            padding-top: 10px;
          }
    
          .footer {
            clear: both;
            margin-top: 10px;
            text-align: center;
            width: 100%; 
          }
            .footer td,
            .footer p,
            .footer span,
            .footer a {
              color: #999999;
              font-size: 12px;
              text-align: center; 
          }
    
          /* -------------------------------------
              TYPOGRAPHY
          ------------------------------------- */
          h1,
          h2,
          h3,
          h4 {
            color: #000000;
            font-family: sans-serif;
            font-weight: 400;
            line-height: 1.4;
            margin: 0;
            margin-bottom: 30px; 
          }
    
          h1 {
            font-size: 35px;
            font-weight: 300;
            text-align: center;
            text-transform: capitalize; 
          }
    
          p,
          ul,
          ol {
            font-family: sans-serif;
            font-size: 14px;
            font-weight: normal;
            margin: 0;
            margin-bottom: 15px; 
          }
            p li,
            ul li,
            ol li {
              list-style-position: inside;
              margin-left: 5px; 
          }
    
          a {
            color: #3498db;
            text-decoration: underline; 
          }
    
          /* -------------------------------------
              BUTTONS
          ------------------------------------- */
          .btn {
            box-sizing: border-box;
            width: 100%; }
            .btn > tbody > tr > td {
              padding-bottom: 15px; }
            .btn table {
              width: auto; 
          }
            .btn table td {
              background-color: #ffffff;
              border-radius: 5px;
              text-align: center; 
          }
            .btn a {
              background-color: #ffffff;
              border: solid 1px #3498db;
              border-radius: 5px;
              box-sizing: border-box;
              color: #3498db;
              cursor: pointer;
              display: inline-block;
              font-size: 14px;
              font-weight: bold;
              margin: 0;
              padding: 12px 25px;
              text-decoration: none;
              text-transform: capitalize; 
          }
    
          .btn-primary table td {
            background-color: #3498db; 
          }
    
          .btn-primary a {
            background-color: #3498db;
            border-color: #3498db;
            color: #ffffff; 
          }
    
          /* -------------------------------------
              OTHER STYLES THAT MIGHT BE USEFUL
          ------------------------------------- */
          .last {
            margin-bottom: 0; 
          }
    
          .first {
            margin-top: 0; 
          }
    
          .align-center {
            text-align: center; 
          }
    
          .align-right {
            text-align: right; 
          }
    
          .align-left {
            text-align: left; 
          }
    
          .clear {
            clear: both; 
          }
    
          .mt0 {
            margin-top: 0; 
          }
    
          .mb0 {
            margin-bottom: 0; 
          }
    
          .preheader {
            color: transparent;
            display: none;
            height: 0;
            max-height: 0;
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            mso-hide: all;
            visibility: hidden;
            width: 0; 
          }
    
          .powered-by a {
            text-decoration: none; 
          }
    
          hr {
            border: 0;
            border-bottom: 1px solid #f6f6f6;
            margin: 20px 0; 
          }
    
          /* -------------------------------------
              RESPONSIVE AND MOBILE FRIENDLY STYLES
          ------------------------------------- */
          @media only screen and (max-width: 620px) {
            table.body h1 {
              font-size: 28px !important;
              margin-bottom: 10px !important; 
            }
            table.body p,
            table.body ul,
            table.body ol,
            table.body td,
            table.body span,
            table.body a {
              font-size: 16px !important; 
            }
            table.body .wrapper,
            table.body .article {
              padding: 10px !important; 
            }
            table.body .content {
              padding: 0 !important; 
            }
            table.body .container {
              padding: 0 !important;
              width: 100% !important; 
            }
            table.body .main {
              border-left-width: 0 !important;
              border-radius: 0 !important;
              border-right-width: 0 !important; 
            }
            table.body .btn table {
              width: 100% !important; 
            }
            table.body .btn a {
              width: 100% !important; 
            }
            table.body .img-responsive {
              height: auto !important;
              max-width: 100% !important;
              width: auto !important; 
            }
          }
    
          /* -------------------------------------
              PRESERVE THESE STYLES IN THE HEAD
          ------------------------------------- */
          @media all {
            .ExternalClass {
              width: 100%; 
            }
            .ExternalClass,
            .ExternalClass p,
            .ExternalClass span,
            .ExternalClass font,
            .ExternalClass td,
            .ExternalClass div {
              line-height: 100%; 
            }
            .apple-link a {
              color: inherit !important;
              font-family: inherit !important;
              font-size: inherit !important;
              font-weight: inherit !important;
              line-height: inherit !important;
              text-decoration: none !important; 
            }
            #MessageViewBody a {
              color: inherit;
              text-decoration: none;
              font-size: inherit;
              font-family: inherit;
              font-weight: inherit;
              line-height: inherit;
            }
            .btn-primary table td:hover {
              background-color: #34495e !important; 
            }
            .btn-primary a:hover {
              background-color: #34495e !important;
              border-color: #34495e !important; 
            } 
          }
    
        </style>
      </head>
      <body>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
          <tr>
            <td>&nbsp;</td>
            <td class="container">
              <div class="content">
    
                <!-- START CENTERED WHITE CONTAINER -->
                <table role="presentation" class="main">
    
                  <!-- START MAIN CONTENT AREA -->
                  <tr>
                    <td class="wrapper">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="content-block powered-by align-center">
                        <img src="https://admin.tecopos.com/static/media/logo3.2f622b6e1f6afe96082d.png" alt="Tecopos logo" style="width:150px;height:150px;"/>
                        </td>
                    </tr>
                        <tr>
                          <td>
                            <p>Hola ${name_to},</p>
                            <p>${body_text}</p>
                            ${
                              url_button
                                ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">
                            <tbody>
                              <tr>
                                <td align="left">
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                    <tbody>
                                      <tr>
                                        <td> <a href="${url_button}" target="_blank">${text_url_button}</a> </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>`
                                : ``
                            }
                            <p>No dude en contactarnos ante problemas, dudas o sugerencias.</p>
                            <p>Saludos, Equipo Técnico de TECOPOS</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
    
                <!-- END MAIN CONTENT AREA -->
                </table>
                <!-- END CENTERED WHITE CONTAINER -->
    
                <!-- START FOOTER -->
                <div class="footer">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="content-block">
                        <span class="apple-link">TECOPOS Arroyo Naranjo. La Habana. Cuba</span>
                        <br>info@tecopos.com
                        <br>+53 5 9112215 
                        <br/>
                        <br> Este es un correo autogenerado por el sistema TECOPOS. <a href="https://admin.tecopos.com">Cambiar notificaciones</a>.
                      </td>
                    </tr>
                  </table>
                </div>
                <!-- END FOOTER -->
    
              </div>
            </td>
            <td>&nbsp;</td>
          </tr>
        </table>
      </body>
    </html>`;
};

const templateBusinessMailHTML = (
  name_to: string | undefined,
  name_business: string,
  logo_business: string,
  ending_text: string,
  body_text: string,
  url_button?: string,
  text_url_button?: string
) => {
  return `<!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Simple Transactional Email</title>
        <style>
          /* -------------------------------------
              GLOBAL RESETS
          ------------------------------------- */
          
          /*All the styling goes here*/
          
          img {
            border: none;
            -ms-interpolation-mode: bicubic;
            max-width: 100%; 
          }
    
          body {
            background-color: #f6f6f6;
            font-family: sans-serif;
            -webkit-font-smoothing: antialiased;
            font-size: 14px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%; 
          }
    
          table {
            border-collapse: separate;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            width: 100%; }
            table td {
              font-family: sans-serif;
              font-size: 14px;
              vertical-align: top; 
          }
    
          /* -------------------------------------
              BODY & CONTAINER
          ------------------------------------- */
    
          .body {
            background-color: #f6f6f6;
            width: 100%; 
          }
    
          /* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */
          .container {
            display: block;
            margin: 0 auto !important;
            /* makes it centered */
            max-width: 580px;
            padding: 10px;
            width: 580px; 
          }
    
          /* This should also be a block element, so that it will fill 100% of the .container */
          .content {
            box-sizing: border-box;
            display: block;
            margin: 0 auto;
            max-width: 580px;
            padding: 10px; 
          }
    
          /* -------------------------------------
              HEADER, FOOTER, MAIN
          ------------------------------------- */
          .main {
            background: #ffffff;
            border-radius: 3px;
            width: 100%; 
          }
    
          .wrapper {
            box-sizing: border-box;
            padding: 20px; 
          }
    
          .content-block {
            padding-bottom: 10px;
            padding-top: 10px;
          }
    
          .footer {
            clear: both;
            margin-top: 10px;
            text-align: center;
            width: 100%; 
          }
            .footer td,
            .footer p,
            .footer span,
            .footer a {
              color: #999999;
              font-size: 12px;
              text-align: center; 
          }
    
          /* -------------------------------------
              TYPOGRAPHY
          ------------------------------------- */
          h1,
          h2,
          h3,
          h4 {
            color: #000000;
            font-family: sans-serif;
            font-weight: 400;
            line-height: 1.4;
            margin: 0;
            margin-bottom: 30px; 
          }
    
          h1 {
            font-size: 35px;
            font-weight: 300;
            text-align: center;
            text-transform: capitalize; 
          }
    
          p,
          ul,
          ol {
            font-family: sans-serif;
            font-size: 14px;
            font-weight: normal;
            margin: 0;
            margin-bottom: 15px; 
          }
            p li,
            ul li,
            ol li {
              list-style-position: inside;
              margin-left: 5px; 
          }
    
          a {
            color: #3498db;
            text-decoration: underline; 
          }
    
          /* -------------------------------------
              BUTTONS
          ------------------------------------- */
          .btn {
            box-sizing: border-box;
            width: 100%; }
            .btn > tbody > tr > td {
              padding-bottom: 15px; }
            .btn table {
              width: auto; 
          }
            .btn table td {
              background-color: #ffffff;
              border-radius: 5px;
              text-align: center; 
          }
            .btn a {
              background-color: #ffffff;
              border: solid 1px #3498db;
              border-radius: 5px;
              box-sizing: border-box;
              color: #3498db;
              cursor: pointer;
              display: inline-block;
              font-size: 14px;
              font-weight: bold;
              margin: 0;
              padding: 12px 25px;
              text-decoration: none;
              text-transform: capitalize; 
          }
    
          .btn-primary table td {
            background-color: #3498db; 
          }
    
          .btn-primary a {
            background-color: #3498db;
            border-color: #3498db;
            color: #ffffff; 
          }
    
          /* -------------------------------------
              OTHER STYLES THAT MIGHT BE USEFUL
          ------------------------------------- */
          .last {
            margin-bottom: 0; 
          }
    
          .first {
            margin-top: 0; 
          }
    
          .align-center {
            text-align: center; 
          }
    
          .align-right {
            text-align: right; 
          }
    
          .align-left {
            text-align: left; 
          }
    
          .clear {
            clear: both; 
          }
    
          .mt0 {
            margin-top: 0; 
          }
    
          .mb0 {
            margin-bottom: 0; 
          }
    
          .preheader {
            color: transparent;
            display: none;
            height: 0;
            max-height: 0;
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            mso-hide: all;
            visibility: hidden;
            width: 0; 
          }
    
          .powered-by a {
            text-decoration: none; 
          }
    
          hr {
            border: 0;
            border-bottom: 1px solid #f6f6f6;
            margin: 20px 0; 
          }
    
          /* -------------------------------------
              RESPONSIVE AND MOBILE FRIENDLY STYLES
          ------------------------------------- */
          @media only screen and (max-width: 620px) {
            table.body h1 {
              font-size: 28px !important;
              margin-bottom: 10px !important; 
            }
            table.body p,
            table.body ul,
            table.body ol,
            table.body td,
            table.body span,
            table.body a {
              font-size: 16px !important; 
            }
            table.body .wrapper,
            table.body .article {
              padding: 10px !important; 
            }
            table.body .content {
              padding: 0 !important; 
            }
            table.body .container {
              padding: 0 !important;
              width: 100% !important; 
            }
            table.body .main {
              border-left-width: 0 !important;
              border-radius: 0 !important;
              border-right-width: 0 !important; 
            }
            table.body .btn table {
              width: 100% !important; 
            }
            table.body .btn a {
              width: 100% !important; 
            }
            table.body .img-responsive {
              height: auto !important;
              max-width: 100% !important;
              width: auto !important; 
            }
          }
    
          /* -------------------------------------
              PRESERVE THESE STYLES IN THE HEAD
          ------------------------------------- */
          @media all {
            .ExternalClass {
              width: 100%; 
            }
            .ExternalClass,
            .ExternalClass p,
            .ExternalClass span,
            .ExternalClass font,
            .ExternalClass td,
            .ExternalClass div {
              line-height: 100%; 
            }
            .apple-link a {
              color: inherit !important;
              font-family: inherit !important;
              font-size: inherit !important;
              font-weight: inherit !important;
              line-height: inherit !important;
              text-decoration: none !important; 
            }
            #MessageViewBody a {
              color: inherit;
              text-decoration: none;
              font-size: inherit;
              font-family: inherit;
              font-weight: inherit;
              line-height: inherit;
            }
            .btn-primary table td:hover {
              background-color: #34495e !important; 
            }
            .btn-primary a:hover {
              background-color: #34495e !important;
              border-color: #34495e !important; 
            } 
          }
    
        </style>
      </head>
      <body>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
          <tr>
            <td>&nbsp;</td>
            <td class="container">
              <div class="content">
    
                <!-- START CENTERED WHITE CONTAINER -->
                <table role="presentation" class="main">
    
                  <!-- START MAIN CONTENT AREA -->
                  <tr>
                    <td class="wrapper">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="content-block powered-by align-center">
                        <img src="${logo_business}" alt="${name_business} logo" style="width:150px;height:150px;"/>
                        </td>
                    </tr>
                        <tr>
                          <td>
                            ${name_to ? `<p>Hola ${name_to},</p>` : ""}
                            <p>${body_text}</p>
                            ${
                              url_button
                                ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">
                            <tbody>
                              <tr>
                                <td align="left">
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                    <tbody>
                                      <tr>
                                        <td> <a href="${url_button}" target="_blank">${text_url_button}</a> </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>`
                                : ``
                            }
                            ${ending_text}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
    
                <!-- END MAIN CONTENT AREA -->
                </table>
                <!-- END CENTERED WHITE CONTAINER -->
    
                <!-- START FOOTER -->
                <div class="footer">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="content-block">
                        <br> Este es un correo autogenerado por el ecosistema TECOPOS. <a href="https://www.tecopos.com">Cambiar notificaciones</a>.
                      </td>
                    </tr>
                  </table>
                </div>
                <!-- END FOOTER -->
    
              </div>
            </td>
            <td>&nbsp;</td>
          </tr>
        </table>
      </body>
    </html>`;
};

interface Props {
  orderId: number;
  date: string;
  nameBusiness: string;
  imageBusiness: string;
  nameClient: string;
  products: SelledProduct[];
  totalPay: OrderReceiptTotal[];
  subTotalPrice: OrderReceiptPrice[];
  sendPrice: Price;
  phoneNumber: string;
  discount: number;
  isOwner: boolean;
  addressClient?: string;
  addressBilling?: string;
  footer?: string;
  status?: order_receipt_status;
  type: "PRE_ORDER" | "ORDER";
  isBuyer?: boolean;
}

const templateMailHTMLNotificationOrder = ({
  orderId,
  date,
  nameBusiness,
  imageBusiness,
  nameClient,
  products,
  totalPay,
  subTotalPrice,
  sendPrice,
  phoneNumber,
  addressClient,
  discount,
  isOwner,
  addressBilling,
  footer,
  status,
  type,
  isBuyer,
}: Props) => {
  console.log(isBuyer);
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet"  />
    <title>Factura de Compra</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        position: relative;
      }

      .container {
        max-width: 600px;
        margin: 20px auto;
        padding: 25px;
        border: 1px solid #ccc;
        border-radius: 10px;
        background-color: #fff;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
      }

      h2,
      h3 {
        color: #333;
      }

      table {
        width: 100%;
        margin-top: 10px;
        border-collapse: collapse;
        border-radius: 10px;
        overflow: hidden;
      }

      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }

      th {
        background-color: #e68f0c; /* Color de fondo verde */
        color: white; /* Texto en color blanco */
      }

      footer {
        margin-top: 20px;
        border-top: 1px solid #ccc;
        padding-top: 10px;
        color: #666;
        display: flex;
        gap: 10px;
        align-items: center;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      header div {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      img {
        border-radius: 10px;
      }
      .welcome {
        font-size: medium;
        color: #3d3b40;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="adorn1"></div>
      <div class="adorn2"></div>
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; border: 0;">
        <tr style="border: none;">
          <td align="right" valign="top" style="width: 50%;border: none;">
            <div>
              <h2>${type === "ORDER" ? `Factura de Compra` : "Prefactura"}</h2>
              <p>Número de Pedido: #${orderId}</p>
              <p>Fecha:${date}</p>
            </div>
          </td>
          <td align="right" valign="top" style="width: 50%;border: none;" >
            <div>
              <h1>${nameBusiness}</h1>
              <img
                width="100"
                height="100"
                loading="lazy"
                class="thumb svelte-16gv5nm"
                src=${imageBusiness}
                alt=""
              />
            </div>
          </td>
        </tr>
      </table>

      ${
        status !== "BILLED"
          ? `
      <header>
      ${
        isOwner
          ? `<p class="welcome">
        Hola,se ha registrado un nuevo pedido. Abajo los detalles:
        </p>`
          : `<p class="welcome">${
              isBuyer
                ? `Hola ${nameClient}, 
                 le agradecemos por su compra en nuestro sitio. A continuación su factura detallada:`
                : `Hola ${nameClient}. Se ha realizado una compra desde ${nameBusiness} a su dirección, a continuación los detalles:`
            }</p>`
      }
      </header>`
          : ""
      }


     ${
       status !== "BILLED"
         ? `<table>
       <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
           ${
             isBuyer
               ? `<th>Precio Unitario</th>
            <th>Subtotal</th>`
               : ""
           }
          </tr>
      </thead>
      <tbody>
        ${products
          .map((item) => {
            return `<tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              ${
                isBuyer
                  ? `<td>${truncateValue(item.priceUnitary.amount, 2)}/${
                      item.priceUnitary.codeCurrency
                    }</td>
              <td>${truncateValue(item.priceTotal.amount, 2)}/${
                      item.priceTotal.codeCurrency
                    }</td>`
                  : ""
              }
            </tr>`;
          })
          .join("")}
        </tbody>
      </table>`
         : ""
     }

     ${
       status !== "BILLED" && isBuyer
         ? `<section>
     <p>Subtotal: $${subTotalPrice
       .map((price) => `${truncateValue(price.price, 2)} ${price.codeCurrency}`)
       .join(", ")}</p>
     ${
       sendPrice
         ? `<p>Envío: $${truncateValue(sendPrice.amount, 2)} ${
             sendPrice.codeCurrency
           }</p>`
         : ""
     }
     ${
       discount
         ? `<p>Descuento: $${discount} ${sendPrice.codeCurrency}</p>`
         : ""
     }
      <p>Total: $${totalPay
        .map((pay) => `${truncateValue(pay.amount, 2)} ${pay.codeCurrency}`)
        .join(", ")}</p>
      </section>`
         : ""
     }

     <hr/>

     ${
       status !== "BILLED"
         ? `<h3>Información de Envío</h3>
      <p>Cliente: ${nameClient}</p>
      ${phoneNumber ? `<p>Teléfonos: ${phoneNumber}</p>` : ""}
      ${addressClient ? `<p>Dirección de Envío: ${addressClient}</p>` : ""}
      ${addressBilling ? `<p>Facturación: ${addressBilling}</p>` : ""}`
         : ""
     }
  
      <footer>
       ${
         isOwner && isBuyer
           ? `<p>Puede acceder a la administración del sistema a través de la siguiente dirección https://tienda.tecopos.com</p>
         <p>Gracias por usar el ecosistema Tecopos.</p>`
           : `<p>Gracias por tu compra . ¡Esperamos verte pronto!</p> `
       }
        
      </footer>
    </div>
  </body>
  <style>
    .adorn1 {
      background-color: #e68f0c;
      width: 100%;
      height: 10px;
      position: absolute;
      bottom: 0;
      right: 0;
      rotate: 0deg;
    }
    .adorn2 {
      background-color: #e68f0c;
      width: 100%;
      height: 10px;
      position: absolute;
      top: 0;
      left: 0;
      rotate: 0deg;
    }
  </style>
</html>
`;
};

interface ChangeStatusTemplateProps {
  order: OrderReceipt;
  business: Business;
  statusMessage: string;
  businessImage: string;
}

const templateMailChangeStatus = ({
  business,
  order,
  statusMessage,
  businessImage,
}: ChangeStatusTemplateProps) => {
  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" />
      <title>Estado de su compra</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          position: relative;
        }
  
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 25px;
          border: 1px solid #ccc;
          border-radius: 10px;
          background-color: #fff;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }
  
        .businessContainer {
          display: flex;
          flex-direction: row;
          column-gap: 10px;
          align-items: center;
        }
  
        .orderContainer {
          margin-top: 10px;
          padding: 5px;
        }
  
        h1 {
          font-size: 18px;
          color: #656464;
        }
  
        h5 {
          margin-top: 3px;
          margin-bottom: 3px;
        }
  
        img {
          width: 50px;
          height: 50px;
          border-radius: 25px;
        }
  
        .adorn1 {
          background-color: #e68f0c;
          width: 100%;
          height: 10px;
          position: absolute;
          bottom: 0;
          right: 0;
          rotate: 0deg;
        }
  
        .adorn2 {
          background-color: #e68f0c;
          width: 100%;
          height: 10px;
          position: absolute;
          top: 0;
          left: 0;
          rotate: 0deg;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="adorn1"></div>
        <div class="adorn2"></div>
  
        <div class="businessContainer">
          <img src="${businessImage}" alt="businessLogo" loading="lazy" />
          <h1>${business.name}</h1>
        </div>
  
        <div class="orderContainer">
          <div style="display: flex; flex-direction: row; align-items: center;">
            <h5 style="color: #656464; font-size: 16px; display: flex">
              Pedido:
            </h5>
            <h5 style="color: #656464; font-size: 16px">${
              order.operationNumber
            }</h5>
          </div>
          <div style="display: flex; flex-direction: row; align-items: center;">
            <h5 style="color: #656464; font-size: 16px; display: flex">Fecha:</h5>
            <h5 style="color: #656464; font-size: 16px">${moment(
              order.updatedAt
            ).format("DD/MM/YYYY")}</h5>
          </div>
          <div style="display: flex; flex-direction: row; align-items: center;">
            <h5 style="color: #656464; font-size: 16px; display: flex">Hora:</h5>
            <h5 style="color: #656464; font-size: 16px">${moment(
              order.updatedAt
            ).format("hh:mm:ss a")}</h5>
          </div>
        </div>
        <p style="width: 100%; margin-top:10px; text-align: center; font-weight:bold; font-size: 16px">${statusMessage}</p>
      </div>
    </body>
  </html>`;
};

interface PropsAdmin {
  operationNumber: number;
  date: string;
  nameBusiness: string;
  imageBusiness: string;
  products: SelledProduct[];
  messageHeader: string;
  sessionPrices: string;
  sendInfo: string;
  footer: string;
}
const templateMailHTMLNotificationOrderAdmin = ({
  operationNumber,
  date,
  nameBusiness,
  imageBusiness,
  products,
  messageHeader,
  sessionPrices,
  sendInfo,
  footer,
}: PropsAdmin) => {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet"  />
    <title>Factura de Compra</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        position: relative;
      }

      .container {
        max-width: 600px;
        margin: 20px auto;
        padding: 25px;
        border: 1px solid #ccc;
        border-radius: 10px;
        background-color: #fff;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
      }

      h2,
      h3 {
        color: #333;
      }

      table {
        width: 100%;
        margin-top: 10px;
        border-collapse: collapse;
        border-radius: 10px;
        overflow: hidden;
      }

      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }

      th {
        background-color: #e68f0c; /* Color de fondo verde */
        color: white; /* Texto en color blanco */
      }

      footer {
        margin-top: 20px;
        border-top: 1px solid #ccc;
        padding-top: 10px;
        color: #666;
        display: flex;
        gap: 10px;
        align-items: center;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      header div {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      img {
        border-radius: 10px;
      }
      .welcome {
        font-size: medium;
        color: #3d3b40;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="adorn1"></div>
      <div class="adorn2"></div>
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; border: 0;">
        <tr style="border: none;">
          <td align="right" valign="top" style="width: 50%;border: none;">
            <div>
              <h2>Factura de Compra</h2>
              <p>Número de Pedido: #${operationNumber}</p>
              <p>Fecha:${date}</p>
            </div>
          </td>
          <td align="right" valign="top" style="width: 50%;border: none;" >
            <div>
              <h1>${nameBusiness}</h1>
              <img
                width="100"
                height="100"
                loading="lazy"
                class="thumb svelte-16gv5nm"
                src=${imageBusiness}
                alt=""
              />
            </div>
          </td>
        </tr>
      </table>

      ${messageHeader}
     

      <table>
       <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
           <th>Precio Unitario</th>
            <th>Subtotal</th>
          </tr>
      </thead>
      <tbody>
        ${products
          .map((item) => {
            return `<tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.priceUnitary.amount}/${item.priceUnitary.codeCurrency}</td>
              <td>${item.priceTotal.amount}/${item.priceTotal.codeCurrency}</td>
            </tr>`;
          })
          .join("")}
        </tbody>
      </table>

      ${sessionPrices}
     
      ${sendInfo}
    

      <footer>
       ${footer}
      </footer>
    </div>
  </body>
  <style>
    .adorn1 {
      background-color: #e68f0c;
      width: 100%;
      height: 10px;
      position: absolute;
      bottom: 0;
      right: 0;
      rotate: 0deg;
    }
    .adorn2 {
      background-color: #e68f0c;
      width: 100%;
      height: 10px;
      position: absolute;
      top: 0;
      left: 0;
      rotate: 0deg;
    }
  </style>
</html>
`;
};

const templateMailHTMLNotificationReservation = ({
  reservationNumber,
  dateStart,
  dateEnd,
  nameBusiness,
  imageBusiness,
  products,
  messageHeader,
  reservationFor,
  hasDuration,
  footer,
}: any) => {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirmación de Reserva</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        position: relative;
      }

      .container {
        max-width: 600px;
        margin: 20px auto;
        padding: 25px;
        border: 1px solid #ccc;
        border-radius: 10px;
        background-color: #fff;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
      }

      h2,
      h3 {
        color: #333;
      }

      table {
        width: 100%;
        margin-top: 10px;
        border-collapse: collapse;
        border-radius: 10px;
        overflow: hidden;
      }

      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }

      th {
        background-color: #e68f0c;
        color: white;
      }

      footer {
        margin-top: 20px;
        border-top: 1px solid #ccc;
        padding-top: 10px;
        color: #666;
        display: flex;
        gap: 10px;
        align-items: center;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      header div {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      img {
        border-radius: 10px;
      }
      .welcome {
        font-size: medium;
        color: #3d3b40;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="adorn1"></div>
      <div class="adorn2"></div>
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; border: 0;">
        <tr style="border: none;">
          <td align="right" valign="top" style="width: 50%;border: none;">
            <div>
              <h2>Notificación de Reserva</h2>
              <p>Número de Reserva: #${reservationNumber}</p>
              <p>Fecha: ${dateStart} - ${dateEnd}</p>
            </div>
          </td>
          <td align="right" valign="top" style="width: 50%;border: none;" >
            <div>
              <h1>${nameBusiness}</h1>
              <img
                width="100"
                height="100"
                loading="lazy"
                class="thumb svelte-16gv5nm"
                src=${imageBusiness}
                alt=""
              />
            </div>
          </td>
        </tr>
      </table>

      ${messageHeader}
     
      <table>
       <thead>
          <tr>
            <th>Servicio</th>
            <th>Reservado por</th>
            <th>Precio Unitario</th>
            <th>Total</th>
          </tr>
      </thead>
      <tbody>
        ${products
          .map((item: any) => {
            return `<tr>
              <td>${item.name}</td>
              ${
                hasDuration
                  ? `<td>${reservationFor}</td>`
                  : `<td>${item.quantity === 0 ? 1 : item.quantity} día(s)</td>`
              }
              <td>${formatCurrency(
                item.priceUnitary.amount,
                item.priceUnitary.codeCurrency
              )}</td>
              <td>${formatCurrency(
                item.priceTotal.amount,
                item.priceTotal.codeCurrency
              )}</td>
            </tr>`;
          })
          .join("")}
        </tbody>
      </table>

      <footer>
       ${footer}
      </footer>
    </div>
  </body>
  <style>
    .adorn1 {
      background-color: #e68f0c;
      width: 100%;
      height: 10px;
      position: absolute;
      bottom: 0;
      right: 0;
      rotate: 0deg;
    }
    .adorn2 {
      background-color: #e68f0c;
      width: 100%;
      height: 10px;
      position: absolute;
      top: 0;
      left: 0;
      rotate: 0deg;
    }
  </style>
</html>
`;
};
