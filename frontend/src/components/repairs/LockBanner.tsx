import { RepairIcon } from "./repairIcons";

export function LockBanner() {
  return (
    <div className="lock-banner" role="status">
      <span className="lock-banner__icon">
        <RepairIcon name="check" size={16} />
      </span>
      <div className="lock-banner__body">
        <div className="lock-banner__title">Repair completed</div>
        <div className="lock-banner__hint">Fields are read-only. Reopen the repair to make changes.</div>
      </div>
    </div>
  );
}
