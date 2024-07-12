import { useContext } from "react";
import { DispatchContext } from "../HistoricalDetails";
import { SubmitHandler, useForm } from "react-hook-form";
import Input from "../../../../../components/forms/Input";
import TextArea from "../../../../../components/forms/TextArea";
import Button from "../../../../../components/misc/Button";
import CurrencyAmountInput from "../../../../../components/forms/CurrencyAmountInput";
import Toggle from "../../../../../components/forms/Toggle";
import useServerUsers from "../../../../../api/useServerUsers";
import { printPriceWithCommasAndPeriods } from "../../../../../utils/functions";

const EditSalaryReport = ({
  salaryReportId,
  closeModal,
}: {
  salaryReportId: number;
  closeModal: Function;
}) => {
  const { HistoricalDetailsData, setHistoricalDetailsData } =
    useContext(DispatchContext);

  const { EditSalaryReportPerson, isFetching } = useServerUsers();

  const salaryReport = HistoricalDetailsData?.salaryReportPersons.find(
    (salaryReport) => salaryReport.id === salaryReportId
  );

  const { handleSubmit, control, watch } = useForm();

  const onSubmit: SubmitHandler<Record<string, any>> = (data) => {
    //Update

    const {
      baseAmount,
      specialHours,
      plusAmount,
      tips,
      otherPays,
      accordance,
      isPaid,
      observations,
    } = data;

    const updatedHistoricalDetailData = {
      ...HistoricalDetailsData,
      salaryReportPersons: HistoricalDetailsData?.salaryReportPersons.map(
        (salaryReportPerson) => {
          if (salaryReportPerson.id === salaryReportId) {
            return {
              ...salaryReportPerson,
              baseAmount:
                baseAmount.amount !== undefined
                  ? baseAmount.amount
                  : baseAmount,
              specialHours:
                specialHours.amount !== undefined
                  ? specialHours.amount
                  : specialHours,
              plusAmount:
                plusAmount.amount !== undefined
                  ? plusAmount.amount
                  : plusAmount,
              tips: tips?.amount !== undefined ? tips.amount : tips,
              otherPays:
                otherPays.amount !== undefined ? otherPays.amount : otherPays,
              accordance,
              isPaid,
              observations,
              totalToPay:
                (baseAmount.amount !== undefined
                  ? baseAmount.amount
                  : baseAmount) +
                (specialHours.amount !== undefined
                  ? specialHours.amount
                  : specialHours) +
                (plusAmount.amount !== undefined
                  ? plusAmount.amount
                  : plusAmount) +
                (tips?.amount !== undefined ? tips.amount : tips) +
                (otherPays.amount !== undefined ? otherPays.amount : otherPays),
            };
          }
          return salaryReportPerson;
        }
      ),
    };

    EditSalaryReportPerson(
      salaryReportId,
      {
        baseAmount:
          baseAmount.amount !== undefined ? baseAmount.amount : baseAmount,
        specialHours:
          specialHours.amount !== undefined
            ? specialHours.amount
            : specialHours,
        plusAmount:
          plusAmount.amount !== undefined ? plusAmount.amount : plusAmount,
        tips: tips?.amount !== undefined ? tips.amount : tips,
        otherPays:
          otherPays.amount !== undefined ? otherPays.amount : otherPays,
        accordance,
        isPaid,
        observations,
      },
      () => {
        setHistoricalDetailsData(updatedHistoricalDetailData);
        closeModal();
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="h-50 border border-slate-300 rounded p-2 overflow-y-visible">
        <div className="flex w-full justify-between items-center">
          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
            <CurrencyAmountInput
              label="Salario base"
              currencies={[HistoricalDetailsData?.codeCurrency!]}
              name="baseAmount"
              control={control}
              placeholder="$0.00"
              byDefault={{
                amount: Number(salaryReport?.baseAmount!.toFixed(2)),
                codeCurrency: salaryReport?.codeCurrency,
              }}
            />
          </div>

          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
            <CurrencyAmountInput
              label="Horas especiales"
              currencies={[HistoricalDetailsData?.codeCurrency!]}
              name="specialHours"
              control={control}
              placeholder="$0.00"
              byDefault={{
                amount: Number(salaryReport?.specialHours!.toFixed(2)),
                codeCurrency: salaryReport?.codeCurrency,
              }}
            />
          </div>
        </div>

        <div className="flex w-full justify-between items-center">
          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
            <CurrencyAmountInput
              label="Extras"
              currencies={[HistoricalDetailsData?.codeCurrency!]}
              name="plusAmount"
              control={control}
              placeholder="$0.00"
              byDefault={{
                amount: Number(salaryReport?.plusAmount!.toFixed(2)),
                codeCurrency: salaryReport?.codeCurrency,
              }}
            />
          </div>

          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
            <CurrencyAmountInput
              label="Propinas"
              currencies={[HistoricalDetailsData?.codeCurrency!]}
              name="tips"
              control={control}
              placeholder="$0.00"
              byDefault={{
                amount: Number(salaryReport?.tips!.toFixed(2)),
                codeCurrency: salaryReport?.codeCurrency,
              }}
            />
          </div>
        </div>

        <div className="flex w-full justify-between items-center">
          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
            <CurrencyAmountInput
              label="Otros pagos"
              currencies={[HistoricalDetailsData?.codeCurrency!]}
              name="otherPays"
              control={control}
              placeholder="$0.00"
              byDefault={{
                amount: Number(salaryReport?.otherPays!.toFixed(2)),
                codeCurrency: "CUP",
              }}
            />
          </div>

          <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5 mb-2">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Total a pagar{" "}
              </p>
              {/* <p><span>{Math.round(salaryReport?.baseAmount! + salaryReport?.specialHours! + salaryReport?.plusAmount! + salaryReport?.tips! + salaryReport?.otherPays!)}</span> {HistoricalDetailsData?.codeCurrency}</p> */}
              <p>
                {printPriceWithCommasAndPeriods(
                  Math.round(
                    (watch("baseAmount") === undefined
                      ? salaryReport?.baseAmount!
                      : watch("baseAmount").amount === undefined
                      ? watch("baseAmount")
                      : watch("baseAmount").amount!) +
                      (watch("specialHours") === undefined
                        ? salaryReport?.specialHours!
                        : watch("specialHours").amount === undefined
                        ? watch("specialHours")
                        : watch("specialHours").amount!) +
                      (watch("plusAmount") === undefined
                        ? salaryReport?.plusAmount!
                        : watch("plusAmount").amount === undefined
                        ? watch("plusAmount")
                        : watch("plusAmount").amount!) +
                      (watch("tips") === undefined
                        ? salaryReport?.tips!
                        : watch("tips").amount === undefined
                        ? watch("tips")
                        : watch("tips").amount!) +
                      (watch("otherPays") === undefined
                        ? salaryReport?.otherPays!
                        : watch("otherPays").amount === undefined
                        ? watch("otherPays")
                        : watch("otherPays").amount!)
                  )
                )}
                <span> {HistoricalDetailsData?.codeCurrency}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
          <Input
            defaultValue={salaryReport?.accordance}
            label="Conformidad"
            control={control}
            type="number"
            name="accordance"
          />
        </div>

        <Toggle
          title="Pagado"
          name="isPaid"
          control={control}
          defaultValue={salaryReport?.isPaid}
        />

        <div className="w-full p-1 rounded-md  overflow-y-auto scrollbar-thin col-span-5">
          <TextArea
            defaultValue={salaryReport?.observations! ?? ""}
            label="Observaciones"
            name="observations"
            control={control}
          />
        </div>
        <div className="px-4 py-3 bg-slate-50 text-right sm:px-6 flex justify-end items-center">
          <Button
            color="slate-600"
            type="submit"
            name="Aceptar"
            loading={isFetching}
          />
        </div>
      </div>
    </form>
  );
};

export default EditSalaryReport;
