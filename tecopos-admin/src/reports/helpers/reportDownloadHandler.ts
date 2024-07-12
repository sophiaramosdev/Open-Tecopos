import Reports from '../index';
import { pdf } from '@react-pdf/renderer';
import { DocumentProps, PageProps } from '@react-pdf/types';
import { createElement } from 'react';
import { BusinessInterface } from '../../interfaces/ServerInterfaces';
import { toast } from 'react-toastify';

const reportDownloadHandler = (
  reportName: string,
  reportCode: string,
  businessData: BusinessInterface,
  reportData: any,
  reportSettings?: {
    document?: DocumentProps;
    page?: PageProps;
  }
) => {
  const toastId = toast.info('Creando Reporte...', {
    isLoading: true,
    autoClose: false,
  });
  try {
    const Report = Reports[reportCode as keyof typeof Reports];
    pdf(
      // @ts-ignore
      createElement(Report, {
        reportName,
        businessData,
        reportData,
        reportSettings,
      })
    )
      .toBlob()
      .then((blob) => {
        const fileURL: any = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileURL;
        a.download = `${reportName}.pdf`;
        a.onclick = () =>
          toast.update(toastId, {
            isLoading: false,
            autoClose: 5000,
            render: 'Reporte listo para descargar',
          });
        a.click();
      })
      .catch((error) => {
        toast.update(toastId, {
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          render: 'Ocurrió un error creando el Reporte',
        });
        console.error(error);
      });
  } catch (error) {
    toast.update(toastId, {
      type: 'error',
      isLoading: false,
      autoClose: 5000,
      render: 'Ocurrió un error creando el Reporte',
    });
    console.error(error);
  }
};

export default reportDownloadHandler;
