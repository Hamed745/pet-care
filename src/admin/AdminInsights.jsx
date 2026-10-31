import { useMemo, useState } from "react";
import { Activity, ArrowRight, BellRing, CheckCheck, CircleAlert, Clock3, MapPin, Package, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { insightsText } from "./insightsText.js";
import "./insights.css";

const number = (value, language) => new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 0 }).format(Number(value) || 0);
const rub = (value, language) => new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(value) || 0);
const date = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? "—" : time.toLocaleString(language === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

function InsightMetric({ icon: Icon, label, value, detail }) {
  return <div className="pa-insight-metric">
    <span className="pa-insight-metric-icon"><Icon size={18}/></span>
    <strong>{value}</strong><span>{label}</span>
    {detail && <small>{detail}</small>}
  </div>;
}

function InsightPanel({ title, hint, children, action }) {
  return <section className="pa-insight-panel">
    <header className="pa-insight-panel-header"><div><h2>{title}</h2>{hint && <p>{hint}</p>}</div>{action}</header>
    {children}
  </section>;
}

function SalesBars({ trend, language, emptyLabel }) {
  if (!trend?.length || !trend.some((item) => item.revenue)) return <p className="pa-insight-empty">{emptyLabel}</p>;
  const max = Math.max(1, ...trend.map((item) => item.revenue));
  return <div className="pa-insight-chart-scroll"><div className="pa-insight-chart" role="img" aria-label="Completed order value by period">
    {trend.map((item) => <div className="pa-insight-chart-column" key={item.label} title={`${item.label}: ${rub(item.revenue,language)} · ${item.orders}`}>
      <div className="pa-insight-chart-track"><div style={{ height: `${item.revenue ? Math.max(5, item.revenue / max * 100) : 0}%` }}/></div>
      <small>{item.label.slice(-5)}</small>
    </div>)}
  </div></div>;
}

function TopProducts({ items, language, labels }) {
  if (!items?.length) return <p className="pa-insight-empty">{labels.noSales}</p>;
  const max = Math.max(1, ...items.map((item) => item.quantity));
  return <div className="pa-insight-rank-list">{items.map((item) => <div className="pa-insight-rank" key={item.id}>
    <div className="pa-insight-rank-head"><strong>{item.name}</strong><span>{number(item.quantity,language)} {labels.quantity} · {rub(item.revenue,language)}</span></div>
    <div className="pa-insight-rank-track"><span style={{ width: `${item.quantity / max * 100}%` }}/></div>
  </div>)}</div>;
}

function PartialNote({ limited, labels }) {
  return limited ? <div role="note" className="pa-insight-warning"><CircleAlert size={16}/>{labels.partial}</div> : null;
}

export function OverviewInsights({ data, language, onReports, onProducts }) {
  const t = insightsText(language);
  const insights = data.insights || {};
  const summary = insights.summary || {};
  return <div className="pa-insights-block">
    <div className="pa-insight-section-title"><span>{t.last30}</span><button className="pa-insight-link" type="button" onClick={onReports}>{t.goReports}<ArrowRight size={14}/></button></div>
    <div className="pa-insight-metrics">
      <InsightMetric icon={CheckCheck} label={t.completed} value={number(summary.completedOrders,language)}/>
      <InsightMetric icon={Wallet} label={t.completedValue} value={rub(summary.revenue,language)}/>
      <InsightMetric icon={ShoppingBag} label={t.cancelled} value={number(summary.cancelledOrders,language)}/>
      <InsightMetric icon={CircleAlert} label={t.lowStock} value={number(data.lowStockCount,language)}/>
    </div>
    <div className="pa-insight-two-cols">
      <InsightPanel title={t.recentPerformance} hint={t.recentPerformanceHint}>
        <SalesBars trend={insights.trend?.slice(-14)} language={language} emptyLabel={t.noSales}/>
      </InsightPanel>
      <InsightPanel title={t.lowStock} hint={t.lowStockHint} action={<button className="pa-insight-link" type="button" onClick={onProducts}>{t.goProducts}<ArrowRight size={14}/></button>}>
        {data.lowStock?.length ? <div className="pa-insight-low-stock">{data.lowStock.map((item) => <div key={item.id}><Package size={15}/><strong>{item.name}</strong><span>{number(item.stock,language)}</span></div>)}</div> : <p className="pa-insight-empty">{t.noStockAlerts}</p>}
      </InsightPanel>
    </div>
    <p className="pa-insight-footnote">{t.overviewNote}</p>
    <PartialNote limited={data.partial} labels={t}/>
  </div>;
}

export function NotificationsView({ data, language, onMarkRead, busy, onOpenOrder }) {
  const t = insightsText(language);
  const items = data.notifications || [];
  return <InsightPanel title={t.alertsTitle} hint={t.notificationHint} action={
    <button className="pa-outline-button" type="button" onClick={onMarkRead} disabled={busy || !data.unreadCount}><CheckCheck size={15}/>{busy?t.marking:t.markRead}</button>
  }>
    <div className="pa-insight-alert-summary"><BellRing size={18}/><strong>{number(data.unreadCount,language)} {t.unread}</strong>{!data.unreadCount && <span>{t.allRead}</span>}</div>
    {items.length ? <div className="pa-insight-alert-list">{items.map((item) => <article key={item.id} className={`pa-insight-alert-row ${item.unread ? "is-unread" : ""}`}>
      <div className="pa-insight-alert-symbol"><ShoppingBag size={20}/></div>
      <div className="pa-insight-alert-copy"><div className="pa-insight-alert-title"><strong>{t.newOrder} #{item.id}</strong>{item.unread && <span className="pa-insight-new">{t.newOrderBadge}</span>}</div>
        <p>{item.order.customerName || item.order.customerEmail || "—"} · {rub(item.order.total,language)}</p>
        <small><Clock3 size={12}/>{date(item.order.createdAt,language)}</small>
      </div>
      <button className="pa-outline-button" type="button" onClick={() => onOpenOrder(item.order)}>{t.viewOrder}<ArrowRight size={14}/></button>
    </article>)}</div> : <p className="pa-insight-empty">{t.emptyAlerts}</p>}
    {data.limited && <p className="pa-insight-footnote">{t.limitedNotifications}</p>}
  </InsightPanel>;
}

export function ReportsView({ data, language, days, onDaysChange }) {
  const t = insightsText(language);
  const summary = data.summary || {};
  return <div className="pa-insights-block">
    <div className="pa-insight-control"><label htmlFor="pa-report-days">{t.period}</label><select id="pa-report-days" value={days} onChange={(event) => onDaysChange(event.target.value)}>
      <option value="7">{t.period7}</option><option value="30">{t.period30}</option><option value="90">{t.period90}</option><option value="all">{t.periodAll}</option>
    </select></div>
    <p className="pa-insight-footnote">{t.periodBasis}</p>
    <div className="pa-insight-metrics">
      <InsightMetric icon={ShoppingBag} label={t.totalOrders} value={number(summary.totalOrders,language)}/>
      <InsightMetric icon={CheckCheck} label={t.completed} value={number(summary.completedOrders,language)}/>
      <InsightMetric icon={Wallet} label={t.completedValue} value={rub(summary.revenue,language)}/>
      <InsightMetric icon={TrendingUp} label={t.averageOrder} value={rub(summary.averageOrder,language)}/>
      <InsightMetric icon={Clock3} label={t.active} value={number(summary.activeOrders,language)}/>
      <InsightMetric icon={CircleAlert} label={t.cancelled} value={number(summary.cancelledOrders,language)}/>
      <InsightMetric icon={Package} label={t.unitsSold} value={number(summary.unitsSold,language)}/>
      <InsightMetric icon={Wallet} label={t.grossProfit} value={summary.costKnownOrders ? rub(summary.grossProductProfit,language) : "—"}/>
    </div>
    <div className="pa-insight-two-cols">
      <InsightPanel title={t.salesTrend} hint={t.recentPerformanceHint}><SalesBars trend={data.trend} language={language} emptyLabel={t.noSales}/></InsightPanel>
      <InsightPanel title={t.topProducts}><TopProducts items={data.topProducts} language={language} labels={t}/></InsightPanel>
    </div>
    <InsightPanel title={t.grossProfit} hint={t.grossProfitHint}>
      <div className="pa-insight-metrics pa-insight-metrics-compact">
        <InsightMetric icon={Wallet} label={t.productRevenue} value={rub(summary.merchandiseRevenue,language)}/>
        <InsightMetric icon={ShoppingBag} label={t.deliveryFees} value={rub(summary.shippingRevenue,language)}/>
        <InsightMetric icon={CheckCheck} label={t.costCoverage} value={`${number(summary.costKnownOrders,language)} / ${number(summary.completedOrders,language)}`}/>
      </div>
      <p className="pa-insight-footnote">{summary.costKnownOrders ? t.missingCosts : t.profitNotReady}</p>
      <p className="pa-insight-footnote">{t.overviewNote}</p>
    </InsightPanel>
    <PartialNote limited={data.limited} labels={t}/>
  </div>;
}

export function GeographyView({ data, language }) {
  const t = insightsText(language);
  const [selected, setSelected] = useState("");
  const cities = data.cities || [];
  const maximum = Math.max(1, ...cities.map((item) => item.orders));
  const current = cities.find((item) => item.city === selected);
  return <div className="pa-insights-block">
    <div className="pa-insight-metrics">
      <InsightMetric icon={MapPin} label={t.cities} value={number(cities.length,language)}/>
      <InsightMetric icon={ShoppingBag} label={t.orders} value={number(data.ordersCount,language)}/>
      <InsightMetric icon={CheckCheck} label={t.accountsWithCity} value={number(data.usersWithCity,language)}/>
      <InsightMetric icon={CircleAlert} label={t.unknownCity} value={number(data.ordersWithoutCity,language)}/>
    </div>
    <InsightPanel title={t.geoTitle} hint={t.geoHint}>
      {cities.length ? <div className="pa-insight-geo-table">
        <div className="pa-insight-geo-header"><span>{t.cities}</span><span>{t.customers}</span><span>{t.orders}</span><span>{t.completedOrders}</span><span>{t.geoValue}</span></div>
        {cities.map((item) => <button type="button" key={item.city} className={`pa-insight-geo-row ${selected===item.city?"selected":""}`} onClick={() => setSelected(selected===item.city?"":item.city)}>
          <span className="pa-insight-geo-city"><strong>{item.city}</strong><span className="pa-insight-rank-track"><span style={{ width:`${item.orders/maximum*100}%` }}/></span></span>
          <span>{number(item.users,language)}</span><span>{number(item.orders,language)}</span><span>{number(item.completedOrders,language)}</span><span>{rub(item.revenue,language)}</span>
        </button>)}
      </div> : <p className="pa-insight-empty">{t.noCities}</p>}
      {current && <div className="pa-insight-city-selected"><strong>{current.city}</strong><span>{t.customers}: {current.users}</span><span>{t.orders}: {current.orders}</span><span>{t.geoValue}: {rub(current.revenue,language)}</span></div>}
    </InsightPanel>
    <PartialNote limited={data.limited} labels={t}/>
  </div>;
}

export function ActivityView({ data, language, onNext, onPrevious, canPrevious, page }) {
  const t = insightsText(language);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const actions = useMemo(() => [...new Set([
    "order.placed", "order.cancelled_by_customer", "order.status", "product.create", "product.update",
    "user.suspend", "user.restore", "notifications.mark_read",
    ...(data.logs || []).map((item) => item.action),
  ])].filter(Boolean).sort(), [data.logs]);
  const logs = (data.logs || []).filter((item) => (action === "all" || item.action === action) &&
    [item.action,item.actorName,item.actorUid,item.targetId,item.reason].some((value) => String(value || "").toLowerCase().includes(query.toLowerCase())));
  return <InsightPanel title={<><Activity size={20}/>{t.action}</>} hint={t.activityHint}>
    <div className="pa-insight-control pa-insight-activity-controls"><input aria-label={t.searchActivity} placeholder={t.searchActivity} value={query} onChange={(event)=>setQuery(event.target.value)}/>
      <select aria-label={t.allActions} value={action} onChange={(event)=>setAction(event.target.value)}><option value="all">{t.allActions}</option>{actions.map((item)=><option key={item} value={item}>{item}</option>)}</select></div>
    {logs.length ? <div className="pa-insight-table-wrap"><table className="pa-insight-log-table"><thead><tr><th>{t.time}</th><th>{t.action}</th><th>{t.actor}</th><th>{t.target}</th><th>{t.note}</th></tr></thead><tbody>
      {logs.map((log)=><tr key={log.id}><td>{date(log.createdAt,language)}</td><td><strong>{log.action}</strong></td><td title={log.actorUid}>{log.actorName || log.actorUid || "—"}</td><td>{log.targetId || "—"}</td><td>{log.reason || "—"}</td></tr>)}
    </tbody></table></div> : <p className="pa-insight-empty">{t.noActivity}</p>}
    <div className="pa-insight-pagination"><button className="pa-outline-button" type="button" disabled={!canPrevious} onClick={onPrevious}>{t.previous}</button><span>{t.page} {page}</span><button className="pa-outline-button" type="button" disabled={!data.nextCursor} onClick={()=>onNext(data.nextCursor)}>{t.next}</button></div>
  </InsightPanel>;
}
