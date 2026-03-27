BEGIN;

-- Services
INSERT INTO services (name, description, is_active, created_at, updated_at)
VALUES
    ('Oil change', 'Engine oil replacement with filter swap and top-up of all fluids.', true, NOW(), NOW()),
    ('Full vehicle diagnostics', 'Computer diagnostics of all ECU modules with fault code report.', true, NOW(), NOW()),
    ('Tire service', 'Tire mounting, balancing, and nitrogen inflation on all four wheels.', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Customers
INSERT INTO customers (full_name, phone, email, notes, assigned_to_id, created_at, updated_at)
VALUES
    ('Oleksandr Kovalenko', '+380501234567', 'o.kovalenko@gmail.com', 'Preferred contact time: mornings.', NULL, NOW(), NOW()),
    ('Iryna Marchenko',     '+380672345678', 'i.marchenko@ukr.net',   'Requests SMS notifications for every status change.', NULL, NOW(), NOW()),
    ('Vasyl Petrenko',      '+380933456789', 'v.petrenko@meta.ua',    'Corporate client — invoices to FOP Petrenko V.S.', NULL, NOW(), NOW());

-- Vehicles (customer references resolved by subquery)
INSERT INTO vehicles (customer_id, license_plate, make, model, year, vin, color, notes, mileage, last_service_date, added_date, created_at, updated_at)
VALUES
    (
        (SELECT id FROM customers WHERE phone = '+380501234567'),
        'AA 1234 BB', 'Toyota', 'Camry', 2019,
        'JTDBE30K993056210', 'Silver',
        'Towbar installed aftermarket.', 87400, '2024-09-15', '2024-01-10',
        NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380501234567'),
        'AA 9876 CC', 'Ford', 'Focus', 2017,
        'WF0EXXGCDE7R12345', 'Black',
        'Second car, rarely driven.', 54200, '2024-06-01', '2024-03-22',
        NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380672345678'),
        'KA 4321 EE', 'BMW', '3 Series', 2021,
        'WBA8E9G53LNU12345', 'White',
        'Sport package, 19'' alloys.', 31000, '2025-01-20', '2024-07-05',
        NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380933456789'),
        'BH 5566 FF', 'Volkswagen', 'Passat', 2018,
        'WVWZZZ3CZJE123456', 'Grey',
        'Company vehicle, requires VAT invoice.', 112000, '2024-11-03', '2023-11-30',
        NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380933456789'),
        'BH 7788 GG', 'Renault', 'Megane', 2015,
        'VF1BM0H0H56123456', 'Blue',
        'Known issue: AC compressor noise at idle.', 148500, '2024-08-12', '2023-11-30',
        NOW(), NOW()
    )
ON CONFLICT (license_plate) DO NOTHING;

-- Repairs
INSERT INTO repairs (vehicle_id, master_id, service_name, issue_notes, status, tracking_code, created_at, updated_at)
VALUES
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'),
        NULL,
        'Oil change + filter replacement',
        'Scheduled maintenance at 87 400 km. Customer requests synthetic 5W-40.',
        'completed', 'TOR-1001',
        '2025-02-10 09:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 9876 CC'),
        NULL,
        'Brake pad replacement — front axle',
        'Customer reports squealing on light braking. Front pads worn to 2 mm.',
        'completed', 'TOR-1002',
        '2025-02-18 11:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 4321 EE'),
        NULL,
        'Engine diagnostics',
        'Check engine light on. Fault codes P0171 and P0174 stored.',
        'in_progress', 'TOR-1003',
        '2025-03-05 10:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 5566 FF'),
        NULL,
        'Timing belt + water pump replacement',
        'Manufacturer interval exceeded. Belt shows visible cracking.',
        'waiting_parts', 'TOR-1004',
        '2025-03-12 08:45:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 7788 GG'),
        NULL,
        'AC system diagnostics and re-gas',
        'AC blows warm air. Suspected refrigerant leak at condenser.',
        'in_progress', 'TOR-1005',
        '2025-03-20 14:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'),
        NULL,
        'Tire rotation and balancing',
        'Routine rotation at customer request. Rear tires moved to front.',
        'new', 'TOR-1006',
        '2025-03-25 09:15:00+00', NOW()
    )
ON CONFLICT (tracking_code) DO NOTHING;

-- Suppliers
INSERT INTO suppliers (name, nip, phone, email, notes, created_at, updated_at)
VALUES
    ('AutoParts Sp. z o.o.', '5213456789', '+48221234567', 'orders@autoparts.pl', 'Main parts supplier. Net 14 payment terms.', NOW(), NOW()),
    ('MotoTrade S.A.',       '6789012345', '+48223456789', 'sales@mototrade.pl',   'Oil and consumables specialist. Free delivery above 500 PLN.', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Purchases
INSERT INTO purchases (order_date, approximate_delivery_date, supplier_id, vehicle_id, part_name, quantity, purchase_price, sale_price, repair_code, invoice_name, invoice_url, created_at, updated_at)
VALUES
    (
        '2025-02-08', '2025-02-09',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'),
        'Bosch Engine Oil Filter — 0 451 103 314',
        1, 28.50, 45.00, 'TOR-1001', 'FV/2025/02/0081', '',
        NOW(), NOW()
    ),
    (
        '2025-02-08', '2025-02-09',
        (SELECT id FROM suppliers WHERE name = 'MotoTrade S.A.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'),
        'Castrol EDGE 5W-40 — 5L',
        2, 89.00, 130.00, 'TOR-1001', 'FV/2025/02/0082', '',
        NOW(), NOW()
    ),
    (
        '2025-02-16', '2025-02-17',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 9876 CC'),
        'TRW Front Brake Pad Set — GDB1794',
        1, 112.00, 165.00, 'TOR-1002', 'FV/2025/02/0095', '',
        NOW(), NOW()
    ),
    (
        '2025-03-13', '2025-03-18',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'BH 5566 FF'),
        'Gates PowerGrip Timing Belt Kit — K015633XS',
        1, 380.00, 540.00, 'TOR-1004', 'FV/2025/03/0134', '',
        NOW(), NOW()
    );

-- Sequence resets
SELECT setval(pg_get_serial_sequence('services',  'id'), MAX(id)) FROM services;
SELECT setval(pg_get_serial_sequence('customers', 'id'), MAX(id)) FROM customers;
SELECT setval(pg_get_serial_sequence('vehicles',  'id'), MAX(id)) FROM vehicles;
SELECT setval(pg_get_serial_sequence('repairs',   'id'), MAX(id)) FROM repairs;
SELECT setval(pg_get_serial_sequence('suppliers', 'id'), MAX(id)) FROM suppliers;
SELECT setval(pg_get_serial_sequence('purchases', 'id'), MAX(id)) FROM purchases;

COMMIT;
