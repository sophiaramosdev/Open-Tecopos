import {
  BusinessInterface,
  DispatchItemInterface,
} from '../interfaces/ServerInterfaces';
import { translateDispatchStatus, translateMeasure } from '../utils/translate';
import Report from './components/Report';
import moment from 'moment';

interface DispatchReportProps {
  reportName: string;
  businessData: BusinessInterface;
  reportData: DispatchItemInterface;
}

const DispatchReport = ({
  reportName,
  businessData,
  reportData,
}: DispatchReportProps) => {

  const dispatchInfo: any = {
    'Estado de despacho:': translateDispatchStatus(reportData.status),
    'Fecha de despacho:': moment(reportData.createdAt).format(
      'DD [de] MMMM [de] YYYY'
    ),
    'Número de pedido:': reportData.id.toString(),
  };

  // Solo agregar la fecha de entrega si el estado no es "CREATED"
  if (reportData.status !== "CREATED") {
    dispatchInfo['Fecha de entrega:'] = moment(reportData.receivedAt).format(
      'DD [de] MMMM [de] YYYY'
    );
  }

  const data = [
    `${reportName}~title`,
    'titleSeparator',
    {
      display: 'section',
      widths: [50, [30, 40]],
      subsections: [
        [
          'Origen:~subtitle',
          reportData?.stockAreaFrom?.name ?? '-',
          reportData.createdBy?.displayName || '-',
          reportData.createdBy?.email || '-',
        ],
        dispatchInfo,
      ],
    },
    'titleSeparator',
    {
      display: 'section',
      widths: [50],
      subsections: [
        [
          'Destino:~subtitle',
          reportData.stockAreaTo.name,
          reportData.receivedBy?.displayName || '',
          reportData.receivedBy?.email || '',
        ],
      ],
    },
    'sectionSeparator',
    {
      display: 'table',
      headers: ['Producto', 'Cantidad~nColumn'],
      values: reportData.products.map((product) => [
        product.name,
        // eslint-disable-next-line no-useless-concat
        `${product.quantity} ${translateMeasure(product?.measure)}` + '~nColumn',
      ]
      ),
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

export default DispatchReport;
