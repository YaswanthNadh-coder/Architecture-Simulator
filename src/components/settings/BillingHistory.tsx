import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { StripeService, type Invoice } from '../../lib/stripeService';
import { formatPrice, formatBillingDate } from '../../lib/billingUtils';

export const BillingHistory = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StripeService.seedDemoInvoices();
    StripeService.getInvoices().then(data => {
      setInvoices(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-text-muted">No invoices yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-panel">
            <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Date</th>
            <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Description</th>
            <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Amount</th>
            <th className="text-center py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Status</th>
            <th className="text-center py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium w-12"></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t border-border-subtle/50 hover:bg-white/[0.02] transition-colors">
              <td className="py-3 px-4 text-text-main text-xs">{formatBillingDate(inv.date)}</td>
              <td className="py-3 px-4 text-text-main text-xs">{inv.description}</td>
              <td className="py-3 px-4 text-white text-xs text-right font-medium">{formatPrice(inv.amountCents)}</td>
              <td className="py-3 px-4 text-center">
                <StatusBadge status={inv.status} />
              </td>
              <td className="py-3 px-4 text-center">
                <button className="text-text-muted hover:text-white transition-colors" title="Download invoice">
                  <Download size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const styles: Record<Invoice['status'], string> = {
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    failed: 'bg-hazard/10 text-hazard border-hazard/20',
    refunded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}
