import { useState } from 'react'
import { Shield } from 'lucide-react'
import { AppearanceSettingsPanel } from '../components/Settings/AppearanceSettingsPanel'
import { ModelProfileManager } from '../components/Settings/ModelProfileManager'
import { NotificationSettingsPanel } from '../components/Settings/NotificationSettingsPanel'
import { PlaceholderSettingsPanel } from '../components/Settings/PlaceholderSettingsPanel'
import { ProfileSettingsPanel } from '../components/Settings/ProfileSettingsPanel'
import { SettingsNav, type SettingsTab } from '../components/Settings/SettingsNav'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const { user } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="flex gap-8">
        <SettingsNav activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettingsPanel email={user?.email} />}
          {activeTab === 'models' && <ModelProfileManager />}
          {activeTab === 'team' && (
            <PlaceholderSettingsPanel
              icon={Shield}
              title="Team"
              body="Team-scoped model sharing is intentionally out of scope for v1."
            />
          )}
          {activeTab === 'appearance' && <AppearanceSettingsPanel theme={theme} onThemeChange={setTheme} />}
          {activeTab === 'notifications' && <NotificationSettingsPanel />}
        </div>
      </div>
    </div>
  )
}
