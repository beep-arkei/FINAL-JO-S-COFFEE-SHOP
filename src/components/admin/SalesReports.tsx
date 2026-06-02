import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import type { Transaction } from '@/lib/data';
import { Download, Eye, RotateCcw, X, FileText, CalendarIcon, Ban, Undo2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, isWithinInterval, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';
const CHART_COLORS = ['hsl(25, 45%, 35%)', 'hsl(30, 40%, 50%)', 'hsl(140, 50%, 40%)', 'hsl(200, 50%, 45%)', 'hsl(0, 70%, 50%)', 'hsl(280, 40%, 50%)', 'hsl(45, 70%, 50%)', 'hsl(170, 50%, 40%)'];

const SalesReports = () => {
  const { transactions, session, settings, updateTransaction } = useData();
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [excludeVoidedRefunds, setExcludeVoidedRefunds] = useState(false);
  const [printExcludeVoided, setPrintExcludeVoided] = useState(false);
  const [printExcludeRefunded, setPrintExcludeRefunded] = useState(false);

  // States to dynamically toggle sections in print/export layout
  const [printSummary, setPrintSummary] = useState(true);
  const [printTopItems, setPrintTopItems] = useState(true);
  const [printCashierRanking, setPrintCashierRanking] = useState(true);
  const [printTransactionsList, setPrintTransactionsList] = useState(true);

  const filtered = useMemo(() => {
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return transactions.filter(t => {
      const txDate = parseISO(t.timestamp);
      switch (datePreset) {
        case 'today': return txDate >= today;
        case 'yesterday': { const yd = subDays(today, 1); return txDate >= yd && txDate < today; }
        case 'week': return txDate >= startOfWeek(today, { weekStartsOn: 1 });
        case 'month': return txDate >= startOfMonth(today);
        case 'year': return txDate >= startOfYear(today);
        case 'all': return true;
        case 'custom': if (customStart && customEnd) { const eod = new Date(customEnd); eod.setHours(23,59,59,999); return isWithinInterval(txDate, { start: customStart, end: eod }); } if (customStart) return txDate >= customStart; return true;
        default: return true;
      }
    });
  }, [transactions, datePreset, customStart, customEnd]);

  const paidFiltered = filtered.filter(t => t.status === 'paid');
  const refundedFiltered = useMemo(() => {
    let list = filtered.filter(t => t.status === 'refunded');
    if (excludeVoidedRefunds) {
      list = list.filter(t => t.status !== 'voided');
    }
    return list;
  }, [filtered, excludeVoidedRefunds]);
  const voidedFiltered = filtered.filter(t => t.status === 'voided');
  const totalRevenue = paidFiltered.reduce((s, t) => s + t.total, 0);
  const totalRefunds = refundedFiltered.reduce((s, t) => s + t.total, 0);
  const netRevenue = totalRevenue - totalRefunds;

  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  paidFiltered.forEach(t => t.items.forEach(i => { const key = `${i.name}-${i.size}`; if (!itemCounts[key]) itemCounts[key] = { name: `${i.name}${i.size !== 'default' ? ` (${i.size})` : ''}`, count: 0, revenue: 0 }; itemCounts[key].count += i.quantity; itemCounts[key].revenue += i.price * i.quantity; }));
  const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 10);

  const categoryRevenue: Record<string, number> = {};
  paidFiltered.forEach(t => t.items.forEach(i => { categoryRevenue[i.name] = (categoryRevenue[i.name] || 0) + i.price * i.quantity; }));
  const categoryData = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, value }));

  const dailySales: Record<string, number> = {};
  paidFiltered.forEach(t => { const day = t.timestamp.slice(0, 10); dailySales[day] = (dailySales[day] || 0) + t.total; });
  const trendData = Object.entries(dailySales).sort((a, b) => a[0].localeCompare(b[0])).map(([date, total]) => ({ date: format(parseISO(date), 'MMM dd'), total }));

  const cashierStats: Record<string, { count: number; revenue: number }> = {};
  paidFiltered.forEach(t => { if (!cashierStats[t.cashier]) cashierStats[t.cashier] = { count: 0, revenue: 0 }; cashierStats[t.cashier].count++; cashierStats[t.cashier].revenue += t.total; });
  const cashierRanking = Object.entries(cashierStats).sort((a, b) => b[1].revenue - a[1].revenue);

  const handleRefund = async (tx: Transaction) => { if (!confirm(`Refund transaction ${tx.code}?`)) return; await updateTransaction(tx.id, { status: 'refunded', refundedAt: new Date().toISOString(), refundedBy: session?.username }); };
  const handleUnrefund = async (tx: Transaction) => { if (!confirm(`Undo refund for ${tx.code}?`)) return; await updateTransaction(tx.id, { status: 'paid', refundedAt: undefined, refundedBy: undefined }); };
  const handleVoid = async (tx: Transaction) => { if (!confirm(`Void transaction ${tx.code}?`)) return; await updateTransaction(tx.id, { voided: true, voidedAt: new Date().toISOString(), voidedBy: session?.username }); };
  const handleUnvoid = async (tx: Transaction) => { if (!confirm(`Undo void for ${tx.code}?`)) return; await updateTransaction(tx.id, { voided: false, voidedAt: undefined, voidedBy: undefined }); };

  const getDateLabel = () => { switch (datePreset) { case 'today': return 'Today'; case 'yesterday': return 'Yesterday'; case 'week': return 'This Week'; case 'month': return 'This Month'; case 'year': return 'This Year'; case 'all': return 'All Time'; case 'custom': if (customStart && customEnd) return `${format(customStart, 'MMM dd')} - ${format(customEnd, 'MMM dd')}`; if (customStart) return `From ${format(customStart, 'MMM dd')}`; return 'Custom Range'; default: return ''; } };

  const exportCSV = () => { const rows = [['Transaction ID','Date','Cashier','Customer','Items','Total','Status']]; filtered.forEach(t => rows.push([t.code, new Date(t.timestamp).toLocaleString(), t.cashier, t.customerName||'', t.items.map(i=>`${i.quantity}x ${i.name}`).join('; '), t.total.toFixed(2), t.status])); const csv = rows.map(r=>r.join(',')).join('\n'); const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`sales-report-${datePreset}.csv`; a.click(); URL.revokeObjectURL(url); };

  const generateReportData = (config: { excludeVoided: boolean; excludeRefunded: boolean }) => {
    let reportTransactions = [...filtered];
    if (config.excludeVoided) {
      reportTransactions = reportTransactions.filter(t => t.status !== 'voided');
    }
    if (config.excludeRefunded) {
      reportTransactions = reportTransactions.filter(t => t.status !== 'refunded');
    }

    const paidTxs = reportTransactions.filter(t => t.status === 'paid');
    const refundedTxs = reportTransactions.filter(t => t.status === 'refunded');

    const totalRevenueVal = paidTxs.reduce((s, t) => s + t.total, 0);
    const totalRefundsVal = refundedTxs.reduce((s, t) => s + t.total, 0);
    const netRevenueVal = totalRevenueVal - totalRefundsVal;

    const itemsMap: Record<string, { name: string; count: number; revenue: number }> = {};
    paidTxs.forEach(t => t.items.forEach(i => {
      const key = `${i.name}-${i.size}`;
      if (!itemsMap[key]) {
        itemsMap[key] = { name: `${i.name}${i.size !== 'default' ? ` (${i.size})` : ''}`, count: 0, revenue: 0 };
      }
      itemsMap[key].count += i.quantity;
      itemsMap[key].revenue += i.price * i.quantity;
    }));
    const topItemsList = Object.values(itemsMap).sort((a, b) => b.count - a.count).slice(0, 10);

    const cashMap: Record<string, { count: number; revenue: number }> = {};
    paidTxs.forEach(t => {
      if (!cashMap[t.cashier]) {
        cashMap[t.cashier] = { count: 0, revenue: 0 };
      }
      cashMap[t.cashier].count++;
      cashMap[t.cashier].revenue += t.total;
    });
    const cashierRankingList = Object.entries(cashMap).sort((a, b) => b[1].revenue - a[1].revenue);

    return {
      reportTransactions,
      totalRevenue: totalRevenueVal,
      totalRefunds: totalRefundsVal,
      netRevenue: netRevenueVal,
      topItems: topItemsList,
      cashierRanking: cashierRankingList,
    };
  };

  const exportPDF = () => {
    const pw = window.open('', '_blank'); if (!pw) return;
    const reportData = generateReportData({ excludeVoided: printExcludeVoided, excludeRefunded: printExcludeRefunded });
    
    let htmlContent = `<html><head><title>Sales Report - ${getDateLabel()}</title><style>body{font-family:'Segoe UI',sans-serif;padding:20px;color:#333;font-size:12px}h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;margin-top:16px;margin-bottom:8px;border-bottom:1px solid #ddd;padding-bottom:4px}.meta{color:#666;font-size:11px;margin-bottom:12px}.summary{display:flex;gap:16px;margin-bottom:16px}.card{border:1px solid #ddd;border-radius:6px;padding:10px;flex:1}.card .label{font-size:10px;color:#888}.card .value{font-size:16px;font-weight:bold;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:4px 8px;text-align:left}th{background:#f5f5f5}.refunded{color:#e33;text-decoration:line-through}@media print{body{padding:0}}</style></head><body>
    <h1>${settings.name} — Sales Report</h1><div class="meta">Period: ${getDateLabel()} | Generated: ${new Date().toLocaleString()} | By: ${session?.username}</div>`;

    if (printSummary) {
      htmlContent += `<div class="summary"><div class="card"><div class="label">Gross Revenue</div><div class="value">₱${reportData.totalRevenue.toFixed(2)}</div></div><div class="card"><div class="label">Refunds</div><div class="value" style="color:#e33">-₱${reportData.totalRefunds.toFixed(2)}</div></div><div class="card"><div class="label">Net Revenue</div><div class="value">₱${reportData.netRevenue.toFixed(2)}</div></div><div class="card"><div class="label">Transactions</div><div class="value">${reportData.reportTransactions.length}</div></div></div>`;
    }

    if (printTopItems) {
      htmlContent += `<h2>Top Selling Items</h2><table><tr><th>Item</th><th>Qty</th><th>Revenue</th></tr>${reportData.topItems.map(i=>`<tr><td>${i.name}</td><td>${i.count}</td><td>₱${i.revenue.toFixed(2)}</td></tr>`).join('')}</table>`;
    }

    if (printCashierRanking) {
      htmlContent += `<h2>Cashier Performance</h2><table><tr><th>Cashier</th><th>Orders</th><th>Revenue</th></tr>${reportData.cashierRanking.map(([c,s])=>`<tr><td>${c}</td><td>${s.count}</td><td>₱${s.revenue.toFixed(2)}</td></tr>`).join('')}</table>`;
    }

    if (printTransactionsList) {
      htmlContent += `<h2>All Transactions</h2><table><tr><th>ID</th><th>Date</th><th>Cashier</th><th>Customer</th><th>Total</th><th>Status</th></tr>${reportData.reportTransactions.slice().reverse().map(t=>`<tr class="${t.status==='refunded'?'refunded':''}"><td>${t.code}</td><td>${new Date(t.timestamp).toLocaleString()}</td><td>${t.cashier}</td><td>${t.customerName||'-'}</td><td>₱${t.total.toFixed(2)}</td><td>${t.status}</td></tr>`).join('')}</table>`;
    }

    htmlContent += `</body></html>`;
    
    pw.document.write(htmlContent);
    pw.document.close(); pw.print();
  };

  const presets: { value: DatePreset; label: string }[] = [{ value:'today',label:'Today' },{ value:'yesterday',label:'Yesterday' },{ value:'week',label:'This Week' },{ value:'month',label:'This Month' },{ value:'year',label:'This Year' },{ value:'all',label:'All Time' },{ value:'custom',label:'Custom Range' }];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="font-display text-2xl font-bold text-foreground">Sales Reports</h2><p className="text-muted-foreground text-sm">View sales data and analytics — {getDateLabel()}</p></div>
        <div className="flex items-center gap-2">
          <select value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">{presets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
          {datePreset === 'custom' && (
            <div className="flex gap-1 items-center">
              <Popover><PopoverTrigger asChild><button className={cn("flex items-center gap-1 px-3 py-2 rounded-lg border border-input bg-background text-sm", !customStart && "text-muted-foreground")}><CalendarIcon size={14} />{customStart ? format(customStart, 'MMM dd, yyyy') : 'Start'}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customStart} onSelect={setCustomStart} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
              <span className="text-muted-foreground text-sm">to</span>
              <Popover><PopoverTrigger asChild><button className={cn("flex items-center gap-1 px-3 py-2 rounded-lg border border-input bg-background text-sm", !customEnd && "text-muted-foreground")}><CalendarIcon size={14} />{customEnd ? format(customEnd, 'MMM dd, yyyy') : 'End'}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
            </div>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90"><Download size={16} /> CSV</button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"><FileText size={16} /> Print / PDF</button>
        </div>
      </div>

      <div className="bg-muted/40 p-4 rounded-xl border border-border mb-4 space-y-3 print-hide">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Filter Settings for Print:</span>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={printExcludeVoided} onChange={e => setPrintExcludeVoided(e.target.checked)} className="rounded text-primary border-input w-3.5 h-3.5" />
              <span>Exclude Voided Items</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={printExcludeRefunded} onChange={e => setPrintExcludeRefunded(e.target.checked)} className="rounded text-primary border-input w-3.5 h-3.5" />
              <span>Exclude Refunded Items</span>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Include Sections in PDF/Print:</span>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={printSummary} onChange={e => setPrintSummary(e.target.checked)} className="rounded text-primary border-input w-3.5 h-3.5" />
              <span>Summary Cards & Charts</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={printTopItems} onChange={e => setPrintTopItems(e.target.checked)} className="rounded text-primary border-input w-3.5 h-3.5" />
              <span>Top Selling Items</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={printCashierRanking} onChange={e => setPrintCashierRanking(e.target.checked)} className="rounded text-primary border-input w-3.5 h-3.5" />
              <span>Cashier Performance</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={printTransactionsList} onChange={e => setPrintTransactionsList(e.target.checked)} className="rounded text-primary border-input w-3.5 h-3.5" />
              <span>Transactions List</span>
            </label>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-4 gap-4 mb-6 ${!printSummary ? 'print-hide hidden-section' : ''}`}>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-muted-foreground text-sm">Gross Revenue</p><p className="font-display text-2xl font-bold text-foreground mt-1">₱{totalRevenue.toFixed(2)}</p></div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground text-sm">Refunds</p>
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer select-none" title="Exclude voided refunds from calculations">
              <input 
                type="checkbox" 
                checked={excludeVoidedRefunds} 
                onChange={e => setExcludeVoidedRefunds(e.target.checked)} 
                className="rounded border-input text-primary w-3 h-3" 
              />
              <span>Excl. Voided</span>
            </label>
          </div>
          <p className="font-display text-2xl font-bold text-destructive mt-1">-₱{totalRefunds.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-muted-foreground text-sm">Net Revenue</p><p className="font-display text-2xl font-bold text-foreground mt-1">₱{netRevenue.toFixed(2)}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-muted-foreground text-sm">Transactions</p><p className="font-display text-2xl font-bold text-foreground mt-1">{filtered.length}{voidedFiltered.length > 0 && <span className="text-sm text-muted-foreground font-normal ml-1">({voidedFiltered.length} voided)</span>}</p></div>
      </div>

      {paidFiltered.length > 0 && (
        <div className={`grid grid-cols-2 gap-6 mb-6 ${!printSummary ? 'print-hide hidden-section' : ''}`}>
          <div className="bg-card rounded-xl border border-border p-4"><h3 className="font-display text-lg font-bold text-foreground mb-3">Sales Trend</h3><ResponsiveContainer width="100%" height={200}><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(30,20%,85%)" /><XAxis dataKey="date" tick={{fontSize:10}} stroke="hsl(25,10%,50%)" /><YAxis tick={{fontSize:10}} stroke="hsl(25,10%,50%)" /><Tooltip formatter={(v:number)=>`₱${v.toFixed(2)}`} /><Line type="monotone" dataKey="total" stroke="hsl(25,45%,35%)" strokeWidth={2} dot={{r:3}} /></LineChart></ResponsiveContainer></div>
          <div className="bg-card rounded-xl border border-border p-4"><h3 className="font-display text-lg font-bold text-foreground mb-3">Item Revenue Distribution</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name})=>name}>{categoryData.map((_,idx)=><Cell key={idx} fill={CHART_COLORS[idx%CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(v:number)=>`₱${v.toFixed(2)}`} /></PieChart></ResponsiveContainer></div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className={`bg-card rounded-xl border border-border p-4 ${!printTopItems ? 'print-hide hidden-section' : ''}`}>
          <h3 className="font-display text-lg font-bold text-foreground mb-3">Top Selling Items</h3>
          {topItems.length === 0 ? <p className="text-muted-foreground text-sm">No sales data</p> : <div className="space-y-2">{topItems.map((item, idx) => (<div key={idx} className="flex justify-between items-center py-2 border-b border-border last:border-0"><div><span className="text-sm font-medium text-foreground">{item.name}</span><span className="text-xs text-muted-foreground ml-2">({item.count} sold)</span></div><span className="text-sm font-bold text-foreground">₱{item.revenue.toFixed(2)}</span></div>))}</div>}
        </div>
        <div className={`bg-card rounded-xl border border-border p-4 ${!printCashierRanking ? 'print-hide hidden-section' : ''}`}>
          <h3 className="font-display text-lg font-bold text-foreground mb-3">Cashier Performance</h3>
          {cashierRanking.length === 0 ? <p className="text-muted-foreground text-sm">No data</p> : <div className="space-y-2">{cashierRanking.map(([cashier, stats], idx) => (<div key={cashier} className="flex justify-between items-center py-2 border-b border-border last:border-0"><div><span className="text-sm font-medium text-foreground">{idx===0?'🥇 ':idx===1?'🥈 ':idx===2?'🥉 ':''}{cashier}</span><span className="text-xs text-muted-foreground ml-2">({stats.count} orders)</span></div><span className="text-sm font-bold text-foreground">₱{stats.revenue.toFixed(2)}</span></div>))}</div>}
        </div>
        <div className={`bg-card rounded-xl border border-border p-4 ${!printTransactionsList ? 'print-hide hidden-section' : ''}`}>
          <h3 className="font-display text-lg font-bold text-foreground mb-3">Transactions</h3>
          {filtered.length === 0 ? <p className="text-muted-foreground text-sm">No transactions for this period</p> : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {filtered.map(tx => (
                <div key={tx.id} className={`py-2 border-b border-border last:border-0 ${tx.status !== 'paid' ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between text-sm"><span className="font-medium text-foreground">{tx.code}</span><span className="font-bold text-foreground">₱{tx.total.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-0.5"><span>{new Date(tx.timestamp).toLocaleTimeString()}</span><span>{tx.cashier}{tx.customerName ? ` • ${tx.customerName}` : ''}</span></div>
                  {tx.status !== 'paid' && <span className={`text-[10px] font-medium ${tx.status === 'refunded' ? 'text-destructive' : 'text-muted-foreground'}`}>{tx.status.toUpperCase()}</span>}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <button onClick={() => setViewing(tx)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><Eye size={10} /> Details</button>
                    {tx.status === 'paid' && <button onClick={() => handleRefund(tx)} className="text-[10px] text-destructive hover:underline flex items-center gap-0.5"><RotateCcw size={10} /> Refund</button>}
                    {tx.status === 'refunded' && <button onClick={() => handleUnrefund(tx)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><Undo2 size={10} /> Undo</button>}
                    {tx.status !== 'voided' && <button onClick={() => handleVoid(tx)} className="text-[10px] text-muted-foreground hover:underline flex items-center gap-0.5"><Ban size={10} /> Void</button>}
                    {tx.status === 'voided' && <button onClick={() => handleUnvoid(tx)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><Undo2 size={10} /> Undo</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewing && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={() => setViewing(null)}>
          <div className="bg-card rounded-2xl shadow-xl w-80 max-h-[80vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex justify-between items-center"><h4 className="font-display text-sm font-bold text-foreground">Order Details</h4><button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button></div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Transaction: {viewing.code}</p>
              <p className="text-xs text-muted-foreground">{new Date(viewing.timestamp).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Cashier: {viewing.cashier}</p>
              {viewing.customerName && <p className="text-xs text-muted-foreground">Customer: {viewing.customerName}</p>}
              {viewing.specialInstructions && <p className="text-xs text-muted-foreground">Note: {viewing.specialInstructions}</p>}
              {viewing.status === 'refunded' && <p className="text-xs text-destructive">Refunded at {new Date(viewing.refundedAt!).toLocaleString()} by {viewing.refundedBy}</p>}
              {viewing.status === 'voided' && <p className="text-xs text-muted-foreground">Voided at {new Date(viewing.voidedAt!).toLocaleString()} by {viewing.voidedBy}</p>}
              <div className="border-t border-dashed border-border my-2" />
              {viewing.items.map((item, idx) => (<div key={idx} className="flex justify-between text-xs"><span className="text-foreground">{item.quantity}x {item.name} {item.size !== 'default' ? `(${item.size})` : ''}</span><span className="font-medium text-foreground">₱{(item.price * item.quantity).toFixed(2)}</span></div>))}
              <div className="border-t border-dashed border-border my-2" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>₱{viewing.subtotal.toFixed(2)}</span></div>
              {viewing.adjustment !== 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Adjustment ({viewing.adjustmentInput})</span><span>{viewing.adjustment > 0 ? '+' : ''}₱{viewing.adjustment.toFixed(2)}</span></div>}
              <div className="flex justify-between text-sm font-bold text-foreground"><span>Total</span><span>₱{viewing.total.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Cash</span><span>₱{viewing.cashReceived.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs font-bold text-foreground"><span>Change</span><span>₱{viewing.change.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReports;
