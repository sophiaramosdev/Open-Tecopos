import { BriefcaseIcon } from "@heroicons/react/24/outline";
import useServer from "../api/useServer";
import { useEffect } from "react";
import StatusCard from "../components/misc/StatusCardWithIcon";
import Loading from "../components/misc/Loading";
import RegisteredBusinessChart from "../components/business/RegisteredBusinessChart";

const Dashboard = () => {
  const { getSumaryData, sumaryData, isLoading } = useServer();

  useEffect(() => {
    getSumaryData();
  }, []);

  if (isLoading) {
    return <Loading />;
  } else {
    return (
      <main className="flex-1">
        <div className="py-6">
          <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-8">
            <RegisteredBusinessChart />

            <div className="mt-20 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
              <StatusCard
                name="Negocios Registrados"
                stat={sumaryData?.totalRegisteredBusiness}
                icon={<BriefcaseIcon className="h-6 w-6 text-white" />}
                href="/business"
              />
            </div>

            <h3 className="text-lg font-medium leading-6 text-gray-900 mt-10">
              Por Categorías
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
              {sumaryData?.totalBySubscriptionPlan?.map((item) => (
                <div
                  key={item?.code}
                  className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 text-ce"
                >
                  <dt className="truncate text-sm font-medium text-gray-500 text-center">
                    {item?.code}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold tracking-tight text-orange-600 text-center">
                    {item?.amount}
                  </dd>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-medium leading-6 text-gray-900 mt-10">
              Por Tipo
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
              {sumaryData?.totalByType?.map((item, idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 text-ce"
                >
                  <dt className="truncate text-sm font-medium text-gray-500 text-center">
                    {item?.type}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold tracking-tight text-orange-600 text-center">
                    {item?.amount}
                  </dd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }
};

export default Dashboard;
