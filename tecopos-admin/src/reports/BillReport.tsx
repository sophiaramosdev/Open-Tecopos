import {
  BusinessInterface,
  OrderInterface,
} from '../interfaces/ServerInterfaces';
import Report from './components/Report';
import { formatCurrency } from '../utils/helpers';
import moment from 'moment/moment';
import { cleanArrayData, cleanObjectData } from './helpers/commons';

interface BillReportProps {
  reportName: string;
  businessData: BusinessInterface;
  reportData: OrderInterface;
}

const BillReport = ({
  reportName,
  businessData,
  reportData,
}: BillReportProps) => {
  const subTotal = reportData.selledProducts.reduce((subTotal, product) => {
    return subTotal + (product && product?.priceTotal?.amount);
  }, 0);

  let text;
  const billingSubsection = [];
  const shippingSubsection = [];
  

  if(reportData?.billing){
    text = cleanArrayData([
      reportData?.billing?.firstName ?? '',
      reportData?.billing?.lastName ?? '',
    ]).join(' ');
    text && billingSubsection.push(text);
    text = cleanArrayData([
      reportData?.billing?.street_1,
      reportData?.billing?.street_2,
    ]).join(', ');
    text && billingSubsection?.push(text);
    text = cleanArrayData([
      reportData?.billing?.city ?? '',
      reportData?.billing?.postalCode ?? '',
    ]).join(', ');
    text && billingSubsection?.push(text);
    text = reportData?.billing?.municipality?.name;
    text && billingSubsection?.push(text);
    text = reportData?.billing?.province?.name;
    text && billingSubsection?.push(text);
    text = reportData?.billing?.country?.name;
    text && billingSubsection?.push(text);
    text = reportData?.billing?.email;
    text && billingSubsection?.push(text);
    text = reportData?.billing.phone;
    text && billingSubsection?.push(text);
  
  }

  shippingSubsection?.push('Enviar a:~subtitle');
  // @ts-ignore
  if (reportData?.pickUpInStore) {
    shippingSubsection?.push('Entregar en la Tienda');
  } else if( reportData?.shipping ) {
    text = cleanArrayData([
      reportData?.shipping?.firstName ?? '',
      reportData?.shipping?.lastName ?? '',
    ])?.join(' ');
    text && shippingSubsection?.push(text);
    text = cleanArrayData([
      reportData?.shipping?.street_1 ?? '',
      reportData?.shipping?.street_2 ?? '',
    ])?.join(', ');
    text && shippingSubsection.push(text);
    text = cleanArrayData([
      reportData?.shipping?.city ?? '',
      reportData?.shipping?.postalCode ?? '',
    ])?.join(', ');
    text && shippingSubsection?.push(text);
    text = reportData?.shipping?.municipality?.name;
    text && shippingSubsection.push(text);
    text = reportData?.shipping?.province?.name;
    text && shippingSubsection?.push(text);
    text = reportData?.shipping?.country?.name;
    text && shippingSubsection.push(text);
    text = reportData?.shipping?.email;
    text && shippingSubsection?.push(text);
    text = reportData?.shipping?.phone;
    text && shippingSubsection?.push(text);
  }

  let section: {
    display: string;
    widths: Array<number | Array<number>>;
    subsections: Array<any>;
  } = {
    display: 'section',
    widths: [],
    subsections: [],
  };
  if (billingSubsection.length) {
    // @ts-ignore
    section?.subsections?.push(cleanArrayData(billingSubsection));
    // @ts-ignore
    section?.widths?.push(80);
  }
  if (shippingSubsection.length) {
    // @ts-ignore
    section?.subsections?.push(cleanArrayData(shippingSubsection));
    // @ts-ignore
    section?.widths?.push(80);
  }
  // @ts-ignore
  let details = cleanObjectData({
    'Número de pedido:': reportData.operationNumber.toString(),
    'Fecha de pedido:': moment(reportData.createdAt).format(
      'DD [de] MMMM [de] YYYY'
    ),
    'Fecha de pago:':
      //@ts-ignore
      reportData.paidAt &&
      //@ts-ignore
      moment(reportData.paidAt).format('DD [de] MMMM [de] YYYY'),
    'Método de pago:': reportData.paymentGateway?.name,
  });
  // @ts-ignore
  section.subsections.push(details);
  section.widths.push([100, 1]);

  let observationsSection;
  //@ts-ignore
  if (reportData?.invoiceObservations) {
    observationsSection = {
      display: 'section',
      subsections: [
        //@ts-ignore
        ['Observaciones:~subtitle', reportData?.invoiceObservations],
      ],
    };
  }



  let couponsSection;
  if (reportData.coupons.length) {
    couponsSection = {
      display: 'section',
      widths: [[10, 1]],
      subsections: [
        {
          'Cupones:~subtitle': reportData.coupons
            //@ts-ignore
            .map((coupon) => coupon.code)
            .join(', '),
        },
      ],
    };
  }

  const data = [
    `${reportName}~title`,
    'titleSeparator',
    section,
    'sectionSeparator',
    {
      display: 'table',
      widths: [15, 15, 15],
      headers: [
        'Producto',
        'Cantidad',
        'Precio unitario~number',
        'Precio total~number',
      ],
      values: reportData?.selledProducts?.map((product) => [
        [product?.name, product?.variation?.name].join('\n'),
        product?.quantity,
        formatCurrency(
          product?.priceUnitary?.amount,
          product?.priceUnitary?.codeCurrency
        ) + '~number',
        formatCurrency(
          product?.priceTotal?.amount,
          product?.priceTotal?.codeCurrency
        ) + '~number',
      ]),
      charges: cleanArrayData([
        [
          '',
          '',
          'Subtotal~subtitle',
          formatCurrency(
            subTotal,
            reportData.selledProducts[0]?.priceTotal.codeCurrency
          ),
        ],
        reportData.shippingPrice?.amount > 0 && [
          '',
          '',
          'Costo de envío~subtitle',
          formatCurrency(
            reportData.shippingPrice?.amount,
            reportData.shippingPrice?.codeCurrency
          ),
        ],
        reportData.taxes?.amount > 0 && [
          '',
          '',
          'Impuestos~subtitle',
          formatCurrency(
            reportData.taxes?.amount,
            reportData.taxes?.codeCurrency
          ),
        ],
        [
          '',
          '',
          'Total~subtitle',
          formatCurrency(
            subTotal +
              (reportData.shippingPrice?.amount || 0) +
              (reportData.taxes?.amount || 0),
            reportData.shippingPrice?.codeCurrency
          ),
        ],
      ]),
    },
    'sectionSeparator',
    couponsSection,
    'sectionSeparator',
    observationsSection,
    'sectionSeparator',
    shippingSubsection,
    'sectionSeparator',
    billingSubsection,
  ];

  return (
    <Report
      reportName={reportName}
      reportData={data}
      headerData={businessData}
    />
  );
};
export default BillReport;
