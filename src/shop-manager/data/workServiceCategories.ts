
export const serviceCategories = [
  { label: "Regular Service", value: "regular-service", serviceAreas: [] },
  { label: "Inspection", value: "inspection", serviceAreas: [] },
  { label: "Repair", value: "repair", serviceAreas: [] },
  { label: "Diagnosis", value: "diagnosis", serviceAreas: [] },
  { label: "Maintenance", value: "maintenance", serviceAreas: [] },
  { label: "Installation", value: "installation", serviceAreas: [] }
];

export const serviceAreas = [
  { label: "Engine", value: "engine", services: ["Oil Change", "Spark Plugs", "Timing Belt"] },
  { label: "Exhaust", value: "exhaust", services: ["Muffler Repair", "Exhaust Pipe", "Catalytic Converter"] },
  { label: "Transmission", value: "transmission", services: ["Fluid Change", "Filter Replacement", "Clutch Service"] },
  { label: "Brakes", value: "brakes", services: ["Brake Pad Replacement", "Rotor Resurface", "Caliper Service"] },
  { label: "Suspension", value: "suspension", services: ["Shock Replacement", "Strut Service", "Alignment"] },
  { label: "Steering", value: "steering", services: ["Power Steering Flush", "Rack and Pinion", "Tie Rod Ends"] },
  { label: "Electrical", value: "electrical", services: ["Battery Service", "Alternator Replacement", "Wiring Repair"] },
  { label: "Cooling System", value: "cooling", services: ["Radiator Flush", "Water Pump", "Thermostat"] },
  { label: "Air Conditioning", value: "ac", services: ["A/C Recharge", "Compressor Service", "Evaporator Clean"] },
  { label: "Interior", value: "interior", services: ["Dashboard Repair", "Seat Repair", "Carpet Cleaning"] },
  { label: "Exterior", value: "exterior", services: ["Paint Touch Up", "Trim Repair", "Body Work"] },
  { label: "Wheels & Tires", value: "wheels-tires", services: ["Tire Rotation", "Wheel Alignment", "Balancing"] },
  { label: "Fluids & Lubricants", value: "fluids", services: ["Oil Change", "Coolant Flush", "Transmission Fluid"] },
  { label: "Computer & Electronics", value: "electronics", services: ["Diagnostics", "ECU Reset", "Sensor Replacement"] },
  { label: "Other", value: "other", services: ["General Maintenance", "Multi-Point Inspection", "Custom Service"] }
];

// Update each service category to include its related service areas
serviceCategories.forEach(category => {
  category.serviceAreas = serviceAreas.map(area => ({
    ...area,
    services: area.services
  }));
});

export const commonServices = [
  { label: "Oil Change", value: "oil-change", area: "fluids" },
  { label: "Filter Replacement", value: "filter-replacement", area: "engine" },
  { label: "Brake Pad Replacement", value: "brake-pads", area: "brakes" },
  { label: "Tire Rotation", value: "tire-rotation", area: "wheels-tires" },
  { label: "Wheel Alignment", value: "wheel-alignment", area: "wheels-tires" },
  { label: "Battery Replacement", value: "battery", area: "electrical" },
  { label: "Check Engine Light Diagnosis", value: "check-engine", area: "diagnosis" },
  { label: "AC Service", value: "ac-service", area: "ac" },
  { label: "Fluid Flush", value: "fluid-flush", area: "fluids" },
  { label: "Spark Plug Replacement", value: "spark-plugs", area: "engine" },
  { label: "Suspension Check", value: "suspension-check", area: "suspension" },
  { label: "Exhaust Repair", value: "exhaust-repair", area: "exhaust" },
  { label: "Computer Diagnostics", value: "computer-diagnostics", area: "electronics" },
  { label: "Belt Replacement", value: "belt-replacement", area: "engine" }
];
