-- Populate products table with sample data using correct category IDs
INSERT INTO products (
  title, description, price, image_url, category_id, product_type, 
  is_featured, is_bestseller, is_approved, average_rating, review_count,
  stock_quantity, sku, affiliate_link
) VALUES 

-- Power Tools Category
('Professional Engine Hoist 2 Ton', 'Heavy-duty engine hoist with adjustable boom for safe engine removal and installation', 299.99, 'https://picsum.photos/400/400?random=1', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', true, true, true, 4.5, 127, 15, 'ENG-HST-2T', 'https://example.com/affiliate/engine-hoist'),

('Engine Stand 1000lb Capacity', 'Rotating engine stand with heavy-duty steel construction for engine rebuilds', 189.99, 'https://picsum.photos/400/400?random=2', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', true, false, true, 4.7, 89, 22, 'ENG-STD-1K', 'https://example.com/affiliate/engine-stand'),

('Transmission Jack 1 Ton', 'Heavy-duty transmission jack with adjustable saddle and safety chains', 449.99, 'https://picsum.photos/400/400?random=10', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', true, true, true, 4.5, 112, 8, 'TRN-JACK-1T', 'https://example.com/affiliate/transmission-jack'),

('Pneumatic Lift Table', 'Air-powered lift table for heavy component service', 1299.99, 'https://picsum.photos/400/400?random=41', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', true, false, true, 4.7, 22, 4, 'GEN-LIFT-PNEU', 'https://example.com/affiliate/lift-table'),

('Air Impact Wrench 1/2"', 'High-torque pneumatic impact wrench for heavy-duty applications', 249.99, 'https://picsum.photos/400/400?random=26', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', false, true, true, 4.4, 234, 25, 'GEN-AIR-IMP', 'https://example.com/affiliate/air-impact'),

-- Hand Tools Category
('Professional Socket Set 200pc', 'Complete 200-piece socket set with ratchets and extensions', 349.99, 'https://picsum.photos/400/400?random=23', 'f2c628fd-abe2-43a1-ace8-75100837aef4', 'affiliate', true, true, true, 4.6, 445, 28, 'GEN-SOCK-200', 'https://example.com/affiliate/socket-set'),

('Torque Wrench Digital 150ft-lb', 'Digital torque wrench with audio and visual alerts', 189.99, 'https://picsum.photos/400/400?random=24', 'f2c628fd-abe2-43a1-ace8-75100837aef4', 'affiliate', true, true, true, 4.7, 312, 35, 'GEN-TOR-DIG', 'https://example.com/affiliate/torque-wrench'),

('Compression Tester Kit', 'Professional compression tester with multiple adapters for gas engines', 89.99, 'https://picsum.photos/400/400?random=3', 'f2c628fd-abe2-43a1-ace8-75100837aef4', 'affiliate', false, true, true, 4.3, 156, 45, 'ENG-COMP-KIT', 'https://example.com/affiliate/compression-tester'),

('Brake Bleeder Kit Professional', 'One-person brake bleeding kit with pressure tank and adapters', 199.99, 'https://picsum.photos/400/400?random=6', 'f2c628fd-abe2-43a1-ace8-75100837aef4', 'affiliate', true, true, true, 4.6, 203, 28, 'BRK-BLEED-PRO', 'https://example.com/affiliate/brake-bleeder'),

('Disc Brake Caliper Tool Set', 'Complete caliper piston compression tool set for disc brake service', 79.99, 'https://picsum.photos/400/400?random=7', 'f2c628fd-abe2-43a1-ace8-75100837aef4', 'affiliate', false, true, true, 4.4, 145, 35, 'BRK-CAL-SET', 'https://example.com/affiliate/caliper-tools'),

('Coil Spring Compressor', 'Heavy-duty coil spring compressor for safe strut service', 299.99, 'https://picsum.photos/400/400?random=14', 'f2c628fd-abe2-43a1-ace8-75100837aef4', 'affiliate', true, true, true, 4.6, 178, 12, 'SUS-SPR-COMP', 'https://example.com/affiliate/spring-compressor'),

('Ball Joint Press Kit', 'Universal ball joint press with adapters for most vehicles', 159.99, 'https://picsum.photos/400/400?random=15', 'f2c628fd-abe2-43a1-ace8-75100837aef4', 'affiliate', false, true, true, 4.3, 142, 25, 'SUS-BJ-PRESS', 'https://example.com/affiliate/ball-joint-press'),

('Wire Stripper Crimper Set', 'Professional wire stripper and crimper tool set', 89.99, 'https://picsum.photos/400/400?random=20', 'f2c628fd-abe2-43a1-ace8-75100837aef4', 'affiliate', false, true, true, 4.4, 156, 38, 'ELE-WIRE-SET', 'https://example.com/affiliate/wire-tools'),

-- Tools Category (General)
('Automotive Multimeter', 'Digital multimeter designed specifically for automotive diagnostics', 179.99, 'https://picsum.photos/400/400?random=18', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', true, true, true, 4.7, 267, 42, 'ELE-MULT-AUTO', 'https://example.com/affiliate/auto-multimeter'),

('OBD2 Scanner Professional', 'Professional OBD2 scanner with live data and coding functions', 399.99, 'https://picsum.photos/400/400?random=19', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', true, true, true, 4.8, 198, 15, 'ELE-OBD2-PRO', 'https://example.com/affiliate/obd2-scanner'),

('Mechanics Tool Chest 7-Drawer', 'Professional 7-drawer tool chest with ball-bearing slides', 599.99, 'https://picsum.photos/400/400?random=25', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', true, false, true, 4.5, 178, 12, 'GEN-CHEST-7D', 'https://example.com/affiliate/tool-chest'),

('Hydraulic Floor Jack 3-Ton', 'Low-profile hydraulic floor jack with rapid pump technology', 199.99, 'https://picsum.photos/400/400?random=27', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, true, true, 4.3, 389, 18, 'GEN-JACK-3T', 'https://example.com/affiliate/floor-jack'),

('Jack Stands 6-Ton Pair', 'Heavy-duty jack stands with ratcheting mechanism', 149.99, 'https://picsum.photos/400/400?random=28', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.6, 267, 32, 'GEN-STAND-6T', 'https://example.com/affiliate/jack-stands'),

('Creeper Professional', 'Padded professional creeper with headrest and tool tray', 129.99, 'https://picsum.photos/400/400?random=29', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.2, 156, 22, 'GEN-CREEP-PRO', 'https://example.com/affiliate/creeper'),

('Work Light LED 5000 Lumens', 'Professional LED work light with magnetic base and hook', 89.99, 'https://picsum.photos/400/400?random=30', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.4, 198, 45, 'GEN-LED-5K', 'https://example.com/affiliate/work-light'),

('Battery Load Tester', 'Digital battery load tester with printout capability', 229.99, 'https://picsum.photos/400/400?random=21', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.5, 89, 22, 'ELE-BAT-TEST', 'https://example.com/affiliate/battery-tester'),

('Circuit Tester Probe Set', 'LED circuit tester probe set for automotive electrical diagnosis', 45.99, 'https://picsum.photos/400/400?random=22', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.3, 178, 55, 'ELE-CIR-PROBE', 'https://example.com/affiliate/circuit-tester'),

('Engine Timing Light', 'Digital timing light with advance dial for precise ignition timing', 149.99, 'https://picsum.photos/400/400?random=4', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.4, 73, 18, 'ENG-TIM-DIG', 'https://example.com/affiliate/timing-light'),

('Valve Spring Compressor Set', 'Universal valve spring compressor tool set for overhead cam engines', 129.99, 'https://picsum.photos/400/400?random=5', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.2, 94, 12, 'ENG-VLV-COMP', 'https://example.com/affiliate/valve-compressor'),

('Brake Rotor Micrometer', 'Precision micrometer for measuring brake rotor thickness and runout', 159.99, 'https://picsum.photos/400/400?random=8', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', true, false, true, 4.8, 67, 14, 'BRK-MIC-ROT', 'https://example.com/affiliate/rotor-micrometer'),

('Brake Line Flaring Tool', 'Double flaring tool kit for brake line repairs and custom installations', 119.99, 'https://picsum.photos/400/400?random=9', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.3, 88, 19, 'BRK-FLARE-KIT', 'https://example.com/affiliate/flaring-tool'),

-- Oils & Fluids Category
('ATF Fluid Exchange Machine', 'Professional automatic transmission fluid exchanger with display', 2299.99, 'https://picsum.photos/400/400?random=11', 'dfe4d741-4e1a-4c2e-8a4c-448d64ca3700', 'affiliate', true, false, true, 4.7, 34, 3, 'TRN-ATF-EXCH', 'https://example.com/affiliate/atf-exchanger'),

('Transmission Funnel Set', 'Flexible transmission funnel set with multiple adapters', 29.99, 'https://picsum.photos/400/400?random=12', 'dfe4d741-4e1a-4c2e-8a4c-448d64ca3700', 'affiliate', false, true, true, 4.2, 234, 67, 'TRN-FUN-SET', 'https://example.com/affiliate/transmission-funnel'),

('Brake Fluid Tester', 'Digital brake fluid moisture tester', 69.99, 'https://picsum.photos/400/400?random=47', 'dfe4d741-4e1a-4c2e-8a4c-448d64ca3700', 'affiliate', false, false, true, 4.3, 123, 32, 'BRK-FLUID-TEST', 'https://example.com/affiliate/fluid-tester'),

('Coolant System Tester', 'Pressure tester for cooling system diagnostics', 149.99, 'https://picsum.photos/400/400?random=48', 'dfe4d741-4e1a-4c2e-8a4c-448d64ca3700', 'affiliate', false, false, true, 4.5, 87, 21, 'ENG-COOL-TEST', 'https://example.com/affiliate/coolant-tester'),

('Fuel Pressure Tester Kit', 'Universal fuel pressure testing kit with gauges', 189.99, 'https://picsum.photos/400/400?random=49', 'dfe4d741-4e1a-4c2e-8a4c-448d64ca3700', 'affiliate', false, false, true, 4.4, 76, 18, 'ENG-FUEL-PRESS', 'https://example.com/affiliate/fuel-pressure'),

('Manual Transmission Oil Pump', 'Hand pump for manual transmission oil changes', 69.99, 'https://picsum.photos/400/400?random=36', 'dfe4d741-4e1a-4c2e-8a4c-448d64ca3700', 'affiliate', false, false, true, 4.1, 87, 23, 'TRN-OIL-PUMP', 'https://example.com/affiliate/oil-pump'),

-- Consumables Category
('CVT Belt Puller Tool', 'Specialized puller for CVT belt removal and installation', 189.99, 'https://picsum.photos/400/400?random=13', '04d910a9-5a03-4e92-87f8-dba3bff7a307', 'affiliate', false, false, true, 4.4, 56, 15, 'TRN-CVT-PULL', 'https://example.com/affiliate/cvt-puller'),

('Strut Spring Compressor Set', 'Professional strut spring compressor with safety locks', 249.99, 'https://picsum.photos/400/400?random=16', '04d910a9-5a03-4e92-87f8-dba3bff7a307', 'affiliate', true, false, true, 4.5, 96, 18, 'SUS-STR-COMP', 'https://example.com/affiliate/strut-compressor'),

('Tie Rod End Remover', 'Heavy-duty tie rod end separator tool', 79.99, 'https://picsum.photos/400/400?random=17', '04d910a9-5a03-4e92-87f8-dba3bff7a307', 'affiliate', false, false, true, 4.2, 123, 33, 'SUS-TIE-REM', 'https://example.com/affiliate/tie-rod-remover'),

('Ultrasonic Parts Cleaner', 'Industrial ultrasonic cleaner for precision parts', 449.99, 'https://picsum.photos/400/400?random=42', '04d910a9-5a03-4e92-87f8-dba3bff7a307', 'affiliate', false, false, true, 4.4, 76, 12, 'GEN-ULTRA-CLN', 'https://example.com/affiliate/ultrasonic-cleaner'),

('Parts Washer Solvent', 'Bio-degradable parts washer with pump and brush', 329.99, 'https://picsum.photos/400/400?random=43', '04d910a9-5a03-4e92-87f8-dba3bff7a307', 'affiliate', false, false, true, 4.3, 94, 8, 'GEN-WASH-SOLV', 'https://example.com/affiliate/parts-washer'),

('Shop Vacuum 16-Gallon', 'Heavy-duty shop vacuum with multiple attachments', 199.99, 'https://picsum.photos/400/400?random=50', '04d910a9-5a03-4e92-87f8-dba3bff7a307', 'affiliate', false, false, true, 4.2, 156, 25, 'GEN-VAC-16G', 'https://example.com/affiliate/shop-vacuum'),

-- Additional High-Value Tools
('Oscilloscope Automotive', 'Digital automotive oscilloscope for advanced diagnostics', 899.99, 'https://picsum.photos/400/400?random=39', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', true, false, true, 4.8, 29, 5, 'ELE-OSC-AUTO', 'https://example.com/affiliate/oscilloscope'),

('Fuel Injector Tester', 'Professional fuel injector flow tester', 549.99, 'https://picsum.photos/400/400?random=40', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.5, 38, 8, 'ELE-INJ-TEST', 'https://example.com/affiliate/injector-tester'),

('Diagnostic Scan Tool Basic', 'Entry-level OBD2 diagnostic scanner', 129.99, 'https://picsum.photos/400/400?random=44', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, true, true, 4.2, 267, 45, 'ELE-SCAN-BASIC', 'https://example.com/affiliate/basic-scanner'),

('Tire Pressure Monitoring Tool', 'TPMS programming and diagnostic tool', 299.99, 'https://picsum.photos/400/400?random=45', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, false, true, 4.4, 67, 19, 'ELE-TPMS-TOOL', 'https://example.com/affiliate/tpms-tool'),

('Engine Code Reader', 'Basic engine code reader with freeze frame data', 79.99, 'https://picsum.photos/400/400?random=46', '0309aee3-ffd9-411a-aa8e-302fc327210b', 'affiliate', false, true, true, 4.1, 189, 55, 'ELE-CODE-READ', 'https://example.com/affiliate/code-reader'),

-- More Power Tools
('Cylinder Leak Down Tester', 'Professional cylinder leak down tester for engine diagnostics', 219.99, 'https://picsum.photos/400/400?random=31', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', false, false, true, 4.5, 67, 16, 'ENG-LEAK-TEST', 'https://example.com/affiliate/leak-tester'),

('Harmonic Balancer Puller', 'Universal harmonic balancer puller set', 169.99, 'https://picsum.photos/400/400?random=32', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', false, false, true, 4.3, 45, 11, 'ENG-HAR-PULL', 'https://example.com/affiliate/harmonic-puller'),

('Brake Drum Puller', 'Heavy-duty brake drum puller for stuck drums', 139.99, 'https://picsum.photos/400/400?random=33', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', false, false, true, 4.2, 78, 13, 'BRK-DRUM-PULL', 'https://example.com/affiliate/drum-puller'),

('Brake Pad Spreader Tool', 'Pneumatic brake pad spreader for quick caliper service', 89.99, 'https://picsum.photos/400/400?random=34', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', false, false, true, 4.4, 92, 27, 'BRK-PAD-SPRD', 'https://example.com/affiliate/pad-spreader'),

('Transmission Oil Cooler Flush Kit', 'Complete flush kit for transmission oil coolers', 179.99, 'https://picsum.photos/400/400?random=35', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', false, false, true, 4.3, 54, 9, 'TRN-COOL-FLUSH', 'https://example.com/affiliate/cooler-flush'),

('Shock Absorber Compressor', 'Hydraulic shock absorber compressor tool', 399.99, 'https://picsum.photos/400/400?random=37', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', false, false, true, 4.6, 43, 7, 'SUS-SHOCK-COMP', 'https://example.com/affiliate/shock-compressor'),

('Control Arm Bushing Tool', 'Universal control arm bushing removal and installation tool', 229.99, 'https://picsum.photos/400/400?random=38', '757843f0-51b7-4d84-ba9a-701d81288e6b', 'affiliate', false, false, true, 4.4, 65, 14, 'SUS-BUSH-TOOL', 'https://example.com/affiliate/bushing-tool');