import { useStore } from '@/store/useStore';
import { IconCheck, IconX } from '@/components/ui/Icons';

export default function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium flex items-center gap-2.5 cursor-pointer backdrop-blur-xl min-w-[240px] transition-all ${
            t.type === 'success'
              ? 'bg-emerald-600/90'
              : t.type === 'error'
              ? 'bg-red-600/90'
              : 'bg-blue-600/90'
          }`}
          onClick={() => removeToast(t.id)}
        >
          {t.type === 'success' && <IconCheck className="w-4 h-4 flex-shrink-0" />}
          {t.type === 'error' && <IconX className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
