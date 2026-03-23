export function NotificationSettingsPanel() {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Notifications</h3>
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked className="w-4 h-4" />
          <span>Notify when note generation finishes</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked className="w-4 h-4" />
          <span>Notify when team invitations arrive</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="w-4 h-4" />
          <span>Email notifications</span>
        </label>
      </div>
    </div>
  )
}
