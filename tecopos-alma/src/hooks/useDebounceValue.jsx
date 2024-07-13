import { useState, useEffect } from "react";

export const useDebouncedValue = (input, time = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(input);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(input);
    }, time);

    return () => {
      clearTimeout(handler);
    };
  }, [input, time]);

  return debouncedValue;
};
export default useDebouncedValue;
