import { X, Printer, ShoppingBag } from 'lucide-react';
import type { SaleDetail } from '../../types/sale';
import type { Tenant } from '../../types/tenant';
import Button from '../ui/Button';

interface Props {
  sale: SaleDetail;
  tenant: Tenant | null;
  onClose: () => void;
}

const FR = new Intl.NumberFormat('fr-FR');

function fmtMoney(v: number, currency = 'FCFA') {
  return `${FR.format(Math.round(v))} ${currency}`;
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildPrintHtml(sale: SaleDetail, tenant: Tenant | null): string {
  const currency = tenant?.currency ?? 'FCFA';
  const logoUrl = tenant?.logoDataUri ?? '';

  const rows = sale.items.map(item => `
    <tr>
      <td style="padding:4px 6px;border-bottom:1px solid #eee;">${item.productName}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${item.quantity}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${FR.format(item.unitPrice)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;font-weight:600;">${FR.format(item.lineTotal)}</td>
    </tr>
  `).join('');

  const kindLabel = sale.kind === 'wholesale' ? 'En gros' : 'Détail';
  const payLabel  = sale.credit ? 'À crédit' : 'Comptant';
  const ref       = sale.id.slice(-8).toUpperCase();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket #${ref}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #111;
           background: #fff; width: 400px; margin: 0 auto; padding: 20px 12px; }
    .watermark {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      opacity: 0.06; pointer-events: none; z-index: 0;
    }
    .watermark img { width: 260px; height: 260px; object-fit: contain; }
    .content { position: relative; z-index: 1; }
    .logo-top { text-align: center; margin-bottom: 10px; }
    .logo-top img { max-height: 70px; max-width: 160px; object-fit: contain; }
    h1 { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 2px; }
    .subtitle { text-align: center; font-size: 11px; color: #555; margin-bottom: 12px; }
    .divider { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
    .info-row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
    thead th { border-bottom: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 10px; text-transform: uppercase; color: #666; }
    thead th:nth-child(2), thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    .total-row { display: flex; justify-content: space-between; align-items: baseline;
                 margin-top: 10px; padding-top: 6px; border-top: 2px solid #111; }
    .total-label { font-size: 13px; font-weight: bold; }
    .total-amount { font-size: 18px; font-weight: bold; }
    .footer { margin-top: 16px; font-size: 10px; color: #666; text-align: center; line-height: 1.6; }
    @media print {
      body { width: 100%; margin: 0; padding: 10px; }
      .watermark { position: fixed; }
    }
  </style>
</head>
<body>
${logoUrl ? `<div class="watermark"><img src="${logoUrl}" alt=""/></div>` : ''}
<div class="content">
  ${logoUrl ? `<div class="logo-top"><img src="${logoUrl}" alt="logo"/></div>` : ''}
  <h1>${tenant?.name ?? 'Commerce'}</h1>
  <p class="subtitle">${sale.storeName}</p>

  <hr class="divider"/>
  <div class="info-row"><span>Date :</span><span>${fmtDatetime(sale.createdAt)}</span></div>
  <div class="info-row"><span>Ticket :</span><span>#${ref}</span></div>
  <div class="info-row"><span>Type :</span><span>${kindLabel} · ${payLabel}</span></div>
  ${sale.customerName ? `<div class="info-row"><span>Client :</span><span>${sale.customerName}</span></div>` : ''}
  <hr class="divider"/>

  <table>
    <thead>
      <tr>
        <th>Article</th>
        <th style="text-align:right">Qté</th>
        <th style="text-align:right">P.U.</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="total-row">
    <span class="total-label">TOTAL</span>
    <span class="total-amount">${fmtMoney(sale.total, currency)}</span>
  </div>

  <p class="footer">
    Merci de votre achat !<br/>
    ${new Date().getFullYear()} — ${tenant?.name ?? 'Commerce'}
  </p>
</div>
<script>window.onload=function(){window.print();window.close();}</script>
</body>
</html>`;
}

export default function SaleReceiptModal({ sale, tenant, onClose }: Props) {
  const currency = tenant?.currency ?? 'FCFA';
  const ref      = sale.id.slice(-8).toUpperCase();

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=460,height=700');
    if (!win) return;
    win.document.write(buildPrintHtml(sale, tenant));
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-0 md:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full md:w-[480px] bg-surface rounded-t-2xl md:rounded-card shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2 text-ink font-semibold">
            <ShoppingBag size={18} className="text-brand-500" />
            Vente enregistrée — Ticket #{ref}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-canvas text-muted">
            <X size={20} />
          </button>
        </div>

        {/* Receipt preview */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="bg-white border border-line rounded-card p-5 font-mono text-xs text-ink shadow-inner">
            <p className="text-center font-bold text-base mb-0.5">{tenant?.name ?? 'Commerce'}</p>
            <p className="text-center text-muted text-[11px] mb-3">{sale.storeName}</p>

            <div className="border-t border-dashed border-line my-2" />

            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted">Date</span>
              <span>{fmtDatetime(sale.createdAt)}</span>
            </div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted">Ticket</span>
              <span>#{ref}</span>
            </div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted">Type</span>
              <span>{sale.kind === 'wholesale' ? 'En gros' : 'Détail'} · {sale.credit ? 'À crédit' : 'Comptant'}</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-muted">Client</span>
                <span>{sale.customerName}</span>
              </div>
            )}

            <div className="border-t border-dashed border-line my-2" />

            {/* Items */}
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-muted">
                  <th className="text-left pb-1 font-normal">Article</th>
                  <th className="text-right pb-1 font-normal">Qté</th>
                  <th className="text-right pb-1 font-normal">P.U.</th>
                  <th className="text-right pb-1 font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map(item => (
                  <tr key={item.id} className="border-t border-line/50">
                    <td className="py-1 pr-2 truncate max-w-[120px]">{item.productName}</td>
                    <td className="py-1 text-right">{item.quantity}</td>
                    <td className="py-1 text-right">{FR.format(item.unitPrice)}</td>
                    <td className="py-1 text-right font-semibold">{FR.format(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t-2 border-ink mt-2 pt-2 flex justify-between items-baseline">
              <span className="font-bold text-sm">TOTAL</span>
              <span className="font-bold text-lg">{fmtMoney(sale.total, currency)}</span>
            </div>

            <div className="border-t border-dashed border-line mt-3 pt-2 text-center text-[10px] text-muted">
              Merci de votre achat !
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-line shrink-0">
          <Button variant="secondary" onClick={onClose} className="flex-1 min-h-[48px]">
            <ShoppingBag size={18} /> Nouvelle vente
          </Button>
          <Button onClick={handlePrint} className="flex-1 min-h-[48px]">
            <Printer size={18} /> Imprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
