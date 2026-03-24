export type Vehicle = {
  id: number;
  customer: {
    id: number;
    full_name: string;
  };
  license_plate: string;
  make: string;
  model: string;
  year: number | null;
  vin: string;
  color: string;
  notes: string;
  mileage?: number | null;
  last_service_date?: string;
  added_date?: string;
  is_demo?: boolean;
};

export type VehicleUiDetails = {
  mileage: string;
  last_service_date: string;
  added_date: string;
};

export type VehicleOwnerDetails = {
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export function formatVehicleTitle(vehicle: Vehicle) {
  return `${vehicle.make} ${vehicle.model}${vehicle.year ? `, ${vehicle.year}` : ""}`;
}

export function formatVehicleMeta(vehicle: Vehicle, details: VehicleUiDetails) {
  const lines: string[] = [];

  if (details.mileage) {
    lines.push(`Mileage: ${details.mileage} km`);
  }

  if (details.last_service_date) {
    lines.push(`Last Service: ${details.last_service_date}`);
  }

  if (details.added_date) {
    lines.push(`Added: ${details.added_date}`);
  }

  if (vehicle.vin) {
    lines.push(`VIN: ${vehicle.vin}`);
  }

  if (vehicle.color) {
    lines.push(`Color: ${vehicle.color}`);
  }

  return lines;
}
