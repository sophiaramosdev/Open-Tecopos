import moment from 'moment';
import {
  BusinessInterface,
  OrderInterface,
} from '../interfaces/ServerInterfaces';
import Report from './components/Report';
import { formatCurrency } from '../utils/helpers';
import { translateOrderState } from '../utils/translate';
import { DocumentProps, PageProps, Style } from '@react-pdf/types';

interface OrderListReportProps {
  reportName: string;
  businessData: BusinessInterface;
  reportData: OrderInterface[];
  reportSettings?: {
    document?: DocumentProps;
    page?: PageProps;
  };
}

const OrderListReport = ({
  reportName,
  businessData,
  reportData,
  reportSettings,
}: OrderListReportProps) => {
  const rows: Array<any> = [];
  const valueRowStyle: Record<number, Style> = {};

  reportData.forEach((order) => {
    const orderRow: Array<string | number> = [];
    if (order.operationNumber) {
      orderRow.push(order.operationNumber + '~subtitle');
    }
    if (order.createdAt) {
      orderRow.push(
        moment(order.createdAt).format('DD [de] MMMM [de] YYYY') + '~subtitle'
      );
    }
    if (order.totalToPay) {
      orderRow.push(
        order.totalToPay
          .map((pay) => formatCurrency(pay.amount, pay.codeCurrency))
          .join('\n') + '~subtitle'
      );
    }
    if (order.status) {
      orderRow.push(translateOrderState(order.status) + '~subtitle');
    }
    if (order.paidAt) {
      orderRow.push(
        moment(order.paidAt).format('DD [de] MMMM [de] YYYY') + '~subtitle'
      );
    } else {
      orderRow.push('-~subtitle');
    }
    rows.push(orderRow);

    if (order?.selledProducts?.length) {
      valueRowStyle[rows.length - 1] = { borderBottom: 0 };

      rows.push([
        'Listado de productos~subtitle',
        'Cantidad~subtitle',
        '',
        '',
        '',
      ]);
      valueRowStyle[rows.length - 1] = { borderBottom: 0 };

      order?.selledProducts?.forEach((product, index) => {
        rows.push([
          `   - ${product.name}${
            product.variation ? ' (' + product.variation.name + ')' : ''
          }`,
          product.quantity,
          '',
          '',
          '',
        ]);
        if (index < order?.selledProducts?.length - 1)
          valueRowStyle[rows.length - 1] = { borderBottom: 0 };
      });
      ///rows.push(...productRows);
    }
  });

  const data: Array<any> = [
    `${reportName}~title`,
    'titleSeparator',
    {
      display: 'table',
      widths: [15, 15, 15, 15],
      headers: ['No', 'Fecha', 'Total', 'Estado', 'Pagado el'],
      valueRowStyle,
      values: rows,
      valuesStyles: [],
    },
  ];

  return (
    <Report
      reportName={reportName}
      reportData={data}
      headerData={businessData}
      reportSettings={reportSettings}
    />
  );
};

export default OrderListReport;
