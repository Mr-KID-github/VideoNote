import { useI18n } from '../../lib/i18n'

export function NotificationSettingsPanel() {
  const { copy } = useI18n()

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">{copy.settings.notificationsTitle}</h3>
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked className="w-4 h-4" />
          <span>{copy.settings.notifyFinished}</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked className="w-4 h-4" />
          <span>{copy.settings.notifyInvites}</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="w-4 h-4" />
          <span>{copy.settings.emailNotifications}</span>
        </label>
      </div>
    </div>
  )
}
