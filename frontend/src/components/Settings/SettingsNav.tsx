import clsx from 'clsx'
import { Bell, Bot, Palette, Shield, User, type LucideIcon } from 'lucide-react'

export type SettingsTab = 'profile' | 'models' | 'team' | 'appearance' | 'notifications'

type TabConfig = {
  key: SettingsTab
  label: string
  icon: LucideIcon
}

const tabs: TabConfig[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'models', label: 'Models', icon: Bot },
  { key: 'team', label: 'Team', icon: Shield },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

interface SettingsNavProps {
  activeTab: SettingsTab
  onChange: (tab: SettingsTab) => void
}

export function SettingsNav({ activeTab, onChange }: SettingsNavProps) {
  return (
    <nav className="w-52 space-y-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
            activeTab === tab.key
              ? 'bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
