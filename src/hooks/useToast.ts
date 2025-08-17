import toast from 'react-hot-toast';

type ToastType = 'success' | 'error' | 'loading' | 'info';

interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export function useToast() {
  const showToast = (message: string, type: ToastType = 'info', options?: ToastOptions) => {
    const toastOptions = {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
    };

    switch (type) {
      case 'success':
        return toast.success(message, toastOptions);
      case 'error':
        return toast.error(message, toastOptions);
      case 'loading':
        return toast.loading(message, toastOptions);
      case 'info':
      default:
        return toast(message, toastOptions);
    }
  };

  const success = (message: string, options?: ToastOptions) => {
    return showToast(message, 'success', options);
  };

  const error = (message: string, options?: ToastOptions) => {
    return showToast(message, 'error', options);
  };

  const loading = (message: string, options?: ToastOptions) => {
    return showToast(message, 'loading', options);
  };

  const info = (message: string, options?: ToastOptions) => {
    return showToast(message, 'info', options);
  };

  const dismiss = (toastId?: string) => {
    return toast.dismiss(toastId);
  };

  const promise = <T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: ToastOptions
  ) => {
    return toast.promise(promise, msgs, options);
  };

  return {
    showToast,
    success,
    error,
    loading,
    info,
    dismiss,
    promise,
  };
}
