import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getAllTickets } from '@/lib/admin/actions/manageTickets';
import { QueriesClient } from './QueriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminQueriesPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/queries');
  }

  const tickets = await getAllTickets();

  return (
    <div className="space-y-6 font-inter pb-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 font-manrope">Support Tickets</h1>
        <p className="text-xs font-semibold text-gray-500 font-inter">
          Live chat with customers across all support tickets.
        </p>
      </div>

      <QueriesClient initialTickets={tickets} adminId={adminUser.id} />
    </div>
  );
}
