import { memo } from 'react'
import { useToasts } from '../../store/useAppStore'
import useAppStore from '../../store/useAppStore'
import Toast from '../Toast/Toast'
import './ToastContainer.css'

const ToastContainer = () => {
  const toasts = useToasts()
  const removeToast = useAppStore((state) => state.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position={toast.position}
          showCloseButton={toast.showCloseButton}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default memo(ToastContainer)