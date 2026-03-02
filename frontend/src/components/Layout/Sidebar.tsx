import { useState } from 'react'
import { Folder, FileText, Plus, ChevronRight, ChevronDown, Users, Home, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'

interface FolderItem {
  id: string
  name: string
  children?: FolderItem[]
}

export function Sidebar() {
  const [folders] = useState<FolderItem[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const location = useLocation()

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/notes', icon: FileText, label: '我的笔记' },
    { path: '/team', icon: Users, label: '团队空间' },
    { path: '/settings', icon: Settings, label: '设置' },
  ]

  return (
    <aside className="w-60 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#202020] flex flex-col">
      {/* 导航 */}
      <nav className="p-2 space-y-0.5">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
              location.pathname === item.path
                ? 'bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-auto p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">个人空间</span>
          <button
            onClick={() => {}}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-0.5">
          {folders.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">暂无文件夹</p>
          ) : (
            folders.map(folder => (
              <FolderItemComponent
                key={folder.id}
                folder={folder}
                expanded={expandedFolders.has(folder.id)}
                onToggle={() => toggleFolder(folder.id)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  )
}

function FolderItemComponent({ folder, expanded, onToggle }: {
  folder: FolderItem
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Folder className="w-4 h-4 text-yellow-500" />
        <span className="text-sm truncate">{folder.name}</span>
      </button>
      {expanded && folder.children && (
        <div className="ml-4">
          {folder.children.map(child => (
            <FolderItemComponent key={child.id} folder={child} expanded={false} onToggle={() => {}} />
          ))}
        </div>
      )}
    </div>
  )
}
