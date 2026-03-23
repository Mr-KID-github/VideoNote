import clsx from 'clsx'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const icons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  }

  const Icon = icons[theme]
  const label = theme === 'system' ? 'system' : theme

  return (
    <button
      onClick={cycleTheme}
      className={clsx(
        'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
        'text-gray-600 dark:text-gray-400'
      )}
      title={`Theme: ${label}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}
