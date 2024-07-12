import { Fragment } from "react";
import DocumentPage from "../components/pdf/DocumentPage";
import TableTemplate from "../components/pdf/TableTemplate";
import { formatCurrency } from "../utils/helpers";
import DocumentHeader from "../components/pdf/DocumentHeader";
import { OrderInterface } from "../interfaces/ServerInterfaces";
import { formatDateTime } from "../utils/functions";

interface AccountsReceivableInterface {
  accounts: OrderInterface[];
  ecoCycle: string
}

const AccountsReceivablePdf = ({ accounts, ecoCycle }: AccountsReceivableInterface) => {

  const accountsWithoutClients = accounts.filter(acc => acc.client === null)

  const accountsGroupedByClient = accounts.reduce(
    (result, account) => {
      if (account.client !== null) {
        const existingClient = result.find(
          (item) => item.clientId === account.client.id
        );

        if (existingClient) {
          existingClient.accounts.push(account);
        } else {
          result.push({
            clientId: account.client.id,
            clientName: (account.client.firstName === null && account.client.lastName === null) ? account.client.email : (account.client.firstName !== null ? account.client.firstName : " ") + " " + (account.client.lastName !== null ? account.client.lastName : " "),
            accounts: [account],
          });
        }
      }

      return result;
    },
    [] as { clientId: number; clientName: string; accounts: OrderInterface[] }[]
  );

  return (
    <DocumentPage>
      <DocumentHeader text="Cuentas por cobrar" subtext={ecoCycle} />
      <>
        {accountsGroupedByClient.map((elem, idx) => {
          return (
            <Fragment key={idx}>
              <TableTemplate
                tableName={`Cliente: ${elem.clientName}`}
                data={elem.accounts.map((account) => ({
                  "Número de orden": account.id,
                  Creada: formatDateTime(account.createdAt),
                  "Cantidad de productos": account.selledProducts.length,
                  "Precio total": account.totalToPay.map((sale) =>
                    formatCurrency(sale.amount, sale.codeCurrency)
                  )
                }))}
                containTotals
              />
            </Fragment>
          );
        })}
        <Fragment key={777}>
          <TableTemplate
            tableName={"Ordenes sin clientes asociados"}
            data={accountsWithoutClients.map((account) => ({
              "Número de orden": account.id,
              Creada: formatDateTime(account.createdAt),
              "Cantidad de productos": account.selledProducts.length,
              "Precio total": account.totalToPay.map((sale) =>
                formatCurrency(sale.amount, sale.codeCurrency)
              )
            }))}
            containTotals
          />
        </Fragment>
      </>
    </DocumentPage>
  );
}

export default AccountsReceivablePdf
