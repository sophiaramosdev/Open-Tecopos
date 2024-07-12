import { Icon } from '@iconify/react'
import React from 'react'
import Button from '../../../components/misc/Button'
import Modal from '../../../components/modals/GenericModal'

interface ModalProps {
  registerType: string
  state: boolean
  sendMail?: boolean
  action?: Function
  close: Function
}

export const SuccessBillingModal = ( {sendMail, registerType, state, action, close}:ModalProps ) => {
  
  const handlerSubmit = () => {
    close(false)
    action && action!(false)
  }
  
  return (
    <Modal
      state={state}
      close={close}
    >
    <div className='grid min-h-80 gap-y-12'>
      {/* row 1 */}
      <div className='flex justify-center items-center' >
        <Icon icon="simple-line-icons:check" width="10rem" height="10rem"  style={{color: "#26239F"}} />      
      </div>
      {/* row 2 */}
      <div className='text-xl text-center'>
        <h1>¡{registerType} se ha registrado con éxito!</h1>
      </div>
      {/* row 3 */}
      <div className='text-center'>
        {
          sendMail && ( 
            <p>Le hemos enviado un mensaje de confirmación a su correo electrónico.</p>
          )
        }
      </div>
      {/* row 4 */}
      <div className='grid justify-center'>
        <Button
          name='Aceptar'
          color='slate-700'
          action={()=>handlerSubmit()}
        />
      </div>
    </div>
    </Modal>
  )
}
