import { PersonInterface } from "../../../../interfaces/ServerInterfaces";
import ListOfRecords from "../../ListOfRecords";



interface EditRecordsInterface {
    person: PersonInterface | null;
}

const EditRecords = ({ person }: EditRecordsInterface) => {
    return <ListOfRecords id={person?.id ? person.id : null} />
}

export default EditRecords
