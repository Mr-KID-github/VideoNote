import { Mail } from 'lucide-react'

interface ProfileSettingsPanelProps {
  email?: string
}

export function ProfileSettingsPanel({ email }: ProfileSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#202020] text-gray-500">
          <Mail className="w-4 h-4" />
          {email || 'Not signed in'}
        </div>
      </div>
    </div>
  )
}
