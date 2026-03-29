import { useEffect, useState } from 'react'
import { BookText, ChevronDown, ChevronRight, FileText, Folder, Home, Plus, Settings, Users } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import packageJson from '../../../package.json'
import { useI18n } from '../../lib/i18n'
import { resolveDocumentUrl } from '../../lib/runtimeConfig'
import { getWorkspaceLabel, useTeamStore } from '../../stores/teamStore'

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
  const { copy, locale } = useI18n()
  const appVersion = `v${packageJson.version}`
  const docsUrl = resolveDocumentUrl()
  const isZh = locale.startsWith('zh')
  const {
    teams,
    currentWorkspace,
    loadTeams,
    initialized,
    selectPersonalWorkspace,
    selectTeamWorkspace,
  } = useTeamStore()

  useEffect(() => {
    if (!initialized) {
      void loadTeams()
    }
  }, [initialized, loadTeams])

  const toggleFolder = (id: string) => {
    setExpandedFolders((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const navItems = [
    { path: '/', icon: Home, label: copy.sidebar.home },
    { path: '/notes', icon: FileText, label: copy.sidebar.notes },
    { path: '/team', icon: Users, label: copy.sidebar.team },
    { path: '/settings', icon: Settings, label: copy.sidebar.settings },
  ]

  return (
    <aside className="w-60 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#202020] flex flex-col">
      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => (
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
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.sidebar.workspace}</span>
          <button
            onClick={() => navigate('/team')}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title={isZh ? '管理团队' : 'Manage teams'}
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => selectPersonalWorkspace()}
            className={clsx(
              'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
              currentWorkspace.scope === 'personal'
                ? 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {isZh ? '个人空间' : 'Personal workspace'}
          </button>

          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => selectTeamWorkspace(team.id)}
              className={clsx(
                'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                currentWorkspace.scope === 'team' && currentWorkspace.teamId === team.id
                  ? 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              <div className="truncate font-medium">{team.name}</div>
              <div className="mt-0.5 text-xs text-gray-400">
                {team.memberCount} {isZh ? '成员' : team.memberCount === 1 ? 'member' : 'members'}
              </div>
            </button>
          ))}

          {folders.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">
              {getWorkspaceLabel(currentWorkspace, teams, isZh ? '个人空间' : 'Personal workspace')}
            </p>
          ) : (
            folders.map((folder) => (
              <FolderItemComponent
                key={folder.id}
                folder={folder}
                expanded={expandedFolders.has(folder.id)}
                onToggle={() => toggleFolder(folder.id)}
              />
            ))
          )}

          {teams.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">{isZh ? '还没有团队。' : 'No teams yet.'}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{appVersion}</p>
        <a
          href={docsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary-light dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-dark"
        >
          <BookText className="h-4 w-4" />
          <span>Document</span>
        </a>
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
          {folder.children.map((child) => (
            <FolderItemComponent key={child.id} folder={child} expanded={false} onToggle={() => {}} />
          ))}
        </div>
      )}
    </div>
  )
}
