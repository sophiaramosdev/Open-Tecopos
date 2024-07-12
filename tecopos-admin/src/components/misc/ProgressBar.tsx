import { getPercent } from "../../utils/helpers";

interface Progress {
  total: number;
  part: number;
}

const ProgressBar = ({ part, total }: Progress) => {
  const percent = getPercent(part, total);
  return (
    <div className="relative w-4/5 mb-5">
      <div className="absolute h-6 w-full bg-gray-400 rounded-full overflow-hidden">
        <div
          style={{ width: `${percent}%` }}
          className={`h-full rounded-full ${
            percent <= 50 ? "bg-red-500" : "bg-green-500"
          }`}
        ></div>
      </div>
      <span className="absolute mt-0.5 text-center left-0 text-white w-full z-10">{percent}%</span>
    </div>
  );
};

export default ProgressBar;
