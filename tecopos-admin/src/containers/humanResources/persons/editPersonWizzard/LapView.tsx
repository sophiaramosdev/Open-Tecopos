import React from 'react'
import { PersonInterface } from '../../../../interfaces/ServerInterfaces';
import Barcode from 'react-barcode';
import ImageComponent from '../../../../components/misc/Images/Image';
import { useAppSelector } from '../../../../store/hooks';


interface LapViewInterface {
    person: PersonInterface | null;
}


const LapView = ({
    person
}: LapViewInterface) => {

    const { business } = useAppSelector(state => state.init)


    return (
        <div className='flex flex-col items-center justify-center'>

            <div className='realtive mt-10'>
                <ImageComponent
                    className="h-60 w-60  border border-gray-400 m-auto overflow-hidden"
                    hash={person?.profilePhoto?.blurHash}
                    src={person?.profilePhoto?.src}
                />
                <ImageComponent
                    className="h-20 absolute top-10 left-10 w-20 ml-20 rounded-full border border-gray-400 m-auto overflow-hidden"
                    hash={business?.logo?.blurHash}
                    src={business?.logo?.src}
                />
            </div>



            <div className='my-4'>
                <p className='border-transparent text-gray-700  py-2 px-6 text-center  font-bold text-4xl  gap-2 '>{(person?.firstName ?? "") + " " + (person?.lastName ?? "")}</p>
                <p className='border-transparent text-gray-700   px-6 text-center  font-medium text-xl  gap-2 '>{person?.post?.name ?? ""}</p>
            </div>

            <div className='mt-10'>
                <Barcode value={person?.barCode?.toString()!} lineColor='black' />

            </div>
        </div>
    )
}

export default LapView
