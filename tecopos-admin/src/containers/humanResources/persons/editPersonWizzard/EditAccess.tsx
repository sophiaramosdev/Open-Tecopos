import { PersonInterface } from "../../../../interfaces/ServerInterfaces";
import ListAccessRecord from "../../ListAccessRecord";

interface EditRecordsInterface {
    person: PersonInterface | null;
}

const EditAccess = ({ person }: EditRecordsInterface) => {
    return <ListAccessRecord id={person?.id ? person.id : null} />
};

export default EditAccess;
