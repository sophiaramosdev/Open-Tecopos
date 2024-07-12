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

const BillFromPosReport = ({
  reportName,
  businessData,
  reportData,
}: BillReportProps) => {
  let section = {
    display: 'section',
    widths: [[25, 1]],
    subsections: [],
  };
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

  const data = [
    `${reportName}~title`,
    'titleSeparator',
    section,
    'sectionSeparator',
    {
      display: 'table',
      widths: [15, 25],
      headers: ['Producto', 'Cantidad', 'Precio'],
      values: reportData.selledProducts.map((product) => [
        [product.name, product.variation?.name].join('\n'),
        product.quantity,
        reportData.houseCosted
          ? formatCurrency(
              product.totalCost,
              businessData?.costCurrency ?? ''
            ) + '~number'
          : formatCurrency(
              (product.priceUnitary?.amount || 0) * (product.quantity || 1),
              product.priceTotal?.codeCurrency ||
                businessData.costCurrency ||
                'CUP'
            ) + '~number',
      ]),
      charges: cleanArrayData([
        [
          '',
          'Importe:~subtitle',
          reportData?.houseCosted
            ? formatCurrency(reportData?.totalCost, businessData?.costCurrency)
            : reportData?.prices
                .map((itm) => formatCurrency(itm?.price, itm?.codeCurrency))
                .join('\n'),
        ],
        !reportData?.houseCosted &&
          reportData?.discount && [
            '',
            'Descuento:~subtitle',
            reportData?.prices.map(
              (itemPrice) =>
                '- ' +
                formatCurrency(
                  reportData?.discount !== null && reportData?.taxes !== null
                    ? itemPrice.price * (reportData?.discount / 100) +
                        reportData?.taxes.amount
                    : itemPrice.price * (reportData?.discount / 100),
                  itemPrice?.codeCurrency
                ) +
                ' (' +
                reportData?.discount +
                '%)'
            ),
          ],
        reportData.taxes?.amount > 0 && [
          '',
          'Taxes:~subtitle',
          formatCurrency(
            reportData.taxes?.amount,
            reportData.taxes?.codeCurrency
          ),
        ],
        !reportData?.houseCosted &&
          reportData?.discount !== 100 && [
            '',
            'Subtotal:~subtitle',
            reportData?.prices
              .map((itemPrice) =>
                formatCurrency(
                  reportData?.discount !== null && reportData?.taxes !== null
                    ? itemPrice.price -
                        itemPrice.price * (reportData?.discount / 100) +
                        reportData?.taxes.amount
                    : itemPrice.price -
                        itemPrice.price * (reportData?.discount / 100),
                  itemPrice?.codeCurrency
                )
              )
              .join('\n'),
          ],
        reportData.shippingPrice && [
          '',
          'Envíos:~subtitle',
          formatCurrency(
            reportData.shippingPrice?.amount,
            reportData.shippingPrice?.codeCurrency
          ),
        ],
        reportData.tipPrice && [
          '',
          'Propinas:~subtitle',
          formatCurrency(
            reportData.tipPrice?.amount,
            reportData.tipPrice?.codeCurrency
          ),
        ],
        reportData?.currenciesPayment?.length && [
          '',
          'Total pagado:~subtitle',
          reportData?.currenciesPayment.map((item) =>
            formatCurrency(item?.amount, item?.codeCurrency)
          ),
        ],
        reportData?.amountReturned && [
          '',
          'Cambio:~subtitle',
          formatCurrency(
            reportData?.amountReturned?.amount,
            reportData?.amountReturned?.codeCurrency
          ),
        ],
      ]),
    },
  ];

  return (
    <Report
      reportName={reportName}
      reportData={data}
      headerData={businessData}
    />
  );
};
export default BillFromPosReport;
