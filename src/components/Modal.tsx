import { ReactNode, useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ title, onClose, children, size = 'md' }: Props) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  )
}
