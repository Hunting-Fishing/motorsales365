-- Create comprehensive Getting Started help articles without excerpt column
INSERT INTO help_articles (
  id,
  title,
  slug,
  content,
  category_id,
  author_id,
  status,
  difficulty_level,
  estimated_read_time,
  tags,
  keywords,
  sort_order,
  is_featured,
  created_at,
  updated_at
) VALUES 
-- Article 1: System Setup & Account Configuration
(
  gen_random_uuid(),
  'System Setup & Account Configuration',
  'system-setup-account-configuration',
  '# System Setup & Account Configuration

Welcome to your shop management system! This guide will walk you through the essential first steps to get your system configured and ready for daily operations.

## 1. Initial Dashboard Overview

When you first log in, you''ll see your main dashboard with several key sections:

- **Quick Stats**: Overview of today''s work orders, pending appointments, and revenue
- **Upcoming Appointments**: Your scheduled customer visits
- **Recent Activity**: Latest work orders and customer interactions
- **Quick Actions**: Fast access to common tasks

## 2. Profile Setup

### Personal Profile
1. Click your profile icon in the top right corner
2. Select "Profile Settings"
3. Complete your personal information:
   - Full name and contact information
   - Role and department
   - Notification preferences
   - Profile photo (optional)

### Shop Information
1. Navigate to Settings > Company
2. Enter your shop details:
   - Business name and registration number
   - Complete address and contact information
   - Business hours and time zone
   - Logo upload
   - Tax information and rates

## 3. User Roles and Permissions

Understanding user roles is crucial for security and workflow:

- **Owner/Admin**: Full system access and management
- **Manager**: Shop operations and staff management
- **Technician**: Work order creation and vehicle service
- **Front Desk**: Customer service and appointment scheduling
- **Accountant**: Financial reports and invoicing

## 4. Basic Navigation

### Main Menu Structure
- **Dashboard**: Your daily overview and quick actions
- **Work Orders**: Create, manage, and track all service requests
- **Customers**: Customer database and communication
- **Inventory**: Parts, supplies, and stock management
- **Team**: Staff management and scheduling
- **Equipment**: Tools and machinery tracking
- **Invoices**: Billing and payment processing
- **Reports**: Business analytics and insights
- **Calendar**: Appointment and scheduling management
- **Settings**: System configuration and preferences

### Quick Tips for Navigation
- Use the search bar (Ctrl+K) for instant access to any feature
- Bookmark frequently used pages in your browser
- The notification bell shows important alerts and updates
- Recent items appear in dropdown menus for quick access

## 5. Essential Settings Configuration

### Business Hours
1. Go to Settings > Company > Business Hours
2. Set your operating days and times
3. Configure holiday schedules
4. Set appointment availability windows

### Tax Configuration
1. Navigate to Settings > Company > Tax Settings
2. Enter your local tax rates
3. Configure tax categories for different services
4. Set up tax-exempt customer handling

### Notification Preferences
1. Access Settings > Notifications
2. Configure email and SMS preferences
3. Set up appointment reminders
4. Enable work order status updates

## 6. Security Best Practices

- Use strong, unique passwords
- Enable two-factor authentication if available
- Regularly review user access and permissions
- Log out when leaving workstations unattended
- Keep software updated

## Next Steps

Once you''ve completed the basic setup:

1. **Create Your First Customer** - Add customer information and vehicle details
2. **Set Up Basic Inventory** - Add your most common parts and supplies
3. **Create Your First Work Order** - Practice the complete workflow
4. **Configure Integrations** - Connect payment processors and other tools

## Need Help?

- Use the Help search to find specific topics
- Contact support through the Help > Support tab
- Schedule a demo for personalized training
- Check the FAQ section for common questions

Welcome aboard! Your shop management system is now ready to streamline your operations.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started'),
  null,
  'published',
  'beginner',
  12,
  ARRAY['setup', 'configuration', 'account', 'getting-started', 'dashboard', 'profile'],
  'setup account configuration dashboard profile settings business shop first time new user onboarding',
  1,
  true,
  now(),
  now()
),

-- Article 2: Creating Your First Customer
(
  gen_random_uuid(),
  'Creating Your First Customer',
  'creating-your-first-customer',
  '# Creating Your First Customer

Adding customers to your system is one of the first tasks you''ll need to master. This guide walks you through creating comprehensive customer profiles that will serve as the foundation for all your service work.

## Why Customer Profiles Matter

Proper customer profiles enable:
- Quick access to contact information and service history
- Vehicle-specific maintenance tracking
- Automated appointment reminders and follow-ups
- Streamlined billing and payment processing
- Better customer service through detailed records

## Step-by-Step Customer Creation

### 1. Navigate to Customer Management
- Click "Customers" in the main navigation menu
- Or use the quick search (Ctrl+K) and type "add customer"
- Click the "Add New Customer" button

### 2. Basic Customer Information

**Required Fields:**
- **First Name**: Customer''s given name
- **Last Name**: Customer''s family name
- **Primary Phone**: Main contact number
- **Email Address**: For digital communications

**Optional but Recommended:**
- **Secondary Phone**: Alternative contact method
- **Address**: Complete physical address for service calls
- **Date of Birth**: For customer service and marketing
- **Preferred Contact Method**: Phone, email, or text

### 3. Customer Categories and Tags

**Customer Types:**
- **Individual**: Personal vehicle owners
- **Business**: Commercial accounts and fleets
- **Insurance**: Insurance company referrals
- **Wholesale**: Other shop partnerships

**Tags for Organization:**
- VIP customers
- Fleet accounts
- Warranty customers
- Referral sources
- Payment terms (NET 30, COD, etc.)

## Adding Customer Vehicles

### Why Vehicle Details Matter
Each customer can have multiple vehicles, and detailed vehicle information helps with:
- Parts ordering and compatibility
- Service history tracking
- Maintenance scheduling
- Warranty management

### Vehicle Information to Collect

**Essential Details:**
- **Year, Make, Model**: For parts compatibility
- **VIN Number**: Unique vehicle identification
- **License Plate**: For quick identification
- **Mileage**: Current odometer reading
- **Engine Type**: For service specifications

**Maintenance Information:**
- **Last Service Date**: When was it last serviced
- **Service Intervals**: Manufacturer recommendations
- **Warranty Status**: Coverage details and expiration
- **Special Notes**: Customer preferences or vehicle quirks

### Adding Multiple Vehicles
1. After creating the customer, click "Add Vehicle"
2. Enter all vehicle details
3. Set the primary vehicle (most frequently serviced)
4. Add maintenance schedules if known
5. Upload photos or documents if helpful

## Common Mistakes to Avoid

1. **Incomplete Information**: Always get at least name, phone, and vehicle details
2. **Duplicate Entries**: Search before creating new customers
3. **Poor Vehicle Details**: VIN and year/make/model are critical
4. **Ignoring Preferences**: Respect how customers want to be contacted
5. **No Vehicle Photos**: Pictures help with identification and service documentation

## Next Steps

After creating your first customer:

1. **Add Their Vehicle(s)** - Complete the vehicle profile
2. **Create a Work Order** - Practice the service workflow
3. **Schedule an Appointment** - Test the calendar system
4. **Review Customer History** - Understand the information available

Your customer database is the heart of your business. Taking time to create comprehensive profiles will pay dividends in improved service and customer satisfaction.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started'),
  null,
  'published',
  'beginner',
  10,
  ARRAY['customers', 'vehicles', 'getting-started', 'profiles', 'contact-info'],
  'customer creation add customer vehicle profile contact information customer management first customer',
  2,
  true,
  now(),
  now()
),

-- Article 3: Creating Your First Work Order
(
  gen_random_uuid(),
  'Creating Your First Work Order',
  'creating-your-first-work-order',
  '# Creating Your First Work Order

Work orders are the core of your service business. They track everything from initial customer requests to completed repairs and final billing. This comprehensive guide will walk you through creating your first work order and understanding the complete workflow.

## What is a Work Order?

A work order is a detailed record that includes:
- Customer and vehicle information
- Requested services and repairs
- Parts and labor required
- Time tracking and progress updates
- Costs and pricing
- Final billing and payment

## Before You Start

**Prerequisites:**
- Customer profile must be created
- Vehicle information should be added
- Basic inventory items should be in the system
- Service pricing should be configured

## Step-by-Step Work Order Creation

### 1. Starting a New Work Order

**From the Dashboard:**
- Click "Create Work Order" in quick actions
- Or click "+" button and select "Work Order"

**From Customer Profile:**
- Navigate to the customer''s profile
- Click "New Work Order" button
- Customer and vehicle info pre-fills

**From Calendar:**
- Click on a scheduled appointment
- Select "Create Work Order from Appointment"

### 2. Basic Work Order Information

**Customer Selection:**
- Search and select existing customer
- Or create new customer on-the-fly
- Verify contact information is current

**Vehicle Selection:**
- Choose from customer''s vehicles
- Verify VIN and current mileage
- Add vehicle if not already in system

**Work Order Details:**
- **Priority Level**: Urgent, High, Normal, Low
- **Service Type**: Maintenance, Repair, Inspection, Warranty
- **Expected Completion**: Date and time estimate
- **Assigned Technician**: Who will perform the work

### 3. Adding Services and Labor

**Service Selection:**
- Browse your service catalog
- Search for specific services
- Add custom services if needed
- Set quantities and rates

**Common Service Categories:**
- **Maintenance**: Oil changes, tune-ups, inspections
- **Repairs**: Brake work, engine repair, transmission
- **Diagnostics**: Computer scans, performance testing
- **Installation**: New parts, accessories, upgrades

**Labor Information:**
- **Technician Assignment**: Who performs each task
- **Estimated Hours**: How long each service takes
- **Labor Rate**: Hourly rate for different skill levels
- **Skill Level**: Basic, intermediate, advanced, specialist

### 4. Adding Parts and Materials

**Parts Management:**
- Search inventory for needed parts
- Check availability and stock levels
- Add parts with quantities needed
- Set markup and pricing

**Part Information to Track:**
- **Part Number**: Manufacturer or internal SKU
- **Description**: Clear part identification
- **Quantity**: How many needed
- **Unit Cost**: Your cost for the part
- **Selling Price**: Customer price
- **Supplier**: Where to order if not in stock

### 5. Pricing and Estimates

**Estimate Creation:**
- System calculates total based on parts and labor
- Add any shop supplies or environmental fees
- Apply customer discounts if applicable
- Include tax calculations

**Customer Approval:**
- Present estimate to customer
- Get written or digital approval
- Document any changes or alternatives
- Set authorization limits for additional work

## Next Steps

After creating your first work order:

1. **Practice the Complete Workflow** - From creation to completion
2. **Set Up Service Templates** - Pre-configured common services
3. **Configure Pricing Rules** - Markup and discount structures
4. **Train Your Team** - Ensure everyone understands the process

Your work order system is the operational heart of your business. Master this process, and you''ll have excellent control over your service delivery, customer satisfaction, and profitability.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started'),
  null,
  'published',
  'beginner',
  15,
  ARRAY['work-orders', 'getting-started', 'workflow', 'labor', 'parts', 'pricing'],
  'work order creation service repair labor parts pricing estimate approval workflow first work order',
  3,
  true,
  now(),
  now()
),

-- Article 4: Essential Inventory Setup
(
  gen_random_uuid(),
  'Essential Inventory Setup',
  'essential-inventory-setup',
  '# Essential Inventory Setup

Proper inventory management is crucial for efficient operations and profitability. This guide will help you set up your initial inventory system with the most essential items every shop needs.

## Why Inventory Management Matters

Effective inventory control helps you:
- Reduce time looking for parts
- Prevent stockouts on critical items
- Optimize purchasing and cash flow
- Track profitability by item
- Manage supplier relationships
- Maintain accurate job costing

## Getting Started: Essential Categories

### 1. Fluids and Consumables
These are items you use regularly and need to track carefully:

**Engine Oils:**
- Conventional 5W-30, 10W-30
- Full synthetic 0W-20, 5W-30
- High-mileage formulations
- Diesel engine oils

**Other Fluids:**
- Transmission fluid (ATF)
- Brake fluid (DOT 3, DOT 4)
- Power steering fluid
- Coolant/antifreeze
- Windshield washer fluid
- Gear oil

**Shop Supplies:**
- Shop rags and towels
- Cleaning solvents
- Lubricants and penetrating oils
- Thread locker compounds
- RTV sealants

### 2. Common Maintenance Parts
Stock the parts you replace most frequently:

**Filters:**
- Engine air filters (popular sizes)
- Oil filters (common thread sizes)
- Fuel filters
- Cabin air filters

**Belts and Hoses:**
- Serpentine belts (common lengths)
- Radiator hoses (universal and common sizes)
- Vacuum hoses
- Fuel lines

**Electrical:**
- Battery terminals and cables
- Fuses (common amperage)
- Light bulbs (headlight, tail light, interior)
- Spark plugs (common heat ranges)

## Setting Up Inventory Items

### 1. Basic Item Information

**Essential Fields:**
- **Part Number**: Your internal SKU or manufacturer part number
- **Description**: Clear, searchable description
- **Category**: Group similar items together
- **Unit of Measure**: Each, gallon, quart, box, etc.
- **Location**: Where the item is stored

**Example Entry:**
```
Part Number: OF-5W30-5QT
Description: 5W-30 Full Synthetic Motor Oil - 5 Quart Jug
Category: Fluids > Engine Oil
Unit: Each
Location: Oil Storage Rack A, Shelf 2
```

### 2. Pricing Information

**Cost Tracking:**
- **Unit Cost**: What you pay your supplier
- **Selling Price**: What you charge customers
- **Markup Percentage**: Your profit margin
- **Core Charge**: Refundable deposit (if applicable)

**Pricing Strategies:**
- **Standard Markup**: Apply consistent percentage markup
- **Competitive Pricing**: Match local market rates
- **Value Pricing**: Price based on customer value
- **Volume Discounts**: Different prices for quantity breaks

## Inventory Management Best Practices

### 1. Regular Cycle Counts
- **Daily**: Count fast-moving, high-value items
- **Weekly**: Count category sections
- **Monthly**: Full inventory count
- **Quarterly**: Reconcile with accounting

### 2. First In, First Out (FIFO)
- Use older stock before newer stock
- Especially important for fluids with expiration dates
- Rotate stock when receiving new shipments
- Mark expiration dates clearly

## Getting Started Action Plan

### Week 1: Foundation
1. Set up basic categories and locations
2. Enter your 20 most-used items
3. Establish reorder points
4. Create basic receiving procedures

### Week 2: Expansion
1. Add another 50 commonly used items
2. Set up supplier information
3. Create purchasing procedures
4. Train staff on system usage

### Week 3: Optimization
1. Analyze usage patterns
2. Adjust reorder points
3. Negotiate supplier terms
4. Implement cycle counting

Proper inventory management takes time to implement but pays huge dividends in efficiency, customer satisfaction, and profitability. Start with the basics and build your system gradually.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started'),
  null,
  'published',
  'beginner',
  18,
  ARRAY['inventory', 'parts', 'stock', 'getting-started', 'suppliers', 'pricing'],
  'inventory setup parts management stock control suppliers pricing fluids filters brake components first inventory',
  4,
  true,
  now(),
  now()
),

-- Article 5: Daily Operations Workflow
(
  gen_random_uuid(),
  'Daily Operations Workflow',
  'daily-operations-workflow',
  '# Daily Operations Workflow

Establishing consistent daily routines will help you maximize efficiency, provide excellent customer service, and maintain control over your business operations. This guide outlines recommended workflows for different roles in your shop.

## Opening Procedures (Start of Day)

### Management/Owner Tasks (15-20 minutes)

**System Check:**
1. Review yesterday''s work order completions
2. Check overnight messages and emails
3. Review today''s appointments and scheduled work
4. Check staffing levels and adjust if needed
5. Review cash flow and banking needs

**Daily Planning:**
1. Prioritize urgent work orders
2. Assign technicians to specific jobs
3. Check parts availability for scheduled work
4. Review customer pickup appointments
5. Plan parts orders for tomorrow''s work

**Team Brief:**
1. Share daily priorities with staff
2. Discuss any special customer requirements
3. Review safety reminders
4. Announce any schedule changes
5. Address questions or concerns

### Front Desk/Service Advisor Tasks (10-15 minutes)

**Communication Setup:**
1. Check voicemail and return urgent calls
2. Review email for customer inquiries
3. Confirm today''s appointments
4. Prepare customer files for scheduled visits
5. Update appointment reminders if needed

**System Preparation:**
1. Review work orders ready for customer pickup
2. Prepare invoices for completed work
3. Check payment processing systems
4. Review parts availability for walk-ins
5. Set up customer waiting area

### Technician Tasks (5-10 minutes)

**Workspace Preparation:**
1. Check tool inventory and organization
2. Review assigned work orders for the day
3. Gather parts for first jobs
4. Check equipment functionality
5. Review safety protocols for planned work

**Work Order Review:**
1. Understand customer complaints and requests
2. Review previous service history
3. Note any special instructions or concerns
4. Verify vehicle identification
5. Plan work sequence for efficiency

## Customer Interaction Workflow

### Walk-in Customers

**Initial Greeting (2-3 minutes):**
1. Welcome customer warmly
2. Determine if they have an appointment
3. Assess urgency of their needs
4. Gather basic contact information
5. Explain current wait times

**Service Assessment (5-10 minutes):**
1. Listen to customer description of problem
2. Ask clarifying questions
3. Inspect vehicle if appropriate
4. Explain diagnostic process if needed
5. Provide time and cost estimates

### Customer Pickup Process

**Pickup Preparation (5-10 minutes before arrival):**

**Final Vehicle Inspection:**
1. Test drive if repairs were significant
2. Check all work was completed correctly
3. Clean interior and exterior as appropriate
4. Remove protective covers
5. Prepare vehicle keys and paperwork

**Customer Pickup Interaction:**

**Vehicle Walkthrough:**
1. Explain all work performed
2. Show old parts if appropriate
3. Review warranty coverage
4. Provide maintenance recommendations
5. Answer any customer questions

## Closing Procedures (End of Day)

### Service Department Closing (15-20 minutes)

**Work Order Review:**
1. Update all work order statuses
2. Note any work to continue tomorrow
3. Secure vehicles and keys
4. Clean work areas
5. Document any equipment issues

### Administrative Closing (10-15 minutes)

**Financial Tasks:**
1. Process all payments received
2. Prepare bank deposit
3. Review daily sales totals
4. Check for payment processing errors
5. Secure cash and payments

## Key Performance Indicators to Track Daily

### Operational Metrics
- **Work orders completed**
- **Average completion time**
- **Customer satisfaction scores**
- **Technician productivity rates**
- **Parts availability percentage**

### Financial Metrics
- **Daily revenue**
- **Average invoice amount**
- **Cost of goods sold**
- **Labor efficiency**
- **Cash flow position**

## Getting Started with Daily Workflows

### Week 1: Basic Routines
1. Implement opening and closing procedures
2. Establish basic customer communication
3. Set up simple work order tracking
4. Create basic daily schedules

### Week 2: Refinement
1. Add quality control checkpoints
2. Improve customer pickup process
3. Enhance parts management
4. Develop team communication

### Week 3: Optimization
1. Track key performance indicators
2. Identify bottlenecks and inefficiencies
3. Implement improvement suggestions
4. Train staff on refined procedures

The most successful shops are those that execute basic operations consistently and reliably. Focus on getting the fundamentals right before adding complexity.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started'),
  null,
  'published',
  'beginner',
  20,
  ARRAY['workflow', 'daily-operations', 'procedures', 'getting-started', 'customer-service', 'efficiency'],
  'daily operations workflow procedures opening closing customer service work orders parts management pickup process',
  5,
  true,
  now(),
  now()
);