export function StaffHomePage() {
  return (
    <div className="staff-grid">
      <section className="panel panel-highlight">
        <p className="eyebrow">Foundation</p>
        <h2>Bootstrap Ready</h2>
        <p>
          Backend, frontend, Docker and CI-compatible structure are in place. The next implementation step is
          to add real domain entities for customers, vehicles and repairs.
        </p>
      </section>

      <section className="panel">
        <h3>Planned Surfaces</h3>
        <ul>
          <li>Customer and vehicle registries</li>
          <li>Repair workflow with photos, parts and supplier tracking</li>
          <li>Monthly history and completion acts</li>
        </ul>
      </section>

      <section className="panel">
        <h3>Access Model</h3>
        <ul>
          <li>`/admin/` for Django Admin</li>
          <li>`/app` for internal staff workspace</li>
          <li>`/portal/:accessCode` for client access</li>
        </ul>
      </section>
    </div>
  );
}
