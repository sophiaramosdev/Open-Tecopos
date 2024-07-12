import { useEffect, useState } from "react";

const useFilterIdForNameSelectInputWithSearch = ({ name, arrToFilter }) => {
  const [id, setId] = useState(null);
  useEffect(() => {
    name !== (null || "") &&
      setId(
        arrToFilter.find(
          (item) =>
            item.name?.toLowerCase().trim() === name?.toLowerCase().trim()
        ).id
      );
  }, [name]);
  return { id };
};

export default useFilterIdForNameSelectInputWithSearch;
