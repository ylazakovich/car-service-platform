import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RepairModalShell } from "./RepairModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { ConfirmReopenModal } from "./ConfirmReopenModal";

const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("Repair modal keyboard handling", () => {
  it("closes the repair shell on Escape regardless of focus", () => {
    render(
      <RepairModalShell
        mode="create"
        title="New Repair"
        footerLayout="right"
        primaryLabel="Create Repair"
        savingLabel="Creating…"
        onClose={onClose}
      >
        <div />
      </RepairModalShell>,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the delete confirm modal on Escape without closing the underlying shell", () => {
    const shellClose = vi.fn();
    const confirmCancel = vi.fn();

    render(
      <>
        <RepairModalShell
          mode="edit"
          title="Repair"
          footerLayout="right"
          primaryLabel="Save"
          savingLabel="Saving…"
          onClose={shellClose}
        >
          <div />
        </RepairModalShell>
        <ConfirmDeleteModal
          trackingCode="TOR-1011"
          vehicleLabel="AB 1234 • Ford Focus"
          ownerName="Test Owner"
          onCancel={confirmCancel}
          onConfirm={vi.fn()}
        />
      </>,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(confirmCancel).toHaveBeenCalledTimes(1);
    expect(shellClose).not.toHaveBeenCalled();
  });

  it("closes the reopen confirm modal on Escape", () => {
    const onCancel = vi.fn();

    render(
      <ConfirmReopenModal
        trackingCode="TOR-1011"
        vehicleLabel="AB 1234 • Ford Focus"
        completedAt="2026-05-27"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
