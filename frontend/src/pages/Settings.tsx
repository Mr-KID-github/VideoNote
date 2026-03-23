import { useState } from 'react'
import { Shield } from 'lucide-react'
import { AppearanceSettingsPanel } from '../components/Settings/AppearanceSettingsPanel'
import { ModelProfileManager } from '../components/Settings/ModelProfileManager'
import { NotificationSettingsPanel } from '../components/Settings/NotificationSettingsPanel'
import { PlaceholderSettingsPanel } from '../components/Settings/PlaceholderSettingsPanel'
import { ProfileSettingsPanel } from '../components/Settings/ProfileSettingsPanel'
import { SettingsNav, type SettingsTab } from '../components/Settings/SettingsNav'
import { useI18n } from '../lib/i18n'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const { user } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const { copy, language, setLanguage } = useI18n()

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">{copy.settings.title}</h2>

      <div className="flex gap-8">
        <SettingsNav activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettingsPanel email={user?.email} />}
          {activeTab === 'models' && <ModelProfileManager />}
          {activeTab === 'team' && (
            <PlaceholderSettingsPanel
              icon={Shield}
              title={copy.settings.team}
              body={copy.settings.teamBody}
            />
          )}
          {activeTab === 'appearance' && (
            <AppearanceSettingsPanel
              theme={theme}
              language={language}
              onThemeChange={setTheme}
              onLanguageChange={setLanguage}
            />
          )}
          {activeTab === 'notifications' && <NotificationSettingsPanel />}
        </div>
      </div>
    </div>
  )
}
