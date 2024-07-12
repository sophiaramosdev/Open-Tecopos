import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { useAppSelector } from "../../store/hooks";
import Input from "../../components/forms/Input";
import TextArea from "../../components/forms/TextArea";
import Button from "../../components/misc/Button";
import Fetching from "../../components/misc/Fetching";
import { useEffect, useMemo } from "react";
import { cleanObj } from "../../utils/helpers";
import {
  FaFacebookF,
  FaWhatsapp,
  FaInstagram,
} from "react-icons/fa";

import { FaTwitter } from "react-icons/fa6";

import useServerBusiness from "../../api/useServerBusiness";
import AsyncComboBox from "../../components/forms/AsyncCombobox";

const ContactConfig = () => {
  const { control, handleSubmit, watch, getValues, setValue } = useForm();
  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: "phones",
  });

  const {
    fields: socialNet,
    append: appendSocialNet,
    remove: removeSocialNet,
    insert: insertSocialNet,
  } = useFieldArray({
    control,
    name: "socialNetworks",
  });

  const { business } = useAppSelector((state) => state.init);

  const { editBusiness, isFetching } = useServerBusiness();
  const onSubmit: SubmitHandler<
    Record<string, string | number | boolean | { id: string; type: string }>
  > = (data) => {
    data.address = cleanObj(data.address);
    editBusiness(cleanObj(data));
    removeSocialNet();
    remove();
  };

  useEffect(() => {
    insert(0, business?.phones);
    insertSocialNet(0, business?.socialNetworks);
  }, [business]);

  //manage SocialNetworks form --------------------------------------------------------------------------
  const socialNetworksTypes = [
    {
      type: "WHATSAPP",
      icon: <FaWhatsapp className="text-green-600 text-2xl" />,
      color: "green-700",
      link: "https://wa.me/",
    },
    {
      type: "FACEBOOK",
      icon: <FaFacebookF className="text-blue-800 text-2xl" />,
      color: "blue-500",
      link: "https://www.facebook.com/",
    },
    {
      type: "TWITTER",
      icon: <FaTwitter className="text-black text-2xl" />,
      color: "blue-500",
      link: "https://twitter.com/",
    },
    {
      type: "INSTAGRAM",
      icon: (
        <FaInstagram className="bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-2xl rounded-lg text-white" />
      ),
      color: "gray-500",
      link: "https://www.instagram.com/",
    },
  ];

  //--------------------------------------------------------------------------------
  //Default address props ---------------------------------------------
  const defaultAddress: Partial<{
    countryId: number;
    defaultCountry: { id: number; name: string };
    provinceId: number;
    defaultProvince: { id: number; name: string };
    defaultMunicipality: { id: number; name: string };
  }> = useMemo(() => {
    const address = business?.address;
    return {
      countryId: address?.country?.id,
      defaultCountry: address?.country
        ? { id: address.country.id, name: address.country.name }
        : undefined,
      provinceId: address?.province?.id,
      defaultProvince: address?.province
        ? { id: address.province.id, name: address.province.name }
        : undefined,
      defaultMunicipality: address?.municipality
        ? { id: address.municipality.id, name: address.municipality.name }
        : undefined,
    };
  }, [business]);

  //--------------------------------------------------------------------------------
  if (isFetching) return <Fetching />;
  return (
    <form
      onSubmit={handleSubmit(onSubmit)} /* w-3/4 */
      className=" m-auto shadow-md p-5 rounded-lg bg-gray-50"
    >
      <div className=" md:grid md:grid-cols-2 md:gap-2 ">
        <div className="pt-8 col-span-2">
          <div className="relative border-t border-slate-500 flex justify-center">
            <span className="relative text-center bg-gray-50 px-5 -top-3">
              Dirección
            </span>
          </div>
        </div>
        <Input
          label="Calle principal"
          name="address.street_1"
          control={control}
          defaultValue={business?.address?.street_1}
        />
        <Input
          label="Calle secundaria"
          name="address.street_2"
          control={control}
          defaultValue={business?.address?.street_2}
        />
        <Input
          label="Localidad"
          name="address.city"
          control={control}
          defaultValue={business?.address?.city}
        />
        <AsyncComboBox
          name="address.countryId"
          label="País"
          control={control}
          dataQuery={{ url: "/public/countries" }}
          normalizeData={{ id: "id", name: "name" }}
          defaultItem={defaultAddress?.defaultCountry}
        />
        <AsyncComboBox
          name="address.provinceId"
          label="Provincia"
          control={control}
          dataQuery={{
            url: "/public/provinces",
            defaultParams: defaultAddress.countryId
              ? {countryId:defaultAddress.countryId}
              : undefined,
          }}
          normalizeData={{ id: "id", name: "name" }}
          defaultItem={defaultAddress?.defaultProvince}
          dependendValue={{countryId: watch("address.countryId") }}
        />
        <AsyncComboBox
          name="address.municipalityId"
          label="Municipio"
          control={control}
          dataQuery={{
            url: "/public/municipalities",
            defaultParams: defaultAddress?.provinceId
              ? {provinceId: defaultAddress.provinceId}
              : undefined,
          }}
          normalizeData={{ id: "id", name: "name" }}
          defaultItem={defaultAddress?.defaultMunicipality}
          dependendValue={{ provinceId:watch("address.provinceId") }}
        />

        <div className="col-span-2">
          <TextArea
            name="address.description"
            label="Observaciones"
            control={control}
            defaultValue={business?.address?.description}
          />
        </div>
      </div>
      {/**Teléfonos */}
      <div className="pt-8">
        <div className="relative border-t border-slate-500 flex justify-center">
          <span className="relative text-center bg-gray-50 px-5 -top-3">
            Teléfono
          </span>
        </div>
      </div>
      {fields.map((item, idx) => (
        <div key={item.id} className="inline-flex w-full gap-2">
          <div key={item.id} className="grid grid-cols-2 gap-2 w-full">
            <Input
              name={`phones.${idx}.number`}
              control={control}
              label="Teléfono"
              defaultValue={business?.phones[idx]?.number}
              rules={{ required: "Llene los datos o elimine el campo" }}
            />
            <Input
              name={`phones.${idx}.description`}
              control={control}
              label="Descripción"
              defaultValue={business?.phones[idx]?.description}
              rules={{ required: "Llene los datos o elimine el campo" }}
            />
          </div>
          <div className="flex items-end pt-5">
            <Button
              color="red-500"
              icon={<TrashIcon className="h-5" />}
              action={() => remove(idx)}
            />
          </div>
        </div>
      ))}
      <div className="flex justify-end mt-5 gap-2">
        <Button
          color="slate-400"
          textColor="slate-500"
          icon={<PlusIcon className="h-5" />}
          name="Insertar"
          action={() => append({})}
          full
          outline
        />
      </div>

      {/**Correo electrónico */}
      <div className="pt-8">
        <div className="relative border-t border-slate-500 flex justify-center">
          <span className="relative text-center bg-gray-50 px-5 -top-3">
            Correo Electrónico
          </span>
        </div>
      </div>

      <Input
        name="email"
        control={control}
        label="Correo Electrónico *"
        defaultValue={business?.email}
        rules={{ required: "Campo requerido" }}
      />

      {/**Redes Sociales */}
      <div className="pt-8">
        <div className="relative border-t border-slate-500 flex justify-center">
          <span className="relative text-center bg-gray-50 px-5 -top-3">
            Redes Sociales
          </span>
        </div>
      </div>

      <div className="inline-flex gap-3 justify-center w-full">
        {socialNetworksTypes.map((item, idx) => (
          <div key={idx}>
            <Button
              icon={item.icon}
              color={item.color}
              outline
              action={() =>
                !getValues("socialNetworks")?.find(
                  (value: any) => item.type === value.type
                ) && appendSocialNet({ type: item.type })
              }
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center w-full">
        <div className="flex flex-col">
          {socialNet.map((item, idx) => (
            <div key={item.id} className="inline-flex gap-2 justify-between">
              <div key={item.id} className="flex items-center gap-2">
                {
                  socialNetworksTypes.find(
                    (itm) => itm.type === getValues("socialNetworks")[idx].type
                  )?.icon
                }
                <Input
                  name={`socialNetworks.${idx}.user`}
                  control={control}
                  defaultValue={business?.socialNetworks[idx]?.user}
                  rules={{ required: "Llene los datos o elimine el campo" }}
                  placeholder="Usuario"
                  stackedText={
                    socialNetworksTypes.find(
                      (itm) =>
                        itm.type === getValues("socialNetworks")[idx].type
                    )?.link
                  }
                />
              </div>
              <div className="flex items-end py-2 justify-cente">
                <Button
                  color="red-500"
                  icon={<TrashIcon className="h-5" />}
                  action={() => removeSocialNet(idx)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end py-5">
        <Button name="Actualizar" color="slate-600" type="submit" />
      </div>
    </form>
  );
};

export default ContactConfig;
