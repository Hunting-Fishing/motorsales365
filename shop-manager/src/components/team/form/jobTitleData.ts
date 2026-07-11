// Department-based structure for job titles
export const departmentCategories: Record<string, {
  jobTitles: string[];
  suggestedRoles: Record<string, string>;
}> = {
  "Marine / Vessels": {
    jobTitles: [
      "Captain",
      "First Mate", 
      "Second Mate",
      "Bosun",
      "Deckhand",
      "Chief Engineer",
      "Marine Engineer",
      "Marine Technician",
      "Marine Service Advisor"
    ],
    suggestedRoles: {
      "Captain": "Manager",
      "First Mate": "Manager",
      "Second Mate": "Manager",
      "Bosun": "Technician",
      "Deckhand": "Technician",
      "Chief Engineer": "Manager",
      "Marine Engineer": "Technician",
      "Marine Technician": "Technician",
      "Marine Service Advisor": "Service Advisor"
    }
  },
  "Office / Administration": {
    jobTitles: [
      "Office Manager",
      "Administrative Assistant",
      "Receptionist",
      "Service Writer",
      "Customer Service Representative",
      "Parts Coordinator",
      "Front Desk Associate",
      "Office Administrator"
    ],
    suggestedRoles: {
      "Office Manager": "Administrator",
      "Administrative Assistant": "Reception",
      "Receptionist": "Reception",
      "Service Writer": "Service Advisor",
      "Customer Service Representative": "Service Advisor",
      "Parts Coordinator": "Parts Manager",
      "Front Desk Associate": "Reception",
      "Office Administrator": "Administrator"
    }
  },
  "Field Service / Technical": {
    jobTitles: [
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
    suggestedRoles: {
      "Apprentice 1": "Technician",
      "Apprentice 2": "Technician",
      "Apprentice 3": "Technician",
      "Apprentice 4": "Technician",
      "Technician": "Technician",
      "Senior Technician": "Technician",
      "Lead Technician": "Manager",
      "Mobile Technician": "Technician",
      "Shop Foreman": "Manager",
      "Master Technician": "Technician"
    }
  },
  "Management / Executive": {
    jobTitles: [
      "CEO",
      "President",
      "Managing Director",
      "General Manager",
      "Operations Manager",
      "Service Manager",
      "Department Manager",
      "Business Owner"
    ],
    suggestedRoles: {
      "CEO": "Owner",
      "President": "Owner",
      "Managing Director": "Owner",
      "Business Owner": "Owner",
      "General Manager": "Administrator",
      "Operations Manager": "Manager",
      "Service Manager": "Manager",
      "Department Manager": "Manager"
    }
  },
  "Parts / Inventory": {
    jobTitles: [
      "Parts Manager",
      "Parts Specialist",
      "Inventory Manager",
      "Parts Coordinator",
      "Parts Counter Staff"
    ],
    suggestedRoles: {
      "Parts Manager": "Parts Manager",
      "Parts Specialist": "Parts Manager",
      "Inventory Manager": "Parts Manager",
      "Parts Coordinator": "Parts Manager",
      "Parts Counter Staff": "Parts Manager"
    }
  },
  "Other": {
    jobTitles: [
      "General Staff",
      "Assistant",
      "Specialist",
      "Coordinator",
      "Intern",
      "Contractor"
    ],
    suggestedRoles: {
      "General Staff": "Other Staff",
      "Assistant": "Other Staff",
      "Specialist": "Other Staff",
      "Coordinator": "Other Staff",
      "Intern": "Other Staff",
      "Contractor": "Other Staff"
    }
  }
};

// Get all department names
export const getDepartmentNames = () => Object.keys(departmentCategories);

// Get job titles for a specific department
export const getJobTitlesForDepartment = (department: string): string[] => {
  return departmentCategories[department]?.jobTitles || [];
};

// Get suggested role for a job title within a department
export const getSuggestedRole = (department: string, jobTitle: string): string | null => {
  return departmentCategories[department]?.suggestedRoles[jobTitle] || null;
};

// Role metadata for display in dropdowns
export const roleMetadata: Record<string, { description: string; badges: string[] }> = {
  owner: {
    description: 'Full access including billing',
    badges: ['All Permissions']
  },
  admin: {
    description: 'Administrative access with most permissions',
    badges: ['Work Orders', 'Inventory', 'Customers', 'Reports']
  },
  manager: {
    description: 'Operations manager with oversight',
    badges: ['Work Orders', 'Reports', 'Team View']
  },
  captain: {
    description: 'Licensed vessel commander',
    badges: ['Work Orders', 'Equipment', 'Team View']
  },
  mate: {
    description: 'Licensed deck officer',
    badges: ['View Work Orders', 'Log Time']
  },
  chief_engineer: {
    description: 'Lead engineering officer',
    badges: ['Equipment', 'Work Orders', 'Parts']
  },
  marine_engineer: {
    description: 'Engineering crew member',
    badges: ['Update Work Orders', 'Equipment View']
  },
  boson: {
    description: 'Deck crew supervisor',
    badges: ['Crew Supervision', 'Equipment View']
  },
  deckhand: {
    description: 'Entry level marine crew',
    badges: ['View Work Orders', 'Log Time']
  },
  technician: {
    description: 'Service technician',
    badges: ['Work Orders', 'Parts View', 'Log Time']
  },
  service_advisor: {
    description: 'Customer-facing coordinator',
    badges: ['Work Orders', 'Customers', 'Appointments']
  },
  reception: {
    description: 'Front desk staff',
    badges: ['Check-in', 'Appointments', 'View Only']
  },
  parts_manager: {
    description: 'Inventory management',
    badges: ['Full Inventory', 'Purchase Orders']
  },
  other_staff: {
    description: 'General staff member',
    badges: ['View Tasks', 'Log Time']
  }
};
