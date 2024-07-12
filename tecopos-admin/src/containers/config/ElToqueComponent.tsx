import React, { useEffect } from 'react'
import ImageComponent from '../../components/misc/Images/Image'
import useServerBusiness from '../../api/useServerBusiness';

const ElToqueComponent = () => {

    const {
        isLoading,
        getElToqueRates,
    } = useServerBusiness();

    useEffect(() => {
        getElToqueRates()
    }, []);

    return (
        <div>
            {
                !isLoading && (
                    <div>
                        <div className="flex w-full items-center justify-center">
                            <div className="flex justify-between w-3/4 mt-10 items-center h-14 bg-blue-400 px-10">
                                <p className="text-white font-semibold">MERCADO INFORMAL DE
                                    DIVISAS EN CUBA (TIEMPO REAL)</p>
                                <ImageComponent
                                    className="h-auto w-40 my-4 mx-4 overflow-hidden"
                                    src="/elToqueLogoWhite.png"
                                    hash={null}
                                />
                            </div>
                        </div>

                        <div className="flex w-full items-center justify-center">
                            <div className="flex justify-between w-3/4 mt-2 items-center h-14  px-10">

                                <div className="flex items-center justify-start">
                                    <p>1 MLC</p>
                                    <ImageComponent
                                        className="h-auto w-20 mt-10 my-4 mx-4 overflow-hidden"
                                        src="/MLC.png"
                                        hash={null}
                                    />
                                    <p>=</p>
                                </div>

                                <div className="flex items-center justify-start">
                                    <p>1 EUR</p>
                                    <ImageComponent
                                        className="h-auto w-20 my-4 mx-4 overflow-hidden"
                                        src="/EUR.png"
                                        hash={null}
                                    />
                                    <p>=</p>
                                </div>


                                <div className="flex items-center justify-start">
                                    <p>1 USD</p>
                                    <ImageComponent
                                        className="h-auto w-20 my-4 mx-4 overflow-hidden"
                                        src="/USD.png"
                                        hash={null}
                                    />
                                    <p>=</p>
                                </div>

                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default ElToqueComponent
