import { useContext, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "../../../store/hooks";
import {
  BankAccountOperationInterfaces,
} from "../../../interfaces/ServerInterfaces";
import {
  formatAddressAccount,
  formatCurrency,
} from "../../../utils/helpers";

import moment from "moment";
import Modal from "../../../components/modals/GenericModal";
import AlertContainer from "../../../components/misc/AlertContainer";
import { TrashIcon } from "@heroicons/react/24/outline";
import TextArea from "../../../components/forms/TextArea";
import Button from "../../../components/misc/Button";
import { DetailAccountContext } from "../bankAccounts/MainBankAccount";
import { useParams } from "react-router-dom";
import AsyncComboBox from "../../../components/forms/AsyncCombobox";
import DateInput from "../../../components/forms/DateInput";
import CurrencyAmountInput from "../../../components/forms/CurrencyAmountInput";

interface FormAccountOperation {
  accountOperation: BankAccountOperationInterfaces;
  closeModal: Function;
}

const DetailOperationModal = ({
  closeModal,
  accountOperation,
}: FormAccountOperation) => {
  const { business, user } = useAppSelector((state) => state.init);
  const moduleAccount = business?.configurationsKey.find(
    (item) => item.key === "module_accounts"
  )?.value;
  const enableEditionOperationAccount = business?.configurationsKey.find( item => item.key === 'enable_edition_operation_accounts')?.value

  const { bankAccount,updateBankAccountOperation, deleteBankAccountOperation, isFetching } =
    useContext(DetailAccountContext);
  const { bankAccountId } = useParams();
  const { handleSubmit, control, formState } = useForm();
  const { isSubmitting } = formState

  const onSubmit: SubmitHandler<string | any > = async ( data ) => {

    let updateData = {}

    if(data.amount && data.registerAt ){
      updateData = {
        "description" : data.description,
        "accountTagId": data.accountTagId,
        "amount": data.amount.amount,
        "registerAt": data.registerAt,
        "codeCurrency": data.amount.codeCurrency
      }
    }else {
      updateData = {
        "description" : data.description,
        "accountTagId": data.accountTagId,
    }
  };

    await updateBankAccountOperation!(accountOperation.id, updateData, closeModal);
  }

  const [deleteModal, setdeleteModal] = useState(false); //Modal de eliminar operacion de Cuenta bancaria

  const diffDay = moment(new Date()).diff(accountOperation.createdAt, "d");
  const description =
    accountOperation?.accountTag?.name.length === undefined
      ? formatAddressAccount(accountOperation?.description ?? "---", "-")
      : accountOperation?.description ?? "---";
  
  const currenciesSelector: string[] =
      business?.availableCurrencies
        .filter((item) =>
          !bankAccount?.allowMultiCurrency
            ? item.code === bankAccount?.definedCurrency
            : true
        )
        .map((elem) => elem.code) ?? [];
  //--------------------------------------------------------------------------------------------
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        {diffDay === 0 && !accountOperation?.blocked && (
          <div className="px-4 py-3 text-right sm:px-6">
            <Button
              action={() => setdeleteModal(true)}
              color="red-500"
              outline
              icon={<TrashIcon className="h-5 text-red-500" />}
            />
          </div>
        )}
        <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
          <div className="px-5 py-2 sm:px-6">
            <h3 className="text-base font-semibold leading-7 text-gray-900">
              Información de la Operación
            </h3>
          </div>
          <div className=" border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="flex text-sm font-medium text-gray-900 items-center">Concepto</dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {moduleAccount === "true" &&
                    user?.roles.find((item) =>
                      ["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"].includes(
                        item.code
                      )
                    ) ? (
                    <div>
                      <AsyncComboBox
                        name="accountTagId"
                        dataQuery={{
                          url: `/administration/bank/tag/${bankAccountId}`,
                          defaultParams: { page: 1 },
                        }}
                        normalizeData={{ id: "id", name: "name" }}
                        control={control}
                        defaultItem={
                          accountOperation.accountTag
                            ? {
                              id: accountOperation.accountTag.id,
                              name: accountOperation.accountTag.name,
                            }
                            : undefined
                        }
                      />
                    </div>
                  ) : (
                    accountOperation?.accountTag?.name ?? "---"
                  )}
                </dd>
              </div>

              {/* Monto */}
              <div className="px-4 items-center py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-900">Monto</dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {
                    enableEditionOperationAccount === 'true' ?
                    (<CurrencyAmountInput
                      name="amount"
                      defaultValue={accountOperation?.amount?.amount}
                      control={control}
                      defaultCurrency={accountOperation?.amount?.codeCurrency}
                      currencies={currenciesSelector}
                    />) : (
                      <p>
                        {
                          formatCurrency(
                            accountOperation?.amount?.amount ?? 0,
                            accountOperation?.amount?.codeCurrency
                          )
                        }
                      </p>
                    )

                  }
                </dd>
              </div>

              {/* Creado Por */}
              <div className="px-4 items-center py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <p className="text-sm font-medium text-gray-900">
                  Creado por
                </p>
                <div className="flex gap-4 items-center sm:col-span-2">
                  <p className="mt-1 text-sm leading-6 text-gray-700 sm:mt-0">
                    {accountOperation?.madeBy?.displayName ?? "---"}, <span>el</span>{" "}
                  </p>
                    {
                      enableEditionOperationAccount === 'true'
                        ? (
                          <DateInput
                            label=""
                            name="registerAt"
                            includeTime
                            minutesInterval={1}
                            defaultValue={accountOperation?.registeredAt}
                            control={control}
                          />
                        ) :
                        (
                          <p className="mt-1 text-sm leading-6 text-gray-700 sm:mt-0"> 
                            {moment(accountOperation?.registeredAt).format("DD/MM/YYYY hh:mm A")}
                          </p>
                        )}
                </div>
              </div>

              {/* Description */}
              <div className="px-4 items-center py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-900">
                  Descripción
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {moduleAccount === "true" &&
                    user?.roles.find((item) =>
                      ["GROUP_OWNER", "OWNER", "MANAGER_CONTABILITY"].includes(
                        item.code
                      )
                    ) ? (
                    <div className="-mt-5">
                      <TextArea
                        label=""
                        name="description"
                        control={control}
                        defaultValue={description}
                      />
                    </div>
                  ) : (
                    description
                  )}
                </dd>
              </div>

            </dl>
          </div>
        </div>
        <div className="px-4 py-3 mt-3 bg-slate-50 text-right sm:px-6">
          <Button
            color="slate-600"
            type="submit"
            name="Actualizar"
            loading={isFetching && isSubmitting}
            disabled={isFetching}
          />
        </div>
      </form>

      {deleteModal && (
        <Modal close={setdeleteModal} state={deleteModal} >
          <AlertContainer
            title={`¡Eliminar Operación!`}
            onAction={() => deleteBankAccountOperation!(accountOperation.id, closeModal)}
            onCancel={() => setdeleteModal(false)}
            text={`¿Seguro que desea eliminar esta operación?`}
            loading={isFetching}
          />
        </Modal>
      )}
    </>
  );
};

export default DetailOperationModal;
