
// Define job titles mapped to each role
export const roleJobTitleMap: Record<string, string[]> = {
  "Owner": [
    "Business Owner",
    "CEO",
    "President",
    "Managing Director"
  ],
  "Administrator": [
    "Office Manager",
    "Administrative Assistant", 
    "Operations Manager",
    "Shop Manager",
    "General Manager"
  ],
  "Technician": [
    "Apprentice 1",
    "Apprentice 2",
    "Apprentice 3",
    "Apprentice 4",
    "Technician",
    "Senior Technician",
    "Lead Technician",
    "Mobile Technician",
    "Shop Foreman",
    "Master Technician"
  ],
  "Customer Service": [
    "Service Advisor",
    "Customer Service Representative",
    "Service Writer",
    "Customer Care Specialist",
    "Front Desk Coordinator"
  ]
};

// Define departments associated with each role
export const roleDepartmentMap: Record<string, string[]> = {
  "Owner": [
    "Management",
    "Executive"
  ],
  "Administrator": [
    "Administration",
    "Management",
    "Operations"
  ],
  "Technician": [
    "Field Service",
    "Shop Floor",
    "Service Bay",
    "Mobile Service",
    "Diagnostics"
  ],
  "Customer Service": [
    "Customer Support",
    "Front Office",
    "Service Desk",
    "Reception"
  ]
};

// Default job titles when no role is selected
export const defaultJobTitles = [
  "General Staff",
  "Assistant",
  "Specialist",
  "Coordinator"
];

// Default departments when no role is selected
export const defaultDepartments = [
  "General",
  "Unassigned",
  "Other"
];
