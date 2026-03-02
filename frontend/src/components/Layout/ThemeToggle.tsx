import { Moon, Sun, Monitor } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import clsx from 'clsx'

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

  return (
    <button
      onClick={cycleTheme}
      className={clsx(
        'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
        'text-gray-600 dark:text-gray-400'
      )}
      title={`当前: ${theme === 'system' ? '跟随系统' : theme === 'light' ? '浅色' : '深色'}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}
