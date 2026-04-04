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

export type VehicleListGroup = {
  key: string;
  label: string;
  vehicles: Vehicle[];
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

export function formatVehicleDisplayDate(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!match) {
    return value;
  }

  const [, year, month, day, time] = match;
  return time ? `${day}-${month}-${year} ${time}` : `${day}-${month}-${year}`;
}

export function formatVehicleTitle(vehicle: Vehicle) {
  return `${vehicle.make} ${vehicle.model}${vehicle.year ? `, ${vehicle.year}` : ""}`;
}

export function formatVehicleMeta(vehicle: Vehicle, details: VehicleUiDetails) {
  const lines: string[] = [];

  if (details.mileage) {
    lines.push(`Mileage: ${details.mileage} km`);
  }

  if (details.last_service_date) {
    lines.push(`Last Service: ${formatVehicleDisplayDate(details.last_service_date)}`);
  }

  if (details.added_date) {
    lines.push(`Added: ${formatVehicleDisplayDate(details.added_date)}`);
  }

  if (vehicle.vin) {
    lines.push(`VIN: ${vehicle.vin}`);
  }

  if (vehicle.color) {
    lines.push(`Color: ${vehicle.color}`);
  }

  return lines;
}
