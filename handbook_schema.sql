-- ============================================================
--  TEAM OJAS RACING — HANDBOOK MODULE SQL SCHEMA
-- ============================================================
-- Execute in Supabase SQL Editor: https://supabase.com/dashboard
-- Project: Team Ojas Racing (Inventory & Engineering Portal)
-- ============================================================

-- 1. Enable UUID generator if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the handbook_tasks table
CREATE TABLE IF NOT EXISTS public.handbook_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department TEXT NOT NULL,
    task_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    questions TEXT NOT NULL,
    links TEXT,
    is_unlocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add index for fast querying by department and task order
CREATE INDEX IF NOT EXISTS idx_handbook_tasks_dept_order 
    ON public.handbook_tasks (department, task_number ASC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.handbook_tasks ENABLE ROW LEVEL SECURITY;

-- 5. Create policy allowing anonymous and authenticated read access
DROP POLICY IF EXISTS "Allow anonymous read access to handbook_tasks" ON public.handbook_tasks;
CREATE POLICY "Allow anonymous read access to handbook_tasks" 
    ON public.handbook_tasks
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Optional: Allow authenticated / service insert/update/delete if needed
DROP POLICY IF EXISTS "Allow public write access to handbook_tasks" ON public.handbook_tasks;
CREATE POLICY "Allow public write access to handbook_tasks" 
    ON public.handbook_tasks
    FOR ALL 
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.handbook_tasks;

-- 7. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';

-- ============================================================
--  SAMPLE SEED DATA (Formula Student Electric - Team Ojas)
-- ============================================================
INSERT INTO public.handbook_tasks (department, task_number, title, questions, links, is_unlocked)
VALUES
-- Vehicle Dynamics
('Vehicle Dynamics', 1, 'Double Wishbone Suspension Geometry & Roll Center', 
 '1. Define the instant center of rotation for front and rear suspension.\n2. How does the roll center migration impact dynamic weight transfer?\n3. Calculate the front roll center height for a track width of 1200mm with 3° camber gain.', 
 'https://www.racecar-engineering.com/tech-explained/suspension-kinematics/\nhttps://en.wikipedia.org/wiki/Roll_center', true),

('Vehicle Dynamics', 2, 'Tire Data Analysis & Pacejka Magic Formula', 
 '1. Explain the coefficients B, C, D, and E in the Pacejka '94 and '02 model.\n2. How do tire inflation pressures affect relaxation length and cornering stiffness?\n3. Derive slip angle curves from TTC (Tire Test Consortium) raw test data.', 
 'https://www.millikenresearch.com/rcvd.html', true),

('Vehicle Dynamics', 3, 'Damper Dyno Testing & Frequency Response', 
 '1. Differentiate between low-speed damping and high-speed damping for kerb strikes.\n2. Calculate the sprung mass natural frequency for front and rear axles (target: 2.2 Hz - 2.5 Hz).\n3. What is the effect of asymmetric bump/rebound ratio on chassis pitch?', 
 'https://kaztechnologies.com/damper-basics/', false),

-- Powertrain
('Powertrain', 1, 'Tractive System Inverter Selection & DC Bus Sizing', 
 '1. Calculate root-mean-square (RMS) phase current requirements for peak acceleration.\n2. Evaluate DC-link capacitor ripple current rating and thermal degradation.\n3. Verify gate drive isolation voltage rating meets FS rules (> 2x max tractive system voltage).', 
 'https://www.sevcon.com/\nhttps://www.ti.com/lit/wp/slyy112/slyy112.pdf', true),

('Powertrain', 2, 'Accumulator Cell Chemistry & Cooling Loop Design', 
 '1. Compare pouch cells vs cylindrical 21700 cells in terms of gravimetric energy density and thermal conductivity.\n2. Design the forced-air or liquid cold plate jacket for 400V 8kWh pack under continuous 120A discharge.\n3. Explain the battery thermal runaway containment compliance per Rule EV 4.5.', 
 'https://batteryuniversity.com/article/bu-204-how-do-lithium-batteries-work', true),

('Powertrain', 3, 'Planetary vs Spur Gear Reduction Optimization', 
 '1. Calculate target total reduction ratio considering motor maximum RPM (12,000 RPM) and vehicle top speed (115 km/h).\n2. Perform AGMA bending and contact stress calculations for pinion and crown gears.\n3. Model driveline backlash and impact on regenerative braking stability.', 
 NULL, false),

-- Aerodynamics
('Aerodynamics', 1, 'Multi-Element Front Wing Ground Effect Modeling', 
 '1. Explain slot gap and flap overlap optimization for preventing boundary layer separation on main plane.\n2. How does ride height variation in pitch and roll affect downforce balance?\n3. Run ANSYS Fluent mesh independence study with k-omega SST turbulence model.', 
 'https://www.cfd-online.com/Wiki/SST_k-omega_model\nhttps://www.simscale.com/blog/aerodynamics-formula-student/', true),

('Aerodynamics', 2, 'Diffuser Expansion Angle & Venturi Geometry', 
 '1. What is the critical diffuser ramp angle before onset of stall?\n2. How do side skirt vortex generators isolate underfloor low pressure from wheel wake?\n3. Calculate ground effect downforce contribution relative to total vehicle aerodynamic package.', 
 'https://www.racecar-engineering.com/articles/f1/diffusers-explained/', true),

('Aerodynamics', 3, 'Active DRS Wing Actuation & Fail-Safe Mechanism', 
 '1. Detail the pneumatic or servo mechanical linkage for DRS flap deployment.\n2. How must the default mechanical spring return guarantee high-downforce position upon power loss (FS Rule EV 3.1)?\n3. Quantify aerodynamic drag reduction percentage and straight-line time delta.', 
 NULL, false),

-- Chassis
('Chassis', 1, 'Tubular Spaceframe Torsional Rigidity FEA', 
 '1. Formulate the boundary conditions and torque couple application for torsional stiffness testing.\n2. What is the target torsional rigidity (Nm/degree) relative to the roll stiffness of suspension?\n3. Perform beam element vs shell element correlation in SolidWorks / ANSYS Mechanical.', 
 'https://www.fsaeonline.com/', true),

('Chassis', 2, 'Impact Attenuator Structural Testing & SES Validation', 
 '1. Review the Structural Equivalency Spreadsheet (SES) requirements for front bulkhead and anti-intrusion plate.\n2. Calculate the average and peak deceleration during a 7 m/s impact with a 300kg total test vehicle mass.\n3. Present test coupon crush energy absorption curves (Honeywell aluminum honeycomb vs composite).', 
 'https://www.formulabharat.com/downloads/', true),

('Chassis', 3, 'Carbon Fiber Monocoque Laminate Schedule & Sandwich Core', 
 '1. Determine the ply layup schedule (0/90, ±45 biaxial) and prepreg cure cycle.\n2. Calculate shear strength of Rohacell / Nomex honeycomb core under 3-point bend test.\n3. Detail hard-point suspension mounting insert pull-out shear strength analysis.', 
 NULL, false),

-- Electrical
('Electrical', 1, 'BMS (Battery Management System) Voltage & Temp Sensing', 
 '1. Explain isolation barrier requirements between high voltage tractive system and low voltage ground.\n2. Configure LTC6811/LTC6813 daisy-chain SPI communications with optocouplers/isoSPI.\n3. How does the BMS trigger the Shutdown Circuit via AMS fault detection?', 
 'https://www.analog.com/en/products/ltc6811-1.html', true),

('Electrical', 2, 'Tractive System Pre-Charge & Discharge Circuitry', 
 '1. Calculate precharge resistor power rating and thermal mass for 400V bus within 2.0 seconds.\n2. Design the automatic passive/active tractive system discharge circuit (must discharge < 60V in under 5 seconds).\n3. Detail the safety interlock and status LED indicator circuit compliance.', 
 'https://www.ti.com/lit/an/slyt734/slyt734.pdf', false),

('Electrical', 3, 'CAN Bus Architecture, Baud Rate & Telemetry Sniffing', 
 '1. Structure CAN DBC files for wheel speed sensors, throttle APPS, inverter RPM, and cell voltages.\n2. Calculate bus load utilization at 500kbps vs 1Mbps with 20Hz and 100Hz priority nodes.\n3. Configure termination resistors and differential tranceiver protection against EMI radiated from inverter.', 
 'https://www.kvaser.com/can-protocol-tutorial/', false),

-- Extras
('Extras', 1, 'Formula Bharat / FSAE Cost Report & BOM Strategy', 
 '1. How is the Real Cost table structured according to the latest Cost Understanding regulations?\n2. Document machining and manufacturing process multipliers for custom fabricated suspension bellcranks.\n3. Prepare tooling, fast-turn prototyping, and supplier audit documentation.', 
 'https://www.formulastudent.de/events/rules/', true),

('Extras', 2, 'Driver Ergonomics, Pedal Box APPS Calibration & E-Kill Switches', 
 '1. Explain dual sensor APPS (Accelerator Pedal Position Sensor) plausibility check rule (<10% deviation).\n2. What are the biomechanical angles for formula cockpit seating per 95th percentile male driver template?\n3. Design mechanical interlock for brake pedal over-travel switch (BOTS).', 
 NULL, false)
ON CONFLICT (id) DO NOTHING;
