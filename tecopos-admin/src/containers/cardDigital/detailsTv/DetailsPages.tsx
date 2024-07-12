import { useContext, useState } from "react";
import { CartDigitalContext } from "../CartDigital";
import MultipleActBtn from "../../../components/misc/MultipleActBtn";
import { TvIcon } from "@heroicons/react/24/outline";
import Modal from "../../../components/misc/GenericModal";
import NewPageTv from "../newPageSteps/NewPageTv";
import { Page } from "../../../interfaces/Interfaces";
import { VerticalDetail } from "../template/detail/VerticalDetail";

export default function DetailsPages() {
  const { selectTv } = useContext(CartDigitalContext);

  const pages = [...(selectTv?.pages || [])];
  const [showAddPage, setShowAddPage] = useState(false);
  const [showEditPage, setShowEditPage] = useState<Page | undefined>();

  const actions = [];

  actions.push({
    title: "Agregar nueva pagina",
    icon: <TvIcon className="h-5 text-gray-500" />,
    action: () => setShowAddPage(true),
  });

  const actionSelect = (id: number | string) => {
    const currentPage = pages.find((item) => item.id === id);
    setShowEditPage(currentPage);
  };

  return (
    <section className="w-full px-4 h-[500px] overflow-hidden scrollbar-thin scroll-auto flex flex-col gap-y-3 relative">
      <header className="flex justify-end fixed z-50 top-12 right-10">
        <MultipleActBtn btnName="Acciones" items={actions} />
      </header>
      <section className="grid grid-cols-2 gap-3  mt-8">
        {pages.map((item) => {
          return (
            <article
              className=" cursor-pointer"
              onClick={() => actionSelect(item.id)}
            >
              <VerticalDetail page={item} />
            </article>
          );
        })}
      </section>

      {showAddPage && (
        <Modal state={showAddPage} close={setShowAddPage} size="xl">
          <NewPageTv />
        </Modal>
      )}
      {showEditPage && (
        <Modal state={!!showEditPage} close={setShowEditPage} size="xl">
          <NewPageTv defaultPage={showEditPage} />
        </Modal>
      )}
    </section>
  );
}
