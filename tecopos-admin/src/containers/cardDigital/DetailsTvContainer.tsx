import { useContext, useEffect, useState } from "react";
import SideNav from "../../components/misc/SideNav";
import { CartDigitalContext } from "./CartDigital";
import Fetching from "../../components/misc/Fetching";
import DetailTvInfo from "./detailsTv/DetailTvInfo";
import DetailsPages from "./detailsTv/DetailsPages";
interface DetailsProps {
  closeModal: Function;
  currentTv: number | string;
}
const DetailsTvContainer = ({ closeModal, currentTv }: DetailsProps) => {
  const [currentTab, setCurrentTab] = useState("details");
  const tabs = [
    {
      //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Detalles",
      href: "details",
      current: currentTab === "details",
    },
    {
      //icon: <DocumentMagnifyingGlassIcon className="h-6" />,
      name: "Paginas",
      href: "pages",
      current: currentTab === "pages",
    },
  ];
  //-----------------------------------------------------------
  const { getTv, selectTv, isFetching } = useContext(CartDigitalContext);
  useEffect(() => {
    getTv!(currentTv, () => {});
  }, []);

  if (isFetching || !selectTv) {
    return (
      <div className="h-96">
        <Fetching />
      </div>
    );
  }

  return (
    <>
      <div className="py-2">
        <div className="sm:grid grid-cols-10 gap-3">
          <SideNav
            tabs={tabs}
            action={setCurrentTab}
            className="col-span-10 sm:col-span-2"
          />
          <section className="sm:col-span-8 pl-3 pt-2 ">
            {currentTab === "details" && (
              <DetailTvInfo closeModal={closeModal} />
            )}
            {currentTab === "pages" && <DetailsPages />}
          </section>
        </div>
      </div>
    </>
  );
};

export default DetailsTvContainer;
