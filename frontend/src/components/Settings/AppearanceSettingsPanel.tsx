import clsx from 'clsx'

type ThemeMode = 'light' | 'dark' | 'system'

interface AppearanceSettingsPanelProps {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
}

export function AppearanceSettingsPanel({ theme, onThemeChange }: AppearanceSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Theme</h3>
      <div className="space-y-2">
        {(['light', 'dark', 'system'] as const).map((value) => (
          <label
            key={value}
            className={clsx(
              'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
              theme === value
                ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => onThemeChange(value)}
            />
            <span>{value === 'light' ? 'Light' : value === 'dark' ? 'Dark' : 'System'}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
