"use client"

import type React from "react"
import { X } from "lucide-react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-premium max-w-lg w-full max-h-[90vh] overflow-y-auto border border-teal-50 animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-teal-50 bg-teal-50/30">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-slate-400 hover:text-teal-600 shadow-sm hover:shadow-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}
