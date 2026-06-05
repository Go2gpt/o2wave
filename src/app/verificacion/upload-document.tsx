'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_MB = 10

export default function UploadDocument({ userId, reenvio = false }: { userId: string; reenvio?: boolean }) {
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    if (!ACCEPTED.includes(file.type)) {
      setError('Formato no válido. Sube un PDF, JPG o PNG.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera el límite de ${MAX_MB} MB.`)
      return
    }

    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('verification-docs')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        console.error('upload error:', upErr)
        setError('No se pudo subir el documento. Inténtalo de nuevo.')
        return
      }

      // Registra el envío vía RPC SECURITY DEFINER: hace el UPDATE con los
      // permisos del propietario de la función (no del usuario), evitando que
      // el cliente pueda escribir estado_verificacion directamente.
      const { error: rpcErr } = await supabase.rpc('submit_verification_document', { p_path: path })
      if (rpcErr) {
        console.error('rpc error:', rpcErr)
        setError('No se pudo guardar el documento. Inténtalo de nuevo.')
        return
      }

      router.refresh()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-xl py-4 text-sm font-bold text-[#0F0F0F] transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ backgroundColor: '#93bf30' }}
      >
        {uploading
          ? 'Subiendo...'
          : reenvio
          ? 'Subir nuevo documento'
          : 'Subir documento'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg"
        onChange={onFile}
        className="hidden"
      />
      <p className="text-center text-xs text-white/30">PDF, JPG o PNG · máx. 10 MB</p>
      {error && (
        <p className="text-center text-xs font-medium text-[#f9b23b]">⚠️ {error}</p>
      )}
    </div>
  )
}
