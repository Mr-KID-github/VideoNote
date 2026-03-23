import { Shield } from 'lucide-react'
import { useI18n } from '../lib/i18n'

export function Team() {
  const { copy } = useI18n()

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-[#202020]">
        <Shield className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h2 className="text-2xl font-bold">{copy.teamPage.title}</h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {copy.teamPage.body}
        </p>
      </div>
    </div>
  )
}
