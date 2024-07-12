import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const MyIsChecked = ({ isChecked }) => {
  return (
    <FontAwesomeIcon
      className={`${isChecked ? "text-primary" : "text-gray-300"} text-xl`}
      icon={faCheckCircle}
    />
  );
};

export default MyIsChecked;
