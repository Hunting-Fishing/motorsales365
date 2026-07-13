import { supabase } from "@/lib/supabase";

// Maintenance-related roles
const MAINTENANCE_ROLES = [
  'technician',
  'marine_engineer',
  'chief_engineer',
  'deckhand',
  'mate',
  'yard',
  'yard_manager',
  'welder'
];

/**
 * Get unique equipment names from calendar events and work orders
 */
export async function getUniqueEquipment(): Promise<string[]> {
  try {
    // Get equipment from equipment_assets
    const { data: equipment, error } = await supabase
      .from('equipment_assets')
      .select('name, asset_number')
      .order('name');

    if (error) throw error;

    // Create unique equipment list with name (asset_number) format
    const equipmentNames = equipment?.map(eq => 
      eq.asset_number ? `${eq.name} (${eq.asset_number})` : eq.name
    ) || [];

    return [...new Set(equipmentNames)];
  } catch (error) {
    console.error('Error fetching unique equipment:', error);
    return [];
  }
}

/**
 * Get technicians with maintenance-related roles
 */
export async function getMaintenanceTechnicians(): Promise<Array<{ id: string; name: string }>> {
  try {
    // Get all user roles first
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, roles(name)');

    if (rolesError) throw rolesError;

    // Filter for maintenance role user IDs
    const maintenanceUserIds = new Set(
      userRoles
        ?.filter((ur: any) => 
          ur.roles && MAINTENANCE_ROLES.includes(ur.roles.name)
        )
        .map((ur: any) => ur.user_id) || []
    );

    if (maintenanceUserIds.size === 0) {
      return [];
    }

    // Get profiles for those users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', Array.from(maintenanceUserIds))
      .order('first_name');

    if (profilesError) throw profilesError;

    return profiles?.map(profile => ({
      id: profile.id,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
    })) || [];
  } catch (error) {
    console.error('Error fetching maintenance technicians:', error);
    return [];
  }
}
