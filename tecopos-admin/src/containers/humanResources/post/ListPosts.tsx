import { useState } from "react";
import Breadcrumb, {
  PathInterface,
} from "../../../components/navigation/Breadcrumb";
import GenericTable, {
  DataTableInterface,
} from "../../../components/misc/GenericTable";
import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Modal from "../../../components/misc/GenericModal";
import PostForm from "./PostForm";
import { PostInterface } from "../../../interfaces/ServerInterfaces";
import { useAppSelector } from "../../../store/hooks";

const ListPosts = () => {
  const {personPosts} = useAppSelector(state=>state.nomenclator)
  const [newPost, setNewPost] = useState(false);
  const [currentPost, setCurrentPost] = useState<PostInterface | null>(
    null
  );

  //Breadcrumb-----------------------------------------------------------------------------------
  const paths: PathInterface[] = [
    {
      name: "Capital humano",
    },
    {
      name: "Cargos",
    },
  ];
  //------------------------------------------------------------------------------------------

  //Data to dislay in table ---------------------------------------------------------------------------
  const tableTitle = ["Nombre", "Código"];
  const tableData: DataTableInterface[] = [];
  personPosts.forEach((post) =>
    tableData.push({
      rowId: post.id,
      payload: {
        Nombre: post?.name,
        Código: post.code,
      },
    })
  );


  const actions = [
    {
      icon: <PlusIcon className="h-5" />,
      title: "Nuevo cargo",
      action: () => setNewPost(true),
    },
  ];

  const rowAction = (id: number) => {
    const current = personPosts.find((cat) => cat.id === id);
    setCurrentPost(current!);
  };

  //----------------------------------------------------------------------------------------------------
  return (
    <div>
      <Breadcrumb
        icon={<UserGroupIcon className="h-6 text-gray-500" />}
        paths={paths}
      />
      <GenericTable
        tableData={tableData}
        tableTitles={tableTitle}
        actions={actions}
        rowAction={rowAction}
      />

      {newPost && (
        <Modal state={newPost} close={setNewPost} size="m">
          <PostForm
            closeModal={() => setNewPost(false)}
          />
        </Modal>
      )}
      {!!currentPost && (
        <Modal state={!!currentPost} close={()=>setCurrentPost(null)} size="m">
          <PostForm
            post={currentPost}
            closeModal={() => setCurrentPost(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default ListPosts;
