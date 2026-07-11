-- Create comprehensive Getting Started help articles
INSERT INTO help_articles (
  id,
  title,
  slug,
  content,
  excerpt,
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
  'Complete guide to setting up your account and configuring essential system settings for your repair shop.',
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

### 4. Communication Preferences

Set up how customers want to be contacted:
- **Appointment Reminders**: Email, SMS, or phone
- **Service Updates**: How they want work order progress updates
- **Marketing**: Newsletter and promotional preferences
- **Emergency Contact**: Alternative person to reach

### 5. Payment Information

**Payment Methods:**
- Credit/debit cards (securely stored)
- ACH/bank transfer details
- Business account terms
- Fleet billing arrangements

**Billing Preferences:**
- Email invoices vs. printed
- Payment terms and credit limits
- Automatic payment authorization
- Invoice consolidation preferences

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

## Customer Profile Best Practices

### Data Quality
- Always verify phone numbers and email addresses
- Use consistent formatting for addresses
- Double-check VIN numbers for accuracy
- Keep emergency contact information current

### Privacy and Security
- Only collect necessary information
- Secure storage of payment information
- Respect customer communication preferences
- Maintain confidentiality of personal data

### Organization Tips
- Use consistent naming conventions
- Tag customers for easy filtering
- Set up custom fields for business-specific needs
- Regular data cleanup and updates

## Quick Customer Lookup

### Search Methods
- **Name Search**: Type any part of first or last name
- **Phone Search**: Search by phone number
- **Vehicle Search**: Find by license plate or VIN
- **Email Search**: Locate by email address

### Customer Dashboard
Each customer profile includes:
- Contact information and preferences
- All vehicles owned
- Complete service history
- Outstanding invoices and payments
- Appointment history and upcoming bookings
- Notes and communications log

## Common Mistakes to Avoid

1. **Incomplete Information**: Always get at least name, phone, and vehicle details
2. **Duplicate Entries**: Search before creating new customers
3. **Poor Vehicle Details**: VIN and year/make/model are critical
4. **Ignoring Preferences**: Respect how customers want to be contacted
5. **No Vehicle Photos**: Pictures help with identification and service documentation

## Integration with Other Features

### Work Orders
- Customers link directly to work orders
- Vehicle history appears automatically
- Previous service recommendations show up

### Appointments
- Customer information pre-fills scheduling forms
- Vehicle details help estimate service time
- Communication preferences control reminder methods

### Invoicing
- Billing information transfers automatically
- Payment history shows credit worthiness
- Custom terms and discounts apply

## Next Steps

After creating your first customer:

1. **Add Their Vehicle(s)** - Complete the vehicle profile
2. **Create a Work Order** - Practice the service workflow
3. **Schedule an Appointment** - Test the calendar system
4. **Review Customer History** - Understand the information available

## Tips for Success

- **Start Simple**: Begin with basic information and add details over time
- **Be Consistent**: Use the same format for all customers
- **Regular Updates**: Keep information current as customers change details
- **Use Notes**: Document important customer preferences and history

Your customer database is the heart of your business. Taking time to create comprehensive profiles will pay dividends in improved service and customer satisfaction.',
  'Step-by-step guide to adding customers and their vehicles to your management system.',
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

### 3. Service Request Information

**Customer Complaint/Request:**
Write a clear description of what the customer wants:
- "Customer reports strange noise when braking"
- "Routine 30,000-mile maintenance service"
- "Check engine light is on"
- "Annual safety inspection required"

**Initial Assessment:**
- Visual inspection notes
- Diagnostic test results
- Photos of problem areas
- Estimated scope of work

### 4. Adding Services and Labor

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

### 5. Adding Parts and Materials

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

**Special Considerations:**
- **Core Charges**: Refundable deposits on rebuilt parts
- **Warranties**: Part warranty terms and duration
- **Special Orders**: Custom or hard-to-find parts
- **Customer Parts**: Parts provided by customer

### 6. Pricing and Estimates

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

### 7. Work Order Status Management

**Status Levels:**
- **Draft**: Work order created but not started
- **Estimate**: Waiting for customer approval
- **Approved**: Customer has approved estimate
- **In Progress**: Work is being performed
- **Waiting**: Waiting for parts or customer decision
- **Quality Check**: Work completed, being inspected
- **Ready**: Vehicle ready for customer pickup
- **Completed**: Customer has picked up and paid
- **Cancelled**: Work order was cancelled

**Status Updates:**
- Update status as work progresses
- Send automatic notifications to customers
- Track time spent in each status
- Document reasons for delays

### 8. Time Tracking and Progress Updates

**Time Clock Features:**
- Clock in/out on specific work orders
- Track time by service or repair task
- Monitor technician productivity
- Calculate actual vs. estimated hours

**Progress Documentation:**
- Add photos of work in progress
- Document unexpected findings
- Note additional repairs needed
- Record customer communications

### 9. Quality Control and Inspection

**Pre-Delivery Checklist:**
- Verify all requested work completed
- Test drive if applicable
- Check for related issues
- Clean vehicle and workspace

**Documentation:**
- Photos of completed work
- Test results and measurements
- Warranty information provided
- Customer education notes

### 10. Customer Communication

**Throughout the Process:**
- Initial estimate approval
- Updates when delays occur
- Additional work authorization
- Completion notification
- Invoice and payment details

**Communication Methods:**
- Phone calls for complex issues
- Text messages for quick updates
- Email for documentation
- In-person discussions

## Advanced Work Order Features

### Recurring Maintenance
- Set up automatic work orders for regular customers
- Schedule based on mileage or time intervals
- Pre-populate common maintenance items

### Fleet Management
- Handle multiple vehicles under one account
- Batch scheduling and processing
- Fleet reporting and analytics

### Warranty Tracking
- Link repairs to warranty claims
- Track warranty expiration dates
- Manage manufacturer reimbursements

### Sublet Work
- Send specialized work to other shops
- Track sublet costs and timing
- Manage customer communication

## Common Mistakes to Avoid

1. **Incomplete Information**: Always get full vehicle and customer details
2. **Poor Documentation**: Take photos and detailed notes
3. **No Customer Approval**: Get written approval for all work
4. **Incorrect Pricing**: Double-check all parts and labor costs
5. **Status Not Updated**: Keep status current for customer communication
6. **Missing Parts Info**: Verify part numbers and availability

## Work Order Reports and Analytics

**Key Metrics to Track:**
- Average completion time
- Technician productivity
- Customer satisfaction scores
- Repeat repair rates
- Profitability by service type

**Regular Reviews:**
- Weekly work order analysis
- Monthly customer satisfaction reviews
- Quarterly pricing and efficiency assessments
- Annual service mix optimization

## Integration with Other Systems

### Inventory Management
- Parts automatically deducted from stock
- Reorder alerts when low
- Cost tracking and margin analysis

### Scheduling
- Work orders link to calendar appointments
- Resource allocation and planning
- Technician workload balancing

### Accounting
- Automatic invoice generation
- Cost tracking and job profitability
- Tax reporting and compliance

## Next Steps

After creating your first work order:

1. **Practice the Complete Workflow** - From creation to completion
2. **Set Up Service Templates** - Pre-configured common services
3. **Configure Pricing Rules** - Markup and discount structures
4. **Train Your Team** - Ensure everyone understands the process

## Pro Tips for Efficiency

- **Use Templates**: Create templates for common repairs
- **Batch Similar Work**: Group similar tasks for efficiency
- **Mobile Access**: Use mobile devices for shop floor updates
- **Customer Portal**: Let customers track their own work orders
- **Integration**: Connect with parts suppliers for easy ordering

Your work order system is the operational heart of your business. Master this process, and you''ll have excellent control over your service delivery, customer satisfaction, and profitability.',
  'Complete walkthrough of creating and managing work orders from start to finish.',
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

### 3. Wear Items
Parts that need regular replacement:

**Brake Components:**
- Brake pads (popular vehicle fitments)
- Brake rotors (standard sizes)
- Brake hardware kits
- Brake fluid

**Suspension:**
- Shock absorbers (common applications)
- Struts (popular models)
- Ball joints
- Tie rod ends

**Engine Components:**
- Air filters
- Fuel filters
- PCV valves
- Thermostats

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

### 3. Stock Management

**Quantity Tracking:**
- **Current Stock**: How many you have now
- **Minimum Level**: When to reorder
- **Maximum Level**: Storage capacity limit
- **Reorder Quantity**: How many to order at once

**Example Stock Levels:**
```
5W-30 Motor Oil (5qt):
Current: 24 jugs
Minimum: 6 jugs
Maximum: 48 jugs
Reorder: 24 jugs
```

### 4. Supplier Information

**Vendor Details:**
- **Primary Supplier**: Main source for this item
- **Secondary Supplier**: Backup source
- **Supplier Part Number**: Their SKU for ordering
- **Lead Time**: How long to receive after ordering
- **Minimum Order**: Smallest quantity they''ll sell

## Organizing Your Inventory

### Physical Organization

**Zone System:**
- **Fast-Moving Zone**: Most frequently used items
- **Bulk Storage**: Large quantities and slow movers
- **Specialty Zone**: Expensive or specialized items
- **Hazmat Area**: Fluids and chemicals (properly ventilated)

**Labeling System:**
- Clear, readable labels on all shelves
- Color coding by category
- Bin location numbers
- Barcode labels for scanning

### Digital Organization

**Category Structure:**
```
Fluids
  ├── Engine Oil
  ├── Transmission Fluid
  ├── Brake Fluid
  └── Coolant

Filters
  ├── Engine Air
  ├── Oil Filters
  ├── Fuel Filters
  └── Cabin Air

Brake Components
  ├── Brake Pads
  ├── Rotors
  ├── Hardware
  └── Fluid
```

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

### 3. ABC Analysis
Classify inventory by importance:

**A Items (20% of items, 80% of value):**
- High-dollar, fast-moving parts
- Critical items that can''t be out of stock
- Tight control and frequent monitoring

**B Items (30% of items, 15% of value):**
- Moderate importance
- Standard reorder procedures
- Regular monitoring

**C Items (50% of items, 5% of value):**
- Low value, slow moving
- Basic controls
- Annual review

### 4. Supplier Relationships

**Vendor Management:**
- Negotiate payment terms
- Establish delivery schedules
- Set up emergency ordering procedures
- Review pricing regularly

**Multiple Suppliers:**
- Primary supplier for best terms
- Secondary supplier for backup
- Local suppliers for emergency needs
- National chains for consistency

## Technology Integration

### Barcode Scanning
- Speeds up receiving and issuing
- Reduces counting errors
- Enables real-time updates
- Improves accuracy

### Automatic Reordering
- Set reorder points for each item
- Generate purchase orders automatically
- Send orders directly to suppliers
- Track delivery dates

### Integration with Work Orders
- Parts automatically deducted when used
- Real-time availability checking
- Cost tracking by job
- Margin analysis by work order

## Common Inventory Challenges

### 1. Overstocking
**Causes:**
- Buying too much to get volume discounts
- Poor sales forecasting
- Obsolete items taking up space

**Solutions:**
- Regular analysis of turn rates
- Return agreements with suppliers
- Better demand forecasting
- Liquidation of slow movers

### 2. Stockouts
**Causes:**
- Inaccurate reorder points
- Supplier delivery problems
- Unexpected demand spikes

**Solutions:**
- Safety stock for critical items
- Multiple supplier sources
- Better demand forecasting
- Emergency ordering procedures

### 3. Shrinkage
**Causes:**
- Theft (internal or external)
- Measurement errors
- Damage or obsolescence
- Poor record keeping

**Solutions:**
- Secure storage for valuable items
- Regular cycle counts
- Employee training
- Video surveillance

## Inventory Reports and KPIs

### Key Metrics to Track

**Turn Rate:**
- How many times per year inventory sells
- Target: 4-12 times depending on item type
- Formula: Annual usage ÷ Average inventory

**Days on Hand:**
- How many days of inventory you have
- Target: 30-90 days depending on item
- Formula: (Current stock ÷ Average daily usage)

**Fill Rate:**
- Percentage of demands filled from stock
- Target: 95%+ for A items, 90%+ for B items
- Formula: (Orders filled ÷ Total orders) × 100

### Regular Reports

**Daily:**
- Low stock alerts
- Items used today
- Emergency orders needed

**Weekly:**
- Slow-moving items report
- Supplier performance
- Cost variance analysis

**Monthly:**
- Full inventory valuation
- Turn rate analysis
- Obsolete inventory review

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

### Month 2 and Beyond
1. Add remaining inventory items
2. Implement barcode scanning
3. Set up automatic reordering
4. Regular performance review

## Pro Tips for Success

- **Start Small**: Begin with your most critical items
- **Use Data**: Let usage history guide your decisions
- **Train Everyone**: All staff should understand the system
- **Regular Reviews**: Monthly analysis prevents problems
- **Stay Organized**: Good physical organization supports system accuracy

Proper inventory management takes time to implement but pays huge dividends in efficiency, customer satisfaction, and profitability. Start with the basics and build your system gradually.',
  'Guide to setting up and managing essential inventory items for your repair shop.',
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

**Service Authorization:**
1. Create work order with detailed description
2. Explain all services and costs
3. Get written approval for work
4. Set realistic completion expectations
5. Provide customer with copy of work order

### Scheduled Appointments

**Arrival Processing (3-5 minutes):**
1. Greet customer by name
2. Confirm appointment details
3. Review any changes since scheduling
4. Update customer information if needed
5. Begin vehicle inspection process

**Service Confirmation:**
1. Walk through planned services
2. Note any additional concerns
3. Confirm pricing and timing
4. Get signature on work authorization
5. Arrange for customer transportation if needed

## Work Order Management Throughout the Day

### Status Updates

**Regular Check-ins:**
- Update work order status every 2-3 hours
- Note any complications or delays
- Document additional work needed
- Track actual time vs. estimated time
- Communicate with customers as needed

**Customer Communication:**
- Call immediately if additional work is needed
- Text updates for routine progress
- Email completion notifications
- Provide photos when helpful
- Always get approval before additional work

### Quality Control

**Work in Progress:**
- Supervisor checks on complex repairs
- Verify correct parts are being used
- Ensure proper procedures are followed
- Address any technician questions
- Monitor productivity and quality

**Pre-Completion Inspection:**
- Test all repaired systems
- Check for related issues
- Verify no new problems created
- Clean work area and vehicle
- Prepare for customer pickup

## Parts and Inventory Management

### Daily Parts Tasks

**Morning Inventory Check:**
1. Review yesterday''s parts usage
2. Check low stock alerts
3. Verify parts for today''s scheduled work
4. Process emergency orders if needed
5. Receive and check in new shipments

**Parts Issue Process:**
1. Verify part numbers against work orders
2. Check quality and condition
3. Update inventory quantities
4. Note any backorders or substitutions
5. Document all parts usage

**End-of-Day Inventory:**
1. Process returns and cores
2. Update minimum quantities if needed
3. Place orders for tomorrow''s needs
4. Secure valuable inventory
5. Update inventory records

## Customer Pickup Process

### Pickup Preparation (5-10 minutes before arrival)

**Final Vehicle Inspection:**
1. Test drive if repairs were significant
2. Check all work was completed correctly
3. Clean interior and exterior as appropriate
4. Remove protective covers
5. Prepare vehicle keys and paperwork

**Invoice Preparation:**
1. Verify all parts and labor charges
2. Apply any discounts or promotions
3. Calculate taxes and fees
4. Prepare warranty information
5. Print invoice and work order

### Customer Pickup Interaction

**Vehicle Walkthrough:**
1. Explain all work performed
2. Show old parts if appropriate
3. Review warranty coverage
4. Provide maintenance recommendations
5. Answer any customer questions

**Payment Processing:**
1. Review invoice line by line
2. Process payment method
3. Provide receipt and warranty info
4. Schedule future appointments if needed
5. Thank customer and request feedback

## Closing Procedures (End of Day)

### Service Department Closing (15-20 minutes)

**Work Order Review:**
1. Update all work order statuses
2. Note any work to continue tomorrow
3. Secure vehicles and keys
4. Clean work areas
5. Document any equipment issues

**Customer Communication:**
1. Call customers with completion updates
2. Send pickup appointment confirmations
3. Follow up on any promises made
4. Update appointment schedule
5. Prepare tomorrow''s customer files

### Administrative Closing (10-15 minutes)

**Financial Tasks:**
1. Process all payments received
2. Prepare bank deposit
3. Review daily sales totals
4. Check for payment processing errors
5. Secure cash and payments

**System Updates:**
1. Complete all work order entries
2. Update inventory usage
3. Process warranty claims
4. Review technician productivity
5. Backup important data

### Facility Security

**Shop Closing:**
1. Secure all tools and equipment
2. Turn off unnecessary equipment
3. Check heating/cooling systems
4. Arm security systems
5. Lock all doors and gates

## Weekly Review and Planning

### Monday Morning Planning

**Weekly Priorities:**
1. Review upcoming week''s appointments
2. Plan major repairs and scheduling
3. Check parts availability for the week
4. Review staffing and vacation schedules
5. Set weekly goals and targets

**Maintenance Tasks:**
1. Review equipment maintenance schedules
2. Update technician training plans
3. Analyze previous week''s performance
4. Plan any facility improvements
5. Review supplier relationships

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

### Customer Service Metrics
- **On-time completion rate**
- **Customer wait times**
- **Repeat customer percentage**
- **Complaint resolution time**
- **Referral rates**

## Tips for Maintaining Consistency

### Standard Operating Procedures
- Document all critical processes
- Train all staff on procedures
- Regular review and updates
- Consistent enforcement
- Continuous improvement

### Communication Protocols
- Regular team meetings
- Clear escalation procedures
- Customer communication standards
- Emergency contact procedures
- Technology usage guidelines

### Quality Assurance
- Regular work quality reviews
- Customer feedback analysis
- Equipment maintenance schedules
- Safety protocol compliance
- Continuous staff training

## Troubleshooting Common Daily Issues

### Schedule Disruptions
- Emergency appointments
- No-show customers
- Equipment breakdowns
- Staff absences
- Parts delivery delays

### Customer Service Challenges
- Unhappy customers
- Payment disputes
- Warranty claims
- Vehicle damage
- Miscommunication

### Operational Problems
- Inventory shortages
- Quality issues
- Time management
- Equipment failures
- Staff conflicts

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

## Remember: Consistency is Key

The most successful shops are those that execute basic operations consistently and reliably. Focus on getting the fundamentals right before adding complexity. Your customers will appreciate the predictable, professional service, and your team will work more efficiently with clear procedures to follow.

Regular review and refinement of your daily workflows will help you continuously improve your operations and stay competitive in your market.',
  'Comprehensive guide to daily operational workflows and procedures for efficient shop management.',
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