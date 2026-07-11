/**
 * USAGE EXAMPLES for navigationAccessLogger
 * 
 * This file shows how to integrate the navigation access logger
 * into components that manage navigation permissions.
 */

import { logNavigationAccessChange } from './navigationAccessLogger';

// Example 1: Granting navigation access to specific sections
async function exampleGrantAccess() {
  await logNavigationAccessChange({
    targetUserId: 'user-123',
    targetUserName: 'Mike Johnson',
    grantedBy: 'admin-456',
    grantedByName: 'John Smith',
    sectionsGranted: ['Developer Tools', 'Marketing', 'AI Hub'],
    action: 'granted'
  });
}

// Example 2: Revoking navigation access
async function exampleRevokeAccess() {
  await logNavigationAccessChange({
    targetUserId: 'user-123',
    targetUserName: 'Mike Johnson',
    grantedBy: 'admin-456',
    grantedByName: 'John Smith',
    sectionsRevoked: ['Store', 'Company'],
    action: 'revoked'
  });
}

// Example 3: Reset all special access (return to role defaults)
async function exampleResetAccess() {
  await logNavigationAccessChange({
    targetUserId: 'user-123',
    targetUserName: 'Mike Johnson',
    grantedBy: 'admin-456',
    grantedByName: 'John Smith',
    action: 'reset'
  });
}

// Example 4: Handling multiple changes at once (sections added AND removed)
async function exampleComplexChange() {
  const previousSections = ['Dashboard', 'Inventory', 'Store'];
  const newSections = ['Dashboard', 'Inventory', 'Developer Tools', 'Marketing'];
  
  const sectionsGranted = newSections.filter(s => !previousSections.includes(s));
  const sectionsRevoked = previousSections.filter(s => !newSections.includes(s));
  
  // Log granted sections
  if (sectionsGranted.length > 0) {
    await logNavigationAccessChange({
      targetUserId: 'user-123',
      targetUserName: 'Mike Johnson',
      grantedBy: 'admin-456',
      grantedByName: 'John Smith',
      sectionsGranted,
      action: 'granted'
    });
  }
  
  // Log revoked sections
  if (sectionsRevoked.length > 0) {
    await logNavigationAccessChange({
      targetUserId: 'user-123',
      targetUserName: 'Mike Johnson',
      grantedBy: 'admin-456',
      grantedByName: 'John Smith',
      sectionsRevoked,
      action: 'revoked'
    });
  }
}

/**
 * INTEGRATION INTO PermissionsTab.tsx:
 * 
 * import { logNavigationAccessChange } from '@/utils/team/history';
 * import { useAuthUser } from '@/hooks/useAuthUser';
 * 
 * // Inside your component:
 * const { userId: currentUserId, user } = useAuthUser();
 * 
 * // Inside your mutation after successful update:
 * const updateNavigationAccessMutation = useMutation({
 *   mutationFn: async ({ userId, newGrantedSections, previousSections }) => {
 *     // ... update database ...
 *     
 *     // Calculate changes
 *     const sectionsGranted = newGrantedSections.filter(s => !previousSections.includes(s));
 *     const sectionsRevoked = previousSections.filter(s => !newGrantedSections.includes(s));
 *     
 *     // Log changes
 *     if (sectionsGranted.length > 0) {
 *       await logNavigationAccessChange({
 *         targetUserId: userId,
 *         targetUserName: memberName,
 *         grantedBy: currentUserId,
 *         grantedByName: user?.email || 'System',
 *         sectionsGranted,
 *         action: 'granted'
 *       });
 *     }
 *     
 *     if (sectionsRevoked.length > 0) {
 *       await logNavigationAccessChange({
 *         targetUserId: userId,
 *         targetUserName: memberName,
 *         grantedBy: currentUserId,
 *         grantedByName: user?.email || 'System',
 *         sectionsRevoked,
 *         action: 'revoked'
 *       });
 *     }
 *   }
 * });
 */
