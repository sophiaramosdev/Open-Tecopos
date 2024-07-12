/* eslint-disable react-hooks/exhaustive-deps */
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useNavigate } from "react-router-dom";
import { changeBusiness } from "../../store/actions/globals";
import ImageComponent from "../misc/Images/Image";
import SearchComponent from "../misc/SearchComponent";
import useServerBusiness from "../../api/useServerBusiness";
import { useEffect, useState } from "react";
import SpinnerLoading from "../misc/SpinnerLoading";

interface BranchList {
  closeModal: Function;
}

export default function BranchesList({ closeModal }: BranchList) {
  const { business, branches, user } = useAppSelector((state) => state.init);
  const dispatch = useAppDispatch();
  const index = branches.findIndex((item) => item.isMain);
  const redirect = useNavigate();
  const { getAllBusiness, allBusiness, isLoading } = useServerBusiness();
  const [filter, setFilter] = useState<Record<string, string>>({});
  const changeBranch = (id: number | null) => {
    dispatch(changeBusiness(id));
    redirect("/");
    closeModal();
  };

  useEffect(() => {
    if (Object.keys(filter).length !== 0) {
      getAllBusiness(filter);
    }
  }, [filter]);
  return (
    <div className="h-[28rem]">
      <div className="border-b-2 border-gray-200 bg-white pb-4 cursor-pointer">
        <div className="-ml-4 -mt-4 flex items-center">
          <div className="flex flex-grow ml-4 mt-4 justify-between items-center">
            <div
              className="flex items-center"
              onClick={() => changeBranch(branches[index]?.id ?? null)}
            >
              <div className="flex-shrink-0">
                <ImageComponent
                  className="h-12 w-12 rounded-full overflow-hidden"
                  src={branches[index].logo?.src}
                  hash={branches[index].logo?.blurHash}
                />
              </div>
              <div className="ml-4">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  {branches[index]?.name}
                </h3>
              </div>
            </div>
            {business?.id === branches[index].id && (
              <span className="h-2 w-2 rounded-full bg-green-500 mr-6"></span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flow-root max-h-[22rem] overflow-auto scrollbar-none h-full">
        <ul role="list" className="-my-5 divide-y divide-gray-200 py-2 ">
          {user?.isSuperAdmin ? (
            <div className="relative flex flex-col gap-2 p-1 mt-2">
              <div className="sticky top-0 pb-2">
                <SearchComponent
                  findAction={(search: string) => setFilter({ search })}
                  placeholder="Buscar negocio"
                />
              </div>
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <SpinnerLoading />
                </div>
              ) : (
                allBusiness
                  .filter((item) => item.id !== branches[index].id)
                  .map((branch) => (
                    <li key={branch.id} className="py-4 cursor-pointer">
                      <div
                        className="flex items-center space-x-4"
                        onClick={() => changeBranch(branch.id ?? null)}
                      >
                        <div className="flex-shrink-0">
                          <ImageComponent
                            className="h-8 w-8 rounded-full overflow-hidden"
                            src={branch.logo?.src}
                            hash={branch.logo?.blurHash}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {branch.name}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2">
                          {business?.id === branch.id && (
                            <span className="h-2 w-2 rounded-full bg-green-400"></span>
                          )}
                          <span>
                            <ChevronRightIcon className="h-4" />
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
              )}
            </div>
          ) : (
            branches
              .filter((item) => !item.isMain)
              .map((branch) => (
                <li key={branch.id} className="py-4 cursor-pointer">
                  <div
                    className="flex items-center space-x-4"
                    onClick={() => changeBranch(branch.id ?? null)}
                  >
                    <div className="flex-shrink-0">
                      <ImageComponent
                        className="h-8 w-8 rounded-full overflow-hidden"
                        src={branch.logo?.src}
                        hash={branch.logo?.blurHash}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {branch.name}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      {business?.id === branch.id && (
                        <span className="h-2 w-2 rounded-full bg-green-400"></span>
                      )}
                      <span>
                        <ChevronRightIcon className="h-4" />
                      </span>
                    </div>
                  </div>
                </li>
              ))
          )}
        </ul>
      </div>
    </div>
  );
}
