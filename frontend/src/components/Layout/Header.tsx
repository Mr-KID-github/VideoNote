import { Search, Bell, User, LogOut, Plus } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useAuthStore } from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020]">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-primary-light dark:text-primary-dark">VideoNote</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索笔记..."
            className="w-64 pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#191919] focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent outline-none transition-all"
          />
        </div>

        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
          <Bell className="w-5 h-5" />
        </button>

        <ThemeToggle />

        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={() => navigate('/generate')}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-light dark:bg-primary-dark text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            新建
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ml-2"
          title="退出登录"
        >
          <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          {user?.email ? (
            <div className="w-8 h-8 rounded-full bg-primary-light dark:bg-primary-dark flex items-center justify-center text-white text-sm font-medium">
              {user.email[0].toUpperCase()}
            </div>
          ) : (
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>
    </header>
  )
}
