BEGIN;

-- Services
INSERT INTO services (name, description, is_active, created_at, updated_at)
VALUES
    ('Oil change',                    'Engine oil replacement with filter swap and top-up of all fluids.', true, NOW(), NOW()),
    ('Full vehicle diagnostics',      'Computer diagnostics of all ECU modules with fault code report.', true, NOW(), NOW()),
    ('Tire service',                  'Tire mounting, balancing, and nitrogen inflation on all four wheels.', true, NOW(), NOW()),
    ('Brake system service',          'Inspection, pad replacement, disc resurfacing or replacement.', true, NOW(), NOW()),
    ('Suspension & steering',         'Inspection and replacement of ball joints, tie rods, shock absorbers.', true, NOW(), NOW()),
    ('Timing belt / chain replacement','Complete kit replacement including water pump and tensioners.', true, NOW(), NOW()),
    ('AC service',                    'Refrigerant re-gas, leak check, condenser and evaporator inspection.', true, NOW(), NOW()),
    ('Engine repair',                 'Cylinder head gasket, valve adjustment, engine overhaul.', true, NOW(), NOW()),
    ('Transmission service',          'Fluid change, clutch replacement, gearbox inspection.', true, NOW(), NOW()),
    ('Electrical diagnostics',        'Battery, alternator, starter, ECU and wiring fault diagnosis.', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Customers
INSERT INTO customers (full_name, phone, email, notes, assigned_to_id, created_at, updated_at)
VALUES
    ('Oleksandr Kovalenko',  '+380501234567', 'o.kovalenko@gmail.com',      'Preferred contact time: mornings.', NULL, NOW(), NOW()),
    ('Iryna Marchenko',      '+380672345678', 'i.marchenko@ukr.net',        'Requests SMS notifications for every status change.', NULL, NOW(), NOW()),
    ('Vasyl Petrenko',       '+380933456789', 'v.petrenko@meta.ua',         'Corporate client — invoices to FOP Petrenko V.S.', NULL, NOW(), NOW()),
    ('Mykola Savchenko',     '+380501112233', 'm.savchenko@ukr.net',        'Regular client since 2022. Prefers OEM parts only.', NULL, NOW(), NOW()),
    ('Oksana Bondarenko',    '+380672223344', 'oksana.bondarenko@gmail.com','Requests full written report after each service.', NULL, NOW(), NOW()),
    ('Dmytro Hrytsenko',     '+380933334455', 'd.hrytsenko@i.ua',           'Fleet of 2 vehicles. Invoices to TOV Hrytsenko Trans.', NULL, NOW(), NOW()),
    ('Natalia Kovalchuk',    '+380504445566', 'natalia.kovalchuk@gmail.com','Prefers appointments on weekends.', NULL, NOW(), NOW()),
    ('Andrii Shevchenko',    '+380675556677', 'a.shevchenko@meta.ua',       'Knowledgeable about cars, prefers technical explanations.', NULL, NOW(), NOW()),
    ('Larysa Tkachenko',     '+380936667788', 'l.tkachenko@ukr.net',        'Elderly client, needs simple explanations. Call before visit.', NULL, NOW(), NOW()),
    ('Serhii Melnychenko',   '+380507778899', 's.melnychenko@gmail.com',    'Sports car enthusiast. Uses premium fluids only.', NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Vehicles
INSERT INTO vehicles (customer_id, license_plate, make, model, year, vin, color, notes, mileage, last_service_date, added_date, created_at, updated_at)
VALUES
    -- Oleksandr Kovalenko
    (
        (SELECT id FROM customers WHERE phone = '+380501234567'),
        'AA 1234 BB', 'Toyota', 'Camry', 2019, 'JTDBE30K993056210', 'Silver',
        'Towbar installed aftermarket.', 87400, '2024-09-15', '2024-01-10', NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380501234567'),
        'AA 9876 CC', 'Ford', 'Focus', 2017, 'WF0EXXGCDE7R12345', 'Black',
        'Second car, rarely driven.', 54200, '2024-06-01', '2024-03-22', NOW(), NOW()
    ),
    -- Iryna Marchenko
    (
        (SELECT id FROM customers WHERE phone = '+380672345678'),
        'KA 4321 EE', 'BMW', '3 Series', 2021, 'WBA8E9G53LNU12345', 'White',
        'Sport package, 19'' alloys.', 31000, '2025-01-20', '2024-07-05', NOW(), NOW()
    ),
    -- Vasyl Petrenko
    (
        (SELECT id FROM customers WHERE phone = '+380933456789'),
        'BH 5566 FF', 'Volkswagen', 'Passat', 2018, 'WVWZZZ3CZJE123456', 'Grey',
        'Company vehicle, requires VAT invoice.', 112000, '2024-11-03', '2023-11-30', NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380933456789'),
        'BH 7788 GG', 'Renault', 'Megane', 2015, 'VF1BM0H0H56123456', 'Blue',
        'Known issue: AC compressor noise at idle.', 148500, '2024-08-12', '2023-11-30', NOW(), NOW()
    ),
    -- Mykola Savchenko
    (
        (SELECT id FROM customers WHERE phone = '+380501112233'),
        'AA 2233 HH', 'Toyota', 'Corolla', 2020, 'JTDBU4EE9AJ123456', 'Pearl White',
        'OEM parts only. Extended warranty active until 2026.', 42500, '2025-02-28', '2022-05-14', NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380501112233'),
        'AA 4455 KK', 'Mazda', '6', 2018, 'JM1GJ1V56H1123456', 'Soul Red Crystal',
        'Winter and summer tyre sets stored at workshop.', 78200, '2025-01-10', '2022-05-14', NOW(), NOW()
    ),
    -- Oksana Bondarenko
    (
        (SELECT id FROM customers WHERE phone = '+380672223344'),
        'KA 8899 MM', 'Hyundai', 'Tucson', 2022, 'KMHJ341AANU123456', 'Phantom Black',
        'Full service history on file. Prefers Mobil 1 oil.', 18700, '2025-03-15', '2023-01-20', NOW(), NOW()
    ),
    -- Dmytro Hrytsenko
    (
        (SELECT id FROM customers WHERE phone = '+380933334455'),
        'BH 1122 PP', 'Volkswagen', 'Transporter', 2019, 'WV1ZZZ7HZKH123456', 'White',
        'Cargo van. Fleet vehicle — invoice to TOV.', 195000, '2024-12-20', '2021-03-08', NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380933334455'),
        'BH 3344 RR', 'Ford', 'Transit', 2017, 'WF0XXXTTGXHR12345', 'White',
        'Second fleet van. High mileage, inspect carefully before service.', 231000, '2024-10-05', '2021-03-08', NOW(), NOW()
    ),
    -- Natalia Kovalchuk
    (
        (SELECT id FROM customers WHERE phone = '+380504445566'),
        'AA 6677 SS', 'Kia', 'Sportage', 2021, 'KNAPM811XL7123456', 'Snow White Pearl',
        'Leased vehicle — no major bodywork without prior approval.', 29300, '2025-02-10', '2023-08-25', NOW(), NOW()
    ),
    -- Andrii Shevchenko
    (
        (SELECT id FROM customers WHERE phone = '+380675556677'),
        'KA 9900 TT', 'Subaru', 'Outback', 2020, 'JF1BS9LZ3LH123456', 'Magnetite Grey',
        'AWD. Symmetrical 4WD service intervals required.', 61400, '2025-01-28', '2022-11-03', NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380675556677'),
        'KA 1357 UU', 'Mitsubishi', 'Eclipse Cross', 2019, 'JA4AT4AA4KZ123456', 'Red Diamond',
        'Recently imported. First service at this workshop.', 53800, '2024-11-22', '2024-09-17', NOW(), NOW()
    ),
    -- Larysa Tkachenko
    (
        (SELECT id FROM customers WHERE phone = '+380936667788'),
        'AA 2468 VV', 'Skoda', 'Octavia', 2016, 'TMBAF7NE2G0123456', 'Brillant Silver',
        'Senior owner. Call ahead to explain all findings clearly.', 102300, '2024-09-30', '2020-06-15', NOW(), NOW()
    ),
    -- Serhii Melnychenko
    (
        (SELECT id FROM customers WHERE phone = '+380507778899'),
        'BH 9876 WW', 'Honda', 'Civic Type R', 2022, 'SHHFK8G70NU123456', 'Championship White',
        'Track day car. Uses Shell Helix Ultra 0W-20 only.', 24600, '2025-03-01', '2023-04-12', NOW(), NOW()
    ),
    (
        (SELECT id FROM customers WHERE phone = '+380507778899'),
        'BH 1111 XX', 'Nissan', '370Z', 2018, 'JN1AZ4EH8JM123456', 'Magnetic Black',
        'Weekend car. Recently fitted coilover suspension.', 38900, '2024-07-20', '2023-04-12', NOW(), NOW()
    )
ON CONFLICT (license_plate) DO NOTHING;

-- Repairs
INSERT INTO repairs (vehicle_id, master_id, service_name, issue_notes, status, tracking_code, completed_at, mileage_at_service, created_at, updated_at)
VALUES
    -- AA 1234 BB — Toyota Camry (Kovalenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'), NULL,
        'Oil change + filter replacement',
        'Scheduled maintenance at 87 400 km. Customer requests synthetic 5W-40.',
        'completed', 'TOR-1001', '2025-02-10', 87400,
        '2025-02-10 09:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'), NULL,
        'Tire rotation and balancing',
        'Routine rotation at customer request. Rear tires moved to front.',
        'new', 'TOR-1006', NULL, NULL,
        '2025-03-25 09:15:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'), NULL,
        'Brake fluid replacement',
        'Fluid over 2 years old. DOT 4 replacement as per schedule.',
        'completed', 'TOR-2001', '2024-08-22', 81200,
        '2024-08-22 10:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'), NULL,
        'Full vehicle diagnostics',
        'Pre-purchase inspection for customer. No fault codes found.',
        'completed', 'TOR-2002', '2024-01-12', 74500,
        '2024-01-12 09:00:00+00', NOW()
    ),
    -- AA 9876 CC — Ford Focus (Kovalenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 9876 CC'), NULL,
        'Brake pad replacement — front axle',
        'Customer reports squealing on light braking. Front pads worn to 2 mm.',
        'completed', 'TOR-1002', '2025-02-19', 54200,
        '2025-02-18 11:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 9876 CC'), NULL,
        'Oil change',
        'Scheduled oil change 5W-30. Air filter also replaced.',
        'completed', 'TOR-2003', '2024-05-30', 50100,
        '2024-05-30 08:45:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 9876 CC'), NULL,
        'Suspension inspection',
        'Clunking noise from front right on bumps. Stabiliser link worn — replaced.',
        'completed', 'TOR-2004', '2023-11-14', 46800,
        '2023-11-14 13:00:00+00', NOW()
    ),
    -- KA 4321 EE — BMW 3 Series (Marchenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 4321 EE'), NULL,
        'Engine diagnostics',
        'Check engine light on. Fault codes P0171 and P0174 stored.',
        'in_progress', 'TOR-1003', NULL, 31000,
        '2025-03-05 10:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 4321 EE'), NULL,
        'Oil change — BMW LL-04',
        'Scheduled at 30 000 km. Castrol Magnatec Professional replaced.',
        'completed', 'TOR-2005', '2025-01-18', 30000,
        '2025-01-18 10:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 4321 EE'), NULL,
        'Tire service — winter set',
        'Mounted winter Michelin Pilot Alpin. Balancing done on all 4 wheels.',
        'completed', 'TOR-2006', '2024-11-04', 26400,
        '2024-11-04 11:30:00+00', NOW()
    ),
    -- BH 5566 FF — VW Passat (Petrenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 5566 FF'), NULL,
        'Timing belt + water pump replacement',
        'Manufacturer interval exceeded. Belt shows visible cracking.',
        'waiting_parts', 'TOR-1004', NULL, NULL,
        '2025-03-12 08:45:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 5566 FF'), NULL,
        'Oil change + air filter',
        'Longlife service 10W-40. DPF regeneration performed.',
        'completed', 'TOR-2007', '2024-10-30', 108500,
        '2024-10-30 09:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 5566 FF'), NULL,
        'Brake discs + pads — rear axle',
        'Rear discs corroded below minimum thickness. Full rear brake kit replaced.',
        'completed', 'TOR-2008', '2024-04-17', 103200,
        '2024-04-17 08:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 5566 FF'), NULL,
        'EGR valve cleaning',
        'DPF warning light. EGR valve heavily sooted — cleaned, not replaced.',
        'completed', 'TOR-2009', '2023-09-05', 96400,
        '2023-09-05 10:15:00+00', NOW()
    ),
    -- BH 7788 GG — Renault Megane (Petrenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 7788 GG'), NULL,
        'AC system diagnostics and re-gas',
        'AC blows warm air. Suspected refrigerant leak at condenser.',
        'in_progress', 'TOR-1005', NULL, NULL,
        '2025-03-20 14:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 7788 GG'), NULL,
        'Oil change + spark plugs',
        'Iridium spark plugs replaced at 145 000 km. Oil 5W-40 synthetic.',
        'completed', 'TOR-2010', '2024-08-10', 145000,
        '2024-08-10 09:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 7788 GG'), NULL,
        'Clutch replacement',
        'Slipping clutch at high rpm. Full clutch kit replaced including flywheel.',
        'completed', 'TOR-2011', '2023-12-20', 138700,
        '2023-12-20 08:00:00+00', NOW()
    ),
    -- AA 2233 HH — Toyota Corolla (Savchenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2233 HH'), NULL,
        'Oil change — Toyota Genuine 0W-20',
        'First service at our workshop. OEM filter and genuine Toyota oil.',
        'completed', 'TOR-2012', '2025-02-28', 42500,
        '2025-02-28 10:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2233 HH'), NULL,
        'Brake system inspection',
        'All four discs and pads measured. Front pads at 4 mm — advised replacement within 10 000 km.',
        'completed', 'TOR-2013', '2024-10-15', 38000,
        '2024-10-15 11:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2233 HH'), NULL,
        'Tire service — winter set',
        'Seasonal tyre swap to Bridgestone Blizzak WS80. All TPMS sensors calibrated.',
        'completed', 'TOR-2014', '2024-11-08', 38900,
        '2024-11-08 09:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2233 HH'), NULL,
        'Oil change — Toyota Genuine 0W-20',
        'Scheduled at 34 000 km. Genuine Toyota 0W-20 oil and filter.',
        'completed', 'TOR-2015', '2024-02-20', 34000,
        '2024-02-20 10:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2233 HH'), NULL,
        'Full vehicle diagnostics',
        'Annual inspection. No fault codes. All systems nominal.',
        'completed', 'TOR-2016', '2023-06-10', 27500,
        '2023-06-10 09:00:00+00', NOW()
    ),
    -- AA 4455 KK — Mazda 6 (Savchenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 4455 KK'), NULL,
        'Oil change + cabin filter',
        'Mazda 5W-30 oil change at 78 000 km. Cabin filter heavily clogged — replaced.',
        'completed', 'TOR-2017', '2025-01-10', 78200,
        '2025-01-10 11:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 4455 KK'), NULL,
        'Front suspension — ball joints',
        'Knocking from both front wheels. Both lower ball joints replaced.',
        'completed', 'TOR-2018', '2024-07-22', 73500,
        '2024-07-22 08:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 4455 KK'), NULL,
        'Tire service — summer set',
        'Switched back to summer Goodyear Eagle F1. Wheel alignment checked.',
        'completed', 'TOR-2019', '2024-04-03', 70200,
        '2024-04-03 10:15:00+00', NOW()
    ),
    -- KA 8899 MM — Hyundai Tucson (Bondarenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 8899 MM'), NULL,
        'Oil change — Hyundai Genuine 5W-30',
        'First service at workshop. Hyundai Genuine oil and OEM filter.',
        'completed', 'TOR-2046', '2025-03-15', 18700,
        '2025-03-15 10:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 8899 MM'), NULL,
        'Tire service — winter set',
        'Seasonal swap. TPMS sensor on rear left replaced (faulty unit).',
        'completed', 'TOR-2047', '2024-11-20', 15400,
        '2024-11-20 11:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 8899 MM'), NULL,
        'Full vehicle diagnostics',
        'Annual check. Software updated for BlueLink connectivity module.',
        'completed', 'TOR-2048', '2024-04-08', 10200,
        '2024-04-08 09:30:00+00', NOW()
    ),
    -- BH 1122 PP — VW Transporter (Hrytsenko fleet)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1122 PP'), NULL,
        'Oil change — 5W-30 commercial',
        'Scheduled commercial vehicle service at 195 000 km.',
        'completed', 'TOR-2020', '2024-12-18', 195000,
        '2024-12-18 07:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1122 PP'), NULL,
        'Brake pads — full axle replacement',
        'Both front and rear pads replaced. Discs within tolerance.',
        'completed', 'TOR-2021', '2024-08-14', 189000,
        '2024-08-14 08:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1122 PP'), NULL,
        'Timing belt kit',
        'Belt, water pump, and tensioner replaced at manufacturer interval.',
        'completed', 'TOR-2022', '2023-11-28', 180000,
        '2023-11-28 07:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1122 PP'), NULL,
        'Transmission fluid change',
        'Manual gearbox fluid replaced. Minor synchromesh wear noted on 3rd gear.',
        'completed', 'TOR-2023', '2023-04-10', 170500,
        '2023-04-10 08:30:00+00', NOW()
    ),
    -- BH 3344 RR — Ford Transit (Hrytsenko fleet)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 3344 RR'), NULL,
        'Oil change + air filter',
        '5W-30 commercial oil. Air filter saturated with dust — replaced.',
        'completed', 'TOR-2024', '2024-10-03', 231000,
        '2024-10-03 07:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 3344 RR'), NULL,
        'EGR valve + DPF cleaning',
        'Power loss complaint. DPF 90% blocked. Forced regeneration + EGR cleaned.',
        'completed', 'TOR-2025', '2024-03-19', 224000,
        '2024-03-19 08:00:00+00', NOW()
    ),
    -- AA 6677 SS — Kia Sportage (Kovalchuk)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 6677 SS'), NULL,
        'Oil change — 5W-30',
        'First scheduled service at 29 000 km. OEM Kia oil and filter.',
        'completed', 'TOR-2026', '2025-02-10', 29300,
        '2025-02-10 10:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 6677 SS'), NULL,
        'Tire service — winter set',
        'Seasonal swap and balancing. TPMS sensors all reading correctly.',
        'completed', 'TOR-2027', '2024-11-12', 26100,
        '2024-11-12 11:00:00+00', NOW()
    ),
    -- KA 9900 TT — Subaru Outback (Shevchenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 9900 TT'), NULL,
        'Oil change — Subaru 0W-20',
        'Genuine Subaru SOPUS 0W-20. Drain plug washer replaced.',
        'completed', 'TOR-2028', '2025-01-28', 61400,
        '2025-01-28 10:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 9900 TT'), NULL,
        'Front differential fluid change',
        'AWD fluid service at 60 000 km as per Subaru schedule.',
        'completed', 'TOR-2029', '2025-01-28', 61400,
        '2025-01-28 12:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 9900 TT'), NULL,
        'Brake service — rear axle',
        'Rear brake pads replaced. Electronic parking brake reset performed.',
        'completed', 'TOR-2030', '2024-07-15', 55800,
        '2024-07-15 09:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 9900 TT'), NULL,
        'Full vehicle diagnostics + software update',
        'Annual check. Eyesight camera calibration after windscreen replacement.',
        'completed', 'TOR-2031', '2023-10-20', 48200,
        '2023-10-20 10:00:00+00', NOW()
    ),
    -- KA 1357 UU — Mitsubishi Eclipse Cross (Shevchenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 1357 UU'), NULL,
        'Full vehicle diagnostics — import inspection',
        'First visit. 12 minor fault codes cleared. CVT fluid level checked.',
        'completed', 'TOR-2032', '2024-11-22', 53800,
        '2024-11-22 09:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 1357 UU'), NULL,
        'Oil change + CVT fluid',
        'Both engine oil (0W-20) and CVT fluid replaced at import service.',
        'completed', 'TOR-2033', '2024-11-22', 53800,
        '2024-11-22 11:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'KA 1357 UU'), NULL,
        'Tire service — winter set',
        'Customer-supplied winter tyres mounted and balanced.',
        'new', 'TOR-2034', NULL, NULL,
        '2025-03-28 10:00:00+00', NOW()
    ),
    -- AA 2468 VV — Skoda Octavia (Tkachenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2468 VV'), NULL,
        'Oil change + all filters',
        'Engine oil, air, cabin, and fuel filter all replaced. Longlife service.',
        'completed', 'TOR-2035', '2024-09-28', 102300,
        '2024-09-28 09:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2468 VV'), NULL,
        'Spark plug replacement',
        'Original NGK spark plugs replaced at 100 000 km as per schedule.',
        'completed', 'TOR-2036', '2024-05-06', 100000,
        '2024-05-06 10:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2468 VV'), NULL,
        'Coolant system flush',
        'Coolant discoloured and acidic. Full system flush with new G12+ coolant.',
        'completed', 'TOR-2037', '2023-08-21', 94700,
        '2023-08-21 09:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2468 VV'), NULL,
        'Front brake discs + pads',
        'Pulsation under braking. Both front discs below min thickness — replaced.',
        'completed', 'TOR-2038', '2023-01-30', 88500,
        '2023-01-30 08:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2468 VV'), NULL,
        'Rear shock absorber replacement',
        'Both rear Sachs shock absorbers replaced. Rattling over bumps eliminated.',
        'completed', 'TOR-2039', '2022-06-15', 81000,
        '2022-06-15 10:00:00+00', NOW()
    ),
    -- BH 9876 WW — Honda Civic Type R (Melnychenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 9876 WW'), NULL,
        'Oil change — Shell Helix Ultra 0W-20',
        'Track prep service. Engine oil and filter only, as owner specified.',
        'completed', 'TOR-2040', '2025-03-01', 24600,
        '2025-03-01 09:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 9876 WW'), NULL,
        'Brake fluid flush — Motul RBF 660',
        'High-temp racing brake fluid for track use. Full system bleed.',
        'completed', 'TOR-2041', '2025-03-01', 24600,
        '2025-03-01 10:30:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 9876 WW'), NULL,
        'Alignment check — track setup',
        'Corner weights and 4-wheel alignment set to customer track specification.',
        'completed', 'TOR-2042', '2024-08-10', 19500,
        '2024-08-10 11:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 9876 WW'), NULL,
        'Oil change — post track day',
        'Post-track service. Metal particles visible in oil sample — monitoring.',
        'completed', 'TOR-2043', '2024-05-20', 17200,
        '2024-05-20 09:00:00+00', NOW()
    ),
    -- BH 1111 XX — Nissan 370Z (Melnychenko)
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1111 XX'), NULL,
        'Coilover installation + alignment',
        'Customer-supplied BC Racing coilovers fitted. Full 4-wheel alignment.',
        'completed', 'TOR-2044', '2024-07-18', 38900,
        '2024-07-18 08:00:00+00', NOW()
    ),
    (
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1111 XX'), NULL,
        'Oil change — Motul 8100 0W-40',
        'Premium synthetic as per owner request. K&N high-flow oil filter.',
        'completed', 'TOR-2045', '2024-02-14', 35600,
        '2024-02-14 10:00:00+00', NOW()
    )
ON CONFLICT (tracking_code) DO NOTHING;

-- Suppliers
INSERT INTO suppliers (name, nip, phone, email, notes, created_at, updated_at)
VALUES
    ('AutoParts Sp. z o.o.', '5213456789', '+48221234567', 'orders@autoparts.pl',  'Main parts supplier. Net 14 payment terms.', NOW(), NOW()),
    ('MotoTrade S.A.',       '6789012345', '+48223456789', 'sales@mototrade.pl',    'Oil and consumables specialist. Free delivery above 500 PLN.', NOW(), NOW()),
    ('LKQ Euro Car Parts',   '9871234560', '+48222987654', 'ukraine@lkq.eu',        'Wide OEM and aftermarket range. 24h delivery to Kyiv.', NOW(), NOW()),
    ('Gates Distribution',   '4561237890', '+48221357924', 'orders@gates-dist.pl', 'Belt kits, water pumps, and tensioners specialist.', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Purchases
INSERT INTO purchases (order_date, approximate_delivery_date, supplier_id, vehicle_id, part_name, quantity, purchase_price, sale_price, repair_code, invoice_name, invoice_url, created_at, updated_at)
VALUES
    (
        '2025-02-08', '2025-02-09',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'),
        'Bosch Engine Oil Filter — 0 451 103 314',
        1, 28.50, 45.00, 'TOR-1001', 'FV/2025/02/0081', '', NOW(), NOW()
    ),
    (
        '2025-02-08', '2025-02-09',
        (SELECT id FROM suppliers WHERE name = 'MotoTrade S.A.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 1234 BB'),
        'Castrol EDGE 5W-40 — 5L',
        2, 89.00, 130.00, 'TOR-1001', 'FV/2025/02/0082', '', NOW(), NOW()
    ),
    (
        '2025-02-16', '2025-02-17',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 9876 CC'),
        'TRW Front Brake Pad Set — GDB1794',
        1, 112.00, 165.00, 'TOR-1002', 'FV/2025/02/0095', '', NOW(), NOW()
    ),
    (
        '2025-03-13', '2025-03-18',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'BH 5566 FF'),
        'Gates PowerGrip Timing Belt Kit — K015633XS',
        1, 380.00, 540.00, 'TOR-1004', 'FV/2025/03/0134', '', NOW(), NOW()
    ),
    (
        '2025-02-27', '2025-02-28',
        (SELECT id FROM suppliers WHERE name = 'MotoTrade S.A.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2233 HH'),
        'Toyota Genuine Engine Oil 0W-20 — 4L',
        1, 72.00, 105.00, 'TOR-2012', 'FV/2025/02/0201', '', NOW(), NOW()
    ),
    (
        '2025-02-27', '2025-02-28',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 2233 HH'),
        'Toyota OEM Oil Filter — 90915-YZZF2',
        1, 18.00, 28.00, 'TOR-2012', 'FV/2025/02/0202', '', NOW(), NOW()
    ),
    (
        '2024-12-17', '2024-12-18',
        (SELECT id FROM suppliers WHERE name = 'MotoTrade S.A.'),
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1122 PP'),
        'Castrol Vecton 5W-30 Long Drain — 5L',
        2, 76.00, 115.00, 'TOR-2020', 'FV/2024/12/0445', '', NOW(), NOW()
    ),
    (
        '2024-07-20', '2024-07-22',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 4455 KK'),
        'Mazda Lower Ball Joint Front — B25D-34-350',
        2, 145.00, 210.00, 'TOR-2018', 'FV/2024/07/0318', '', NOW(), NOW()
    ),
    (
        '2025-02-28', '2025-03-01',
        (SELECT id FROM suppliers WHERE name = 'MotoTrade S.A.'),
        (SELECT id FROM vehicles WHERE license_plate = 'BH 9876 WW'),
        'Shell Helix Ultra ECT C2/C3 0W-30 — 4L',
        1, 95.00, 145.00, 'TOR-2040', 'FV/2025/02/0290', '', NOW(), NOW()
    ),
    (
        '2025-02-28', '2025-03-01',
        (SELECT id FROM suppliers WHERE name = 'LKQ Euro Car Parts'),
        (SELECT id FROM vehicles WHERE license_plate = 'BH 9876 WW'),
        'Motul RBF 660 Brake Fluid — 500ml',
        2, 58.00, 85.00, 'TOR-2041', 'FV/2025/02/0291', '', NOW(), NOW()
    ),
    (
        '2024-07-16', '2024-07-18',
        (SELECT id FROM suppliers WHERE name = 'LKQ Euro Car Parts'),
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1111 XX'),
        'BC Racing BR Series Coilover Kit — Nissan 370Z',
        1, 1850.00, 2400.00, 'TOR-2044', 'FV/2024/07/0290', '', NOW(), NOW()
    ),
    (
        '2023-11-25', '2023-11-27',
        (SELECT id FROM suppliers WHERE name = 'Gates Distribution'),
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1122 PP'),
        'Gates PowerGrip Timing Belt Kit — TCD1145',
        1, 420.00, 590.00, 'TOR-2022', 'FV/2023/11/0511', '', NOW(), NOW()
    ),
    (
        '2024-08-12', '2024-08-14',
        (SELECT id FROM suppliers WHERE name = 'AutoParts Sp. z o.o.'),
        (SELECT id FROM vehicles WHERE license_plate = 'BH 1122 PP'),
        'Brembo Front Brake Pad Set — P 85 091',
        2, 98.00, 145.00, 'TOR-2021', 'FV/2024/08/0380', '', NOW(), NOW()
    ),
    (
        '2024-07-20', '2024-07-21',
        (SELECT id FROM suppliers WHERE name = 'LKQ Euro Car Parts'),
        (SELECT id FROM vehicles WHERE license_plate = 'AA 4455 KK'),
        'Sachs Rear Shock Absorber — 316 508',
        2, 178.00, 260.00, 'TOR-2039', 'FV/2024/07/0291', '', NOW(), NOW()
    );

-- Sequence resets
SELECT setval(pg_get_serial_sequence('services',  'id'), MAX(id)) FROM services;
SELECT setval(pg_get_serial_sequence('customers', 'id'), MAX(id)) FROM customers;
SELECT setval(pg_get_serial_sequence('vehicles',  'id'), MAX(id)) FROM vehicles;
SELECT setval(pg_get_serial_sequence('repairs',   'id'), MAX(id)) FROM repairs;
SELECT setval(pg_get_serial_sequence('suppliers', 'id'), MAX(id)) FROM suppliers;
SELECT setval(pg_get_serial_sequence('purchases', 'id'), MAX(id)) FROM purchases;

COMMIT;
