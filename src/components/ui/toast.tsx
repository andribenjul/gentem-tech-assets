"use client"

import { Toaster as SonnerToaster } from "sonner"

type ToastProviderProps = React.ComponentProps<typeof SonnerToaster>

function ToastProvider({ ...props }: ToastProviderProps) {
  return (
    <SonnerToaster
      richColors
      position="top-right"
      {...props}
    />
  )
}

export { ToastProvider }
