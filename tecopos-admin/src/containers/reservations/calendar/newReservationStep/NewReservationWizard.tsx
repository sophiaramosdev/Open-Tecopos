import { useContext, useState } from "react";
import SelectTypeReservation from "./SelectTypeReservation";
import NewReservation from "./NewReservation";
import BlockTimeFrom from "./blcokTime/BlockTimeFrom";

interface Prop {
  editMode?: boolean;
  defaultValues?: any;
  close?: () => void;
  newReservation?: Function;
  context: React.Context<any>;
}

export const NewReservationWizard = ({
  close = () => {},
  newReservation = () => {},
  context
}: Prop) => {
  const [type, setType] = useState<string | null>(null);

  return (
    <>
      {!type && <SelectTypeReservation setType={setType} />}
      {type === "reservation" && (
        <>
          <NewReservation close={close} newReservation={newReservation} context={context} />
        </>
      )}
      {type === "block" && <BlockTimeFrom close={close} />}
    </>
  );
};
