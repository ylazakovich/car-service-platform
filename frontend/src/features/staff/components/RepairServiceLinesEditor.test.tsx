import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RepairServiceLinesEditor } from "./RepairServiceLinesEditor";

describe("RepairServiceLinesEditor", () => {
  it("lets the user pick a catalog service from the styled suggestions list", async () => {
    const user = userEvent.setup();

    function TestHarness() {
      const [lines, setLines] = useState([
        { key: "1", persisted_id: null, name: "", catalog_service_id: null, catalog_service_price: "" },
      ]);

      return (
        <RepairServiceLinesEditor
          idPrefix="repair-create"
          lines={lines}
          onChange={setLines}
          catalog={[
            { id: 1, name: "Oil Change", description: "", price: "199.00", is_active: true },
            { id: 2, name: "Brake Service", description: "", price: "420.00", is_active: true },
          ]}
        />
      );
    }

    render(<TestHarness />);

    const input = screen.getByLabelText("Line 1 — service name");
    await user.click(input);
    await user.type(input, "Brake");
    await user.click(screen.getByRole("button", { name: /Brake Service/i }));

    expect(screen.getByDisplayValue("Brake Service")).toBeInTheDocument();
    expect(screen.queryByLabelText("Price for new service Brake Service")).not.toBeInTheDocument();
  });

  it("shows a price field for a new custom service", async () => {
    const user = userEvent.setup();

    function TestHarness() {
      const [lines, setLines] = useState([
        { key: "1", persisted_id: null, name: "", catalog_service_id: null, catalog_service_price: "" },
      ]);

      return (
        <RepairServiceLinesEditor
          idPrefix="repair-create"
          lines={lines}
          onChange={setLines}
          catalog={[{ id: 1, name: "Oil Change", description: "", price: "199.00", is_active: true }]}
        />
      );
    }

    render(<TestHarness />);

    await user.type(screen.getByLabelText("Line 1 — service name"), "Custom Paint");

    expect(await screen.findByLabelText("Price for new service Custom Paint")).toBeInTheDocument();
  });
});
