import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { User, Shield, Palette, Bell, Plus, Mail } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'profile' | 'team' | 'appearance' | 'notifications'

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const { user } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const tabs = [
    { key: 'profile', label: '个人资料', icon: User },
    { key: 'team', label: '团队管理', icon: Shield },
    { key: 'appearance', label: '外观', icon: Palette },
    { key: 'notifications', label: '通知', icon: Bell },
  ] as const

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">设置</h2>

      <div className="flex gap-8">
        {/* 侧边 tabs */}
        <nav className="w-48 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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

        {/* 内容区 */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮箱</label>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#202020] text-gray-500">
                  <Mail className="w-4 h-4" />
                  {user?.email || '未登录'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">显示名称</label>
                <input
                  type="text"
                  placeholder="你的名字"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent outline-none transition-all"
                />
              </div>
              <button className="px-4 py-2 bg-primary-light dark:bg-primary-dark text-white rounded-lg hover:opacity-90 transition-opacity">
                保存修改
              </button>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">团队管理</h3>
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">暂无团队</p>
                <button className="px-4 py-2 bg-primary-light dark:bg-primary-dark text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  创建团队
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">主题设置</h3>
              <div className="space-y-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <label
                    key={t}
                    className={clsx(
                      'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                      theme === t
                        ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={t}
                      checked={theme === t}
                      onChange={() => setTheme(t)}
                      className="text-primary-light dark:text-primary-dark"
                    />
                    <span>{t === 'light' ? '浅色模式' : t === 'dark' ? '深色模式' : '跟随系统'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">通知设置</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-primary-light rounded" />
                  <span>笔记生成完成通知</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-primary-light rounded" />
                  <span>团队邀请通知</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4 text-primary-light rounded" />
                  <span>邮件通知</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
