import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffRepairsKanban } from "./StaffRepairsKanban";
import type { RepairEntry, RepairStatus } from "../shared/repairs";

function repair(overrides: Partial<RepairEntry> = {}): RepairEntry {
  return {
    id: 1,
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
    completed_at: "",
    vehicle_id: 10,
    vehicle_label: "Toyota Corolla",
    vehicle_plate: "WX12345",
    vehicle_model: "Corolla",
    vehicle_year: 2018,
    mileage: null,
    owner_name: "Jan Kowalski",
    master_id: null,
    master_name: null,
    started_at: null,
    service_name: "Oil change",
    service_lines: [],
    issue_notes: "",
    repair_notes: [],
    status: "new",
    mileage_at_service: null,
    tracking_code: "R-001",
    portal_token: "token",
    has_pdf: false,
    latest_act_document_total: null,
    estimated_date: "",
    before_photos: [],
    during_photos: [],
    after_photos: [],
    position: null,
    ...overrides,
  };
}

function renderKanban(repairs: RepairEntry[]) {
  return render(
    <StaffRepairsKanban
      repairs={repairs}
      draggingRepairId={null}
      dragOverColumn={null}
      onCardDragStart={vi.fn()}
      onCardDragEnd={vi.fn()}
      onColumnDragOver={vi.fn()}
      onColumnDragLeave={vi.fn()}
      onColumnDrop={vi.fn()}
      dragOverCardId={null}
      onCardDragOver={vi.fn()}
      onCardDrop={vi.fn()}
      onOpenRepair={vi.fn()}
    />
  );
}

afterEach(cleanup);

describe("StaffRepairsKanban", () => {
  it("keeps picked-up repair cards in the completed column and renders them as inactive", () => {
    const { container } = renderKanban([
      repair({ id: 1, status: "completed", tracking_code: "DONE", vehicle_plate: "DONE-1" }),
      repair({ id: 2, status: "picked_up", tracking_code: "PICKED", vehicle_plate: "PICK-2" }),
    ]);

    const pickedUpCard = screen.getByText("PICK-2").closest("article");
    expect(pickedUpCard?.className).toContain("kanban-card--picked-up");

    const completedColumn = Array.from(container.querySelectorAll(".kanban-col")).find((column) =>
      column.textContent?.includes("Completed")
    );
    expect(completedColumn?.textContent).toContain("PICK-2");
    expect(completedColumn?.textContent).toContain("DONE-1");

    const pickedUpColumnHeader = Array.from(container.querySelectorAll(".kanban-col-header")).find((header) =>
      header.textContent?.includes("Picked Up")
    );
    expect(pickedUpColumnHeader).toBeUndefined();
  });

  it("drops a picked-up card as a completed-column card", () => {
    const onCardDrop = vi.fn();
    render(
      <StaffRepairsKanban
        repairs={[repair({ id: 2, status: "picked_up", tracking_code: "PICKED", vehicle_plate: "PICK-2" })]}
        draggingRepairId={null}
        dragOverColumn={null}
        onCardDragStart={vi.fn()}
        onCardDragEnd={vi.fn()}
        onColumnDragOver={vi.fn()}
        onColumnDragLeave={vi.fn()}
        onColumnDrop={vi.fn()}
        dragOverCardId={null}
        onCardDragOver={vi.fn()}
        onCardDrop={onCardDrop}
        onOpenRepair={vi.fn()}
      />
    );

    const pickedUpCard = screen.getByText("PICK-2").closest("article");
    if (!pickedUpCard) throw new Error("picked-up card was not rendered");
    fireEvent.drop(pickedUpCard);

    expect(onCardDrop.mock.calls[0]?.[1]).toBe("completed" satisfies RepairStatus);
  });
});
