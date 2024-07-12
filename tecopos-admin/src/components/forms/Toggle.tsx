import { useState, useEffect } from 'react'
import { Switch } from '@headlessui/react'
import { useController, UseControllerProps } from "react-hook-form";


function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface ToggleProps {
  title?: string
  disabled?: boolean;
  changeState?: Function
}

export default function Toggle(props: UseControllerProps & ToggleProps) {

  const { field } = useController(props);
  const { defaultValue, disabled } = props
  const [enabled, setEnabled] = useState(field.value ?? false)

  useEffect(() => {
    defaultValue ? field.onChange(defaultValue) : field.onChange(false)
  }, [])

  return (
    <Switch.Group as="div" className="flex items-center py-2" >
      <Switch
        disabled={disabled}
        checked={enabled}
        onChange={(e: boolean) => {
          setEnabled(e);
          field.onChange(e)
          props.changeState && props.changeState(e)
        }
        }
        className={classNames(
          enabled ? 'bg-gray-600' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-gray-600 focus:ring-offset-1'
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            enabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
          )}
        />
      </Switch>
      {props.title &&
        <Switch.Label as="span" className="ml-3">
          <span className="text-md text-base font-medium text-gray-900">{props.title}</span>
        </Switch.Label>
      }
    </Switch.Group>
  )
}