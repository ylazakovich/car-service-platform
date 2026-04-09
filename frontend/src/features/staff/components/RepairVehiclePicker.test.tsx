import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RepairVehiclePicker } from "./RepairVehiclePicker";

describe("RepairVehiclePicker", () => {
  it("filters vehicles by typed search text and selects the clicked option", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <RepairVehiclePicker
        vehicles={[
          {
            id: 1,
            customer: { id: 10, full_name: "Anna Nowak" },
            license_plate: "WA 1234A",
            make: "Toyota",
            model: "Corolla",
            year: 2018,
            vin: "VIN1",
            color: "White",
            notes: "",
          },
          {
            id: 2,
            customer: { id: 20, full_name: "Piotr Kowalski" },
            license_plate: "KR 7777K",
            make: "BMW",
            model: "X3",
            year: 2020,
            vin: "VIN2",
            color: "Black",
            notes: "",
          },
        ]}
        query="KR"
        selectedVehicleId=""
        onQueryChange={onQueryChange}
        onSelect={onSelect}
      />
    );

    expect(screen.queryByText("WA 1234A • Toyota Corolla")).not.toBeInTheDocument();
    const option = screen.getByRole("button", { name: /KR 7777K/i });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        license_plate: "KR 7777K",
      })
    );
  });
});
