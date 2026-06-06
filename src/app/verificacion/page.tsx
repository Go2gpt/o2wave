import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Logo from '@/components/Logo'
import UploadDocument from './upload-document'

export const dynamic = 'force-dynamic'

export default async function VerificacionPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('estado_verificacion, documento_url, motivo_rechazo, tipo_entidad')
    .eq('id', user.id)
    .single()

  if (!profile || profile.estado_verificacion === 'verificada') {
    redirect('/dashboard')
  }

  const estado = profile.estado_verificacion ?? 'pendiente'
  const yaSubio = Boolean(profile.documento_url)

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Logo size="lg" />
        </div>

        {estado === 'pendiente' && !yaSubio && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold">Verifica tu organización</h1>
              <p className="text-sm text-white/60">
                Para activar tu plan gratuito necesitamos un documento que acredite a
                tu entidad (estatutos, certificado de inscripción o similar).
              </p>
            </div>
            <UploadDocument userId={user.id} />
          </div>
        )}

        {estado === 'pendiente' && yaSubio && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#93bf30]/15">
              <span className="text-2xl">⏳</span>
            </div>
            <h1 className="text-2xl font-semibold">Documento en revisión</h1>
            <p className="text-sm text-white/60">
              Estamos revisando tu documentación. Te avisaremos por email en cuanto
              tu cuenta esté verificada.
            </p>
          </div>
        )}

        {estado === 'rechazada' && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold">Verificación rechazada</h1>
              <div className="rounded-lg border border-[#f9b23b]/40 bg-[#f9b23b]/10 px-4 py-3 text-left text-sm text-[#f9b23b]">
                <p className="font-medium">Motivo:</p>
                <p className="mt-1 text-[#f9b23b]/90">
                  {profile.motivo_rechazo || 'No se especificó un motivo.'}
                </p>
              </div>
              <p className="text-sm text-white/60">
                Revisa el motivo y vuelve a subir un documento válido.
              </p>
            </div>
            <UploadDocument userId={user.id} reenvio />
          </div>
        )}

        <p className="mt-12 text-center text-xs text-white/30">Genera tu ola.</p>
      </div>
    </main>
  )
}
