import { useState } from 'react';
import query from './APIServices';
import useServer from './useServerMain';
import { GeneralAreaIncome } from '../interfaces/ServerInterfaces';

const useServerReports = () => {
  const [isFetching, setIsFetching] = useState<boolean>(false);
  // @ts-ignore
  const [financialReport, setFinancialReport] =
    useState<GeneralAreaIncome | null>(null);
  const { manageErrors } = useServer();

  const getFinancialReport = async (
    filter?: Record<string, string | number | boolean | null>
  ) => {
    setIsFetching(true);

    await query
      .post(`/report/financial/general`, filter!)
      .then((resp) => {
        //@ts-ignore
        setFinancialReport(resp.data);
      })
      .catch((e) => {
        manageErrors(e);
      });

    setIsFetching(false);
  };

  return {
    isFetching,
    financialReport,
    getFinancialReport,
  };
};

export default useServerReports;
