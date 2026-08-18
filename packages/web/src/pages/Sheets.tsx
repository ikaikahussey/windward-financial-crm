import { useAuth } from '@/hooks/useAuth';
import Clients from '@/pages/Clients';
import Referrals from '@/pages/Referrals';
import Payments from '@/pages/Payments';

/**
 * Single-document CRM workbook: Clients, Referrals, and (admin only)
 * Payments, stacked as sections of one page. Agents never see the
 * Payments section — and the API rejects them there too.
 */
export default function Sheets() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Spreadsheets</h1>
      <div className="space-y-10">
        <Clients />
        <Referrals />
        {isAdmin && <Payments />}
      </div>
    </div>
  );
}
