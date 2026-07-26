/**
 * Display styles for notification priority badges.
 *
 * Ladder: URGENT (red) > HIGH (amber/orange) > MEDIUM (blue) > LOW (gray).
 * HIGH is intentionally distinct from MEDIUM so void/undo alerts are not
 * confused with routine activity, and distinct from URGENT inventory red.
 */
export function getNotificationPriorityBadgeProps(priority: string | null | undefined): {
  variant: 'destructive' | 'secondary' | 'default' | 'outline';
  className: string;
} {
  switch (priority) {
    case 'URGENT':
      return { variant: 'destructive', className: 'text-xs' };
    case 'HIGH':
      return {
        variant: 'outline',
        className:
          'text-xs bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
      };
    case 'LOW':
      return { variant: 'default', className: 'text-xs' };
    case 'MEDIUM':
    default:
      return { variant: 'secondary', className: 'text-xs' };
  }
}
