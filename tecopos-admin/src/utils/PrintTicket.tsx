import { Br, Cut, Line, Printer, Text, Row, render, Barcode } from 'react-thermal-printer';
import { BusinessInterface, OrderInterface, PriceInvoiceInterface } from '../interfaces/ServerInterfaces';
import moment from 'moment';
import { getFullAddress, mathOperation, printTicketPrice, truncateValue } from './helpers';
import { translatePaymetMethodsReduce } from './translate';

interface printTicketInterface {
  order: OrderInterface | undefined | null;
  business: BusinessInterface;
  rollSize: number;
}

export const PrintTicket = async ({ order, business, rollSize: paperDimension }: printTicketInterface) => {

  //Configurations
  const print_order_number =
    business?.configurationsKey.find((item: any) => item.key === "print_number_order")
      ?.value === "true";

  const print_order_hour =
    business?.configurationsKey.find(
      (item: any) => item.key === "print_hours_in_order"
    )?.value === "true";

  const ticket_print_barcode =
    business?.configurationsKey.find(
      (item: any) => item.key === "ticket_print_barcode"
    )?.value === "true";

  const ticket_business_name = business?.configurationsKey.find(
    (item: any) => item.key === "ticket_business_name"
  )?.value;

  const ticket_footer = business?.configurationsKey.find(
    (item: any) => item.key === "ticket_footer"
  )?.value;

  const ticket_print_all_data_client =
    business?.configurationsKey.find(
      (item: any) => item.key === "ticket_print_all_data_client"
    )?.value === "true";

  // const ticket_print_logo =
  //   business?.configurationsKey.find(
  //     (item: any) => item.key === "ticket_print_logo"
  //   )?.value === "true";

  //Obtaining Tax configuration
  const tax_rate = business?.configurationsKey.find(
    (item: { key: string; }) => item.key === "tax_rate"
  )?.value;

  let isClosed = order?.status === "BILLED" || order?.status === "CANCELLED";
  const format = print_order_hour ? "DD/MM/YYYY hh:mm A" : "DD/MM/YYYY";
  let now = moment().format(format);

  if (isClosed) {
    now = moment(order?.closedDate).format(format);
  }

  const defaultCurrency: any = business!.mainCurrency;

  const availableCurrencies = business?.availableCurrencies;

  //Calculating costs
  let taxes = 0;
  let subTotalMainCurrency = 0;

  let discounts: Array<{ price: number; codeCurrency: string }> = [];
  let commissions: Array<{ price: number; codeCurrency: string }> = [];
  let totalWithDiscountOrCommission: Array<{
    price: number;
    codeCurrency: string;
  }> = [];
  let totalToPay: Array<{ price: number; codeCurrency: string }> = [];

  if (order?.discount !== null) {
    order?.prices?.forEach((item) => {
      totalWithDiscountOrCommission.push({
        codeCurrency: item.codeCurrency,
        price: mathOperation(
          item.price,
          (order?.discount! / 100) * item.price,
          "subtraction",
          2
        ),
      });
      discounts.push({
        codeCurrency: item.codeCurrency,
        price: truncateValue((order?.discount! / 100) * item.price, 2),
      });
    });
  } else if (order.commission !== null) {
    order.prices?.forEach((item) => {
      totalWithDiscountOrCommission.push({
        codeCurrency: item.codeCurrency,
        price: mathOperation(
          item.price,
          (order?.commission! / 100) * item.price,
          "addition",
          2
        ),
      });
      commissions.push({
        codeCurrency: item.codeCurrency,
        price: truncateValue((order?.commission! / 100) * item.price, 2),
      });
    });
  } else {
    totalWithDiscountOrCommission = order.prices;
  }

  if (tax_rate && parseInt(tax_rate) !== 0) {
    totalWithDiscountOrCommission?.forEach((item) => {
      if (item.codeCurrency === defaultCurrency) {
        subTotalMainCurrency += item.price;
      } else {
        const found = availableCurrencies?.find(
          (currency: { code: string; }) => item.codeCurrency === currency.code
        );

        if (found) {
          subTotalMainCurrency += truncateValue(
            item.price * found.exchangeRate,
            2
          );
        }
      }
    });

    taxes = truncateValue(
      subTotalMainCurrency * (parseFloat(tax_rate) / 100),
      2
    );
  }

  //Adding taxes to Total prices
  let found = false;
  totalToPay =
    totalWithDiscountOrCommission?.map((item) => {
      if (item.codeCurrency === defaultCurrency) {
        found = true;
        return {
          ...item,
          price: item.price + taxes,
        };
      }
      return item;
    }) || [];

  if (!found && taxes !== 0) {
    totalToPay = [
      ...totalToPay,
      { price: taxes, codeCurrency: defaultCurrency },
    ];
  }

  //Addind shipping
  found = false;
  if (order?.shippingPrice) {
    totalToPay = totalToPay?.map((item) => {
      found = true;
      if (item.codeCurrency === order?.shippingPrice?.codeCurrency) {
        return {
          ...item,
          price: item.price + order?.shippingPrice.amount,
        };
      }
      return item;
    });

    if (!found) {
      totalToPay = [
        ...totalToPay,
        {
          price: order?.shippingPrice.amount,
          codeCurrency: order?.shippingPrice.codeCurrency,
        },
      ];
    }
  }

  let multiCurrency = false;
  if (totalToPay.length !== 1) {
    multiCurrency = true;
  }

  let subtotal: Array<{ amount: number; codeCurrency: string }> = []

  order?.selledProducts.forEach(prod => {
    if (subtotal.find(elem => elem.codeCurrency === (prod.priceUnitary !== null ? prod.priceUnitary?.codeCurrency : prod.priceTotal.codeCurrency))) {

      subtotal = subtotal.map(item => {
        if (item.codeCurrency === (prod.priceUnitary !== null ? prod.priceUnitary?.codeCurrency : prod.priceTotal.codeCurrency)) {
          return {
            codeCurrency: item.codeCurrency,
            amount: (prod.priceUnitary !== null ? prod.priceUnitary?.amount * prod.quantity : prod.priceTotal.amount) + item.amount
          }
        } else {
          return item
        }
      })


    } else {
      subtotal.push({
        amount: prod.priceUnitary !== null ? prod.priceUnitary?.amount * prod.quantity : prod.priceTotal.amount,
        codeCurrency: (prod.priceUnitary !== null ? prod.priceUnitary?.codeCurrency : prod.priceTotal.codeCurrency)
      })
    }
  })

  const discount: PriceInvoiceInterface[] = [];
  if (order?.couponDiscountPrice || order?.discount !== 0) {
    if (order?.couponDiscountPrice) discount.push(order?.couponDiscountPrice);
    if (order?.discount !== 0) {
      order?.prices.forEach((item) => {
        const amount = (order.discount / 100) * item.price;
        const idx = discount.findIndex(
          (elem) => elem.codeCurrency === item.codeCurrency
        );
        if (idx !== -1) {
          discount.splice(idx, 1, {
            ...discount[idx],
            amount: discount[idx].amount + amount,
          });
        } else {
          discount.push({ amount: amount, codeCurrency: item.codeCurrency });
        }
      });
    }
  }

  const comission: PriceInvoiceInterface[] = [];
  if (order?.commission! > 0) {
    order?.prices.forEach((item) => {
      const amount = (order.commission / 100) * item.price;
      const idx = comission.findIndex(
        (elem) => elem.codeCurrency === item.codeCurrency
      );
      if (idx !== -1) {
        comission.splice(idx, 1, {
          ...comission[idx],
          amount: comission[idx]?.amount + amount,
        });
      } else {
        comission.push({ amount: amount, codeCurrency: item.codeCurrency });
      }
    });
  }

  function sumarPriceInvoices(...priceInvoices: (PriceInvoiceInterface | PriceInvoiceInterface[])[]): PriceInvoiceInterface[] {
    const combined: { [key: string]: number } = {};

    // Sumar los valores de los objetos individuales
    for (const invoice of priceInvoices) {
      if (invoice !== null && invoice !== undefined) {
        if (Array.isArray(invoice)) {
          for (const item of invoice) {
            if (item && item.codeCurrency) {
              if (invoice === discount) {
                combined[item.codeCurrency] = (combined[item.codeCurrency] || 0) - item.amount;
              } else {
                combined[item.codeCurrency] = (combined[item.codeCurrency] || 0) + item.amount;
              }
            }
          }
        } else {
          if (invoice.codeCurrency) {
            combined[invoice.codeCurrency] = (combined[invoice.codeCurrency] || 0) + invoice.amount;
          }
        }
      }
    }

    // Convertir el objeto combinado en un arreglo de PriceInvoiceInterface
    const result: PriceInvoiceInterface[] = [];
    for (const codeCurrency in combined) {
      if (combined.hasOwnProperty(codeCurrency)) {
        result.push({ amount: combined[codeCurrency], codeCurrency });
      }
    }

    return result;
  }

  const width = paperDimension === 80 ? 42 : 30

  // utf8 encoding
  const receipt = (
    <Printer type="epson" width={width}>

      {/* {ticket_print_logo && (
        <Image height={5} width={5} align="left" src={business.logo?.src ? business.logo?.src : "https://my-cdn.com/image.png"} />
      )} */}

      <Text size={{ width: 2, height: 2 }}>{ticket_business_name ?? business?.name}</Text>
      <Br />
      {
        order?.houseCosted && (
          <>
            <Text bold={true}>Consumo casa</Text>
            <Br />
          </>
        )
      }

      <Row left={now} right={print_order_number && order?.operationNumber ? `#${order.operationNumber}` : ``} />
      <Row left={order?.name ?? ""} right={order?.name ?? ""} />

      <Line />

      {
        (ticket_print_all_data_client && order?.client) && (
          <>
            <Row left={`Cliente: ${order.client.firstName || order.client.email
              } ${order.client.lastName || ``}`} right={""}
            />
            {
              order.client.address && (
                <Row left={`${getFullAddress(order?.client?.address)}`} right={""}
                />
              )
            }
            {
              order?.client.phones.length > 0 && (
                <Row left={`${order.client.phones?.[0]?.number}`} right={""}
                />
              )
            }
            {
              order?.client.legalNotes && (
                <Row left={`Apuntes legales: ${order.client.legalNotes}`} right={""}
                />
              )
            }
          </>
        )
      }
      <Br />

      {
        order?.selledProducts.map(prod => (
          <Row left={`(x${prod.quantity}) ${prod.name}`} right={`${printTicketPrice(prod.priceTotal.amount) + " " + prod.priceTotal.codeCurrency}`} />
        ))
      }

      <Line />

      {
        order?.prices.map((price, indx) => (
          <Row left={`${indx === 0 ? `IMPORTE: ` : ``}`} right={` ${printTicketPrice(price.price)} ${price.codeCurrency}`} />
        ))
      }

      {
        (order?.discount !== null && order?.discount! > 0) && (
          <>
            {
              discounts.map((elem, indx) => (
                <Row left={`${indx === 0 ? `DESCUENTO:` : ``}`} right={` ${printTicketPrice(elem.price)} ${elem.codeCurrency}`} />
              ))
            }
          </>
        )
      }

      {
        (order?.commission !== null && order?.commission! > 0) && (
          <>
            {
              comission.map((elem, indx) => (
                <Row left={`${indx === 0 ? `COMISIONES: ` : ``}`} right={`${printTicketPrice(elem.amount)} ${elem.codeCurrency}`} />
              ))
            }
          </>
        )
      }

      {
        order?.shippingPrice !== null && (
          <Row left={"ENVIO:"} right={`${printTicketPrice(order?.shippingPrice.amount)} ${order?.shippingPrice.codeCurrency}`} />
        )
      }

      {
        order?.prices?.map((itm, indx) => (
          <Row left={`${indx === 0 ? `SUBTOTAL: ` : ``}`} right={`${printTicketPrice(sumarPriceInvoices(discount, comission, order?.taxes!, order?.shippingPrice!)?.find(elem => elem.codeCurrency === itm.codeCurrency) ? itm.price + sumarPriceInvoices(discount, comission, order?.taxes!, order?.shippingPrice!)?.find(elem => elem.codeCurrency === itm.codeCurrency)?.amount! : itm.price)} ${itm.codeCurrency}`} />
        ))
      }

      {
        order?.orderModifiers?.length! > 0 && (
          <>
            {
              order?.orderModifiers?.map((modifier, indx) => (
                <Row left={`${modifier.showName}`} right={`${printTicketPrice(modifier.amount)} ${modifier.codeCurrency}`} />
              ))
            }
          </>
        )
      }


      {order?.taxes && (
        <Row left={`TAX:`} right={`${printTicketPrice(order?.taxes.amount) + " " + order?.taxes.codeCurrency}`} />
      )}
      <Line />
      <Line />

      {
        order?.totalToPay.map((price, indx) => (
          <Row left={`${indx === 0 ? `TOTAL A PAGAR: ` : ``}`} right={` ${printTicketPrice(price.amount)} ${price.codeCurrency}`} />
        ))
      }

      {
        isClosed && (
          <>
            {
              order?.currenciesPayment.map((elem, indx) => (
                <Row left={`${indx === 0 ? `TOTAL PAGADO: ` : ``}`} right={` ${translatePaymetMethodsReduce(elem.paymentWay)}  ${printTicketPrice(elem.amount)} ${elem.codeCurrency}`} />
              ))
            }

            {order?.amountReturned && (
              <Row left={`CAMBIO:`} right={` ${printTicketPrice(order?.amountReturned.amount) + " " + order?.amountReturned.codeCurrency}`} />
            )}
          </>
        )
      }


      {
        order?.tipPrice !== null && (
          <Row left={`PROPINA:`} right={` ${printTicketPrice(order?.tipPrice.amount) + " " + order?.tipPrice.codeCurrency}`} />

        )
      }

      <Line />
      <Line />

      <Text size={{ width: 2, height: 2 }}>Caja</Text>
      <Br />

      {
        order?.salesBy !== null && (
          <Row left={`Nombre: ${order?.salesBy.displayName!}`} right={""} />
        )
      }
      {
        order?.areaSales !== null && (
          <Row left={`POS: ${order?.areaSales.name!}`} right={""} />
        )
      }

      <Br />

      {
        (order?.id && ticket_print_barcode) && (
          <>
            <Barcode width={3} align="left" type="UPC-A" content={order?.id.toString()!} />
            <Text align='left'>{order?.id}</Text>
          </>
        )
      }

      <Text align='left'>{(ticket_footer || business.footerTicket || "")}</Text>

      <Br />

      <Cut />
    </Printer>
  );
  const data: Uint8Array = await render(receipt);

  let port = null;


  // Verificar si el puerto ya está abierto
  // @ts-ignore
  const existingPorts = await navigator.serial.getPorts();
  if (existingPorts.length > 0) {
    port = existingPorts[0];
    // toast.warning("El puerto ya está abierto:", port);
  } else {
    // Si el puerto no está abierto, solicitarlo
    //@ts-ignore
    port = await window.navigator.serial.requestPort();
  }

  // Si tenemos un puerto válido, continuar con la escritura
  if (port) {
    if (!port.readable || !port.writable) {
      // Si el puerto no es legible o escribible, abrirlo
      await port.open({ baudRate: 9600 });
    }

    const writer = port.writable?.getWriter();
    if (writer != null) {
      await writer.write(data);
      writer.releaseLock();
    }
  }

}