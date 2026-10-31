import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, BarChart3, BellRing, Check, ChevronRight, ClipboardList, LayoutDashboard, LoaderCircle, MapPin, Package, PawPrint, Plus, RefreshCw, Search, Settings2, ShieldCheck, ShoppingBag, Users, X } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { adminApi } from "./adminApi.js";
import { adminText } from "./i18n.js";
import "./admin.css";

const navItems = [
  { key:"overview",icon:LayoutDashboard },{ key:"users",icon:Users },{ key:"pets",icon:PawPrint },
  { key:"orders",icon:ShoppingBag },{ key:"products",icon:Package },{ key:"cities",icon:MapPin },{ key:"notifications",icon:BellRing },{ key:"reports",icon:BarChart3 },{ key:"audit",icon:Activity },{ key:"settings",icon:Settings2 },
];
const activeStatuses = ["pending","confirmed","preparing","out_for_delivery","ready_for_pickup"];
const orderTransitions = {
  pending:["confirmed","rejected","cancelled"], confirmed:["preparing","cancelled"],
  preparing:["out_for_delivery","ready_for_pickup","cancelled"],
  out_for_delivery:["delivered"], ready_for_pickup:["picked_up"],
  delivered:[],picked_up:[],cancelled:[],rejected:[],
};
const niceStatus = (s) => (s || "pending").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const dateDisplay = (value, language) => {
  const stamp = value?.seconds ? value.seconds * 1000 : value?.toDate ? value.toDate() : value;
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(language === "ru" ? "ru-RU" : "en-GB", {day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"});
};
const money = (v, lang) => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US", {style:"currency",currency:"RUB",maximumFractionDigits:0}).format(Number(v) || 0);
const humanError = (error, tx) => {
  const code = error?.code || "";
  if (/permission-denied|unauthenticated/.test(code)) return tx.unauthorized;
  if (/unavailable|not-found|internal/.test(code)) return tx.error;
  return error?.message?.replace(/^FirebaseError:\s*/, "").slice(0, 200) || tx.error;
};
const Box = ({children, className=""}) => <section className={`pa-card ${className}`}>{children}</section>;
const Empty = ({tx, hint}) => <div className="pa-empty"><Package size={30}/><strong>{tx.noData}</strong>{hint && <small>{hint}</small>}</div>;
const Th = ({children}) => <th className="pa-th">{children}</th>;
const Table = ({heads,children}) => <div className="pa-table-scroll"><table className="pa-table"><thead><tr>{heads.map((h)=> <Th key={h}>{h}</Th>)}</tr></thead><tbody>{children}</tbody></table></div>;
const Metric = ({label,value,icon:Icon}) => <div className="pa-metric"><span className="pa-metric-icon"><Icon size={19}/></span><span className="pa-metric-value">{value ?? "—"}</span><span className="pa-metric-label">{label}</span></div>;
const StatusPill = ({status}) => <span className={`pa-pill pa-${status?.replaceAll("_","-") || "pending"}`}>{niceStatus(status)}</span>;

export default function AdminApp() {
  const {language} = useLanguage();
  const tx = useMemo(()=> adminText(language),[language]);
  const [page,setPage] = useState("overview");
  const [payload,setPayload] = useState({});
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [query,setQuery] = useState("");
  const [city,setCity] = useState("");
  const [userToken,setUserToken] = useState("");
  const [userPageHistory,setUserPageHistory] = useState([]);
  const [editingUser,setEditingUser] = useState(null);
  const [editingOrder,setEditingOrder] = useState(null);
  const [editingProduct,setEditingProduct] = useState(null);
  const [busy,setBusy] = useState(false);

  const fetchPage = useCallback(async (target, token="") => {
    setLoading(true); setError("");
    try {
      const result = await ({ overview:adminApi.overview,users:()=>adminApi.users(token),pets:adminApi.pets,orders:adminApi.orders,products:adminApi.products,cities:adminApi.overview,notifications:adminApi.overview,reports:adminApi.overview,settings:async()=>({}),audit:adminApi.activity })[target]();
      setPayload((prev)=>({...prev,[target]:result}));
    } catch (err) { setError(humanError(err,adminText(language))); }
    finally { setLoading(false); }
  },[language]);
  useEffect(()=> { fetchPage(page, page==="users"?userToken:""); },[page,userToken,fetchPage]);
  const go = (name) => {setPage(name);setQuery("");setCity("");setNotice("");setEditingOrder(null);setEditingUser(null);setEditingProduct(null);};
  const rows = payload[page] || {};
  const filter = (items,fields) => (items || []).filter((item) => !query || fields.some((field)=> String(field.split(".").reduce((r,k)=> r?.[k],item) || "").toLowerCase().includes(query.toLowerCase())));
  const run = async (task,onSuccess) => {setBusy(true);setError("");try {await task();setNotice(tx.success);onSuccess?.();await fetchPage(page,page==="users"?userToken:"");}catch(err){setError(humanError(err,tx));}finally{setBusy(false);}};
  const overview = payload.overview || {};
  const chooseUserPage = (token) => {setUserPageHistory((h)=>[...h,userToken]);setUserToken(token);};
  const resetUserPages = () => {setUserPageHistory([]);setUserToken("");};
  const [mobileOpen,setMobileOpen]=useState(false);
  return (
    <div className="pa-shell">
      <aside className={`pa-sidebar ${mobileOpen ? "pa-sidebar-open" : ""}`}>
        <div className="pa-sidebar-brand"><div className="pa-brand-symbol"><PawPrint size={22}/></div><div><strong>PetCare</strong><small>ADMIN CONSOLE</small></div></div>
        <div className="pa-sidebar-caption">CONTROL CENTER</div>
        <nav aria-label="Admin navigation" className="pa-sidebar-links">
          {navItems.map(({key,icon:Icon}) => <button key={key} type="button" className={page===key?"pa-nav-item pa-nav-active":"pa-nav-item"} onClick={()=>{go(key);setMobileOpen(false)}}><Icon size={19}/><span>{tx[key]}</span>{page===key && <ChevronRight size={15}/>}</button>)}
        </nav>
        <div className="pa-sidebar-bottom"><div className="pa-authority"><ShieldCheck size={18}/><span>Super Admin<small>{tx.permissions}</small></span></div><Link to="/" className="pa-back"><ArrowLeft size={16}/>{tx.signOut}</Link></div>
      </aside>
      <main className="pa-main">
        <header className="pa-topbar"><div className="pa-topbar-text"><button type="button" className="pa-mobile-toggle" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle admin navigation">☰</button><p className="pa-eyebrow">PETCARE / ADMINISTRATION</p><h1>{tx[page]}</h1><p className="pa-subtitle">{tx.demo}</p></div><button className="pa-reload" type="button" disabled={loading} onClick={()=>fetchPage(page,page==="users"?userToken:"")}><RefreshCw size={17} className={loading?"animate-spin":""}/>{tx.refresh}</button></header>
        {error && <div role="alert" className="pa-alert pa-error"><span>{error}</span><button type="button" onClick={()=>setError("")}><X size={16}/></button></div>}
        {notice && <div role="status" className="pa-alert pa-ok"><Check size={16}/><span>{notice}</span><button type="button" onClick={()=>setNotice("")}><X size={16}/></button></div>}
        {loading && <div className="pa-loading" role="status"><LoaderCircle size={19} className="animate-spin"/>{tx.loading}</div>}
        {page==="overview" && <>
          <div className="pa-metrics"><Metric icon={Users} label={tx.totalUsers} value={overview.usersCount ?? "—"}/><Metric icon={PawPrint} label={tx.totalPets} value={overview.petsCount ?? "—"}/><Metric icon={ShoppingBag} label={tx.activeOrders} value={overview.activeOrders ?? "—"}/><Metric icon={Package} label={tx.totalProducts} value={overview.productsCount ?? "—"}/></div>
          <div className="pa-columns"><Box><div className="pa-card-heading"><h2><BarChart3 size={20}/>{tx.topCities}</h2><button className="pa-text-action" onClick={()=>go("cities")}>{tx.details} <ChevronRight size={14}/></button></div><p className="pa-card-caption">{tx.cityDescription}</p><CityBars cities={overview.cities || []} tx={tx}/><p className="pa-muted">{tx.cityCoverage}: {overview.profilesWithCity ?? 0}/{overview.usersCount ?? "—"}</p></Box>
          <Box><div className="pa-card-heading"><h2><ClipboardList size={20}/>{tx.orders}</h2><button className="pa-text-action" onClick={()=>go("orders")}>{tx.details} <ChevronRight size={14}/></button></div>{(overview.recentOrders||[]).length?overview.recentOrders.map(o=><div className="pa-simple-row" key={o.id}><span><b>#{o.id}</b><small>{dateDisplay(o.createdAt,language)}</small></span><StatusPill status={o.status}/></div>):<Empty tx={tx} hint={tx.dataNotice}/>}</Box></div>
          <div className="pa-info-banner"><ShieldCheck size={19}/><span>{tx.dataNotice}</span></div>
        </>}
        {page==="users" && <><div className="pa-tools"><Search size={17}/><input aria-label={tx.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder={`${tx.search} ${tx.name} / ${tx.email}…`}/></div><Box><div className="pa-card-heading"><h2>{tx.users}</h2><small>{tx.adminUsersHint}</small></div>{filter(rows.users,["name","email","city","uid"]).length ? <Table heads={[tx.name,tx.city,tx.state,tx.action]}>{filter(rows.users,["name","email","city","uid"]).map(u=><tr key={u.uid}><td><strong>{u.name || u.email || "—"}</strong><small>{u.email}</small></td><td>{u.city || "—"}</td><td><StatusPill status={u.disabled?"suspended":"active"}/></td><td><button className="pa-outline-button" onClick={()=>setEditingUser(u)}>{u.disabled?tx.restore:tx.suspend}</button></td></tr>)}</Table>:<Empty tx={tx}/>}<div className="pa-pager"><button disabled={userPageHistory.length===0||loading} onClick={()=>{setUserToken(userPageHistory.at(-1));setUserPageHistory(h=>h.slice(0,-1));}}>‹</button><span>{tx.records}: {rows.users?.length || 0}</span><button disabled={!rows.nextPageToken||loading} onClick={()=>chooseUserPage(rows.nextPageToken)}>{tx.nextPage} ›</button></div></Box></>}
        {page==="pets" && <><div className="pa-tools"><Search size={17}/><input aria-label={tx.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder={`${tx.search} ${tx.animal}…`}/></div><Box><div className="pa-card-heading"><h2>{tx.pets}</h2><small>{tx.readOnly}</small></div>{filter(rows.pets,["name","type","breed","ownerName"]).length?<Table heads={[tx.animal,tx.species,tx.breed,tx.owner]}>{filter(rows.pets,["name","type","breed","ownerName"]).map(p=><tr key={p.id}><td><strong>{p.name || "—"}</strong></td><td>{p.type || "—"}</td><td>{p.breed || "—"}</td><td>{p.ownerName || p.ownerUid?.slice(0,8) || "—"}</td></tr>)}</Table>:<Empty tx={tx} hint={tx.dataNotice}/>}</Box></>}
        {page==="orders" && <><div className="pa-tools"><Search size={17}/><input aria-label={tx.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder={`${tx.search} # / ${tx.customer}…`}/></div><Box><div className="pa-card-heading"><h2>{tx.orders}</h2><small>{tx.statusNote}</small></div>{filter(rows.orders,["id","customerName","customerEmail","status"]).length?<Table heads={[tx.order,tx.customer,tx.amount,tx.status,tx.action]}>{filter(rows.orders,["id","customerName","customerEmail","status"]).map(o=><tr key={o.id}><td><strong>#{o.id}</strong><small>{dateDisplay(o.createdAt,language)}</small></td><td>{o.customerName||o.customerEmail||o.userId||"—"}</td><td>{money(o.total,language)}</td><td><StatusPill status={o.status}/></td><td><button className="pa-outline-button" onClick={()=>setEditingOrder(o)}>{tx.details}</button></td></tr>)}</Table>:<Empty tx={tx} hint={tx.dataNotice}/>}</Box></>}
        {page==="products" && <><div className="pa-action-bar"><p>{tx.productsHint}</p><button className="pa-primary-button" type="button" onClick={()=>setEditingProduct({name:"",price:"",stock:"",category:"Food",petType:"dog",description:"",imageUrl:"",published:false})}><Plus size={16}/>{tx.newProduct}</button></div><Box>{filter(rows.products,["name","category","petType"]).length?<Table heads={[tx.productName,tx.category,tx.price,tx.stock,tx.state,tx.action]}>{filter(rows.products,["name","category","petType"]).map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.category}</td><td>{money(p.price,language)}</td><td>{p.stock}</td><td><StatusPill status={p.published?"active":"draft"}/></td><td><button className="pa-outline-button" onClick={()=>setEditingProduct(p)}>{tx.editProduct}</button></td></tr>)}</Table>:<Empty tx={tx} hint={tx.legacyNotice}/>}</Box><div className="pa-info-banner"><Package size={18}/><span>{tx.legacyNotice}</span></div></>}
        {page==="cities" && <><div className="pa-metrics"><Metric icon={Users} label={tx.totalUsers} value={rows.usersCount??"—"}/><Metric icon={MapPin} label={tx.cityCoverage} value={rows.profilesWithCity??0}/><Metric icon={BarChart3} label={tx.city} value={(rows.cities||[]).length}/></div><Box><div className="pa-card-heading"><h2>{tx.cityBreakdown}</h2><small>{tx.cityDescription}</small></div><CityBars tx={tx} cities={rows.cities||[]} onSelect={setCity} selected={city}/>{city && <div className="pa-city-detail"><h3>{city}</h3><p>{tx.count}: {(rows.cities||[]).find(x=>x.city===city)?.count||0}</p></div>}</Box><div className="pa-info-banner"><MapPin size={19}/><span>{tx.adminUsersHint}</span></div></>}
        {page==="notifications" && <Box><div className="pa-card-heading"><h2><BellRing size={20}/>{tx.notifications}</h2><small>{tx.notificationsHint}</small></div>{(rows.recentOrders||[]).filter(o=>o.status==="pending").length?(rows.recentOrders||[]).filter(o=>o.status==="pending").map(o=><div className="pa-simple-row" key={o.id}><span><b>#{o.id}</b><small>{dateDisplay(o.createdAt,language)}</small></span><button type="button" className="pa-outline-button" onClick={()=>go("orders")}>{tx.orders}</button></div>):<Empty tx={tx} hint={tx.notificationsHint}/>}</Box>}
        {page==="reports" && <><div className="pa-metrics"><Metric icon={Users} label={tx.totalUsers} value={rows.usersCount??"—"}/><Metric icon={PawPrint} label={tx.totalPets} value={rows.petsCount??"—"}/><Metric icon={ShoppingBag} label={tx.activeOrders} value={rows.activeOrders??"—"}/><Metric icon={Package} label={tx.totalProducts} value={rows.productsCount??"—"}/></div><Box><div className="pa-card-heading"><h2>{tx.cityBreakdown}</h2></div><CityBars cities={rows.cities||[]} tx={tx}/><p className="pa-muted">{tx.reportsHint}</p></Box></>}
        {page==="settings" && <Box><div className="pa-card-heading"><h2><ShieldCheck size={20}/>{tx.settings}</h2></div><div className="pa-info-banner"><ShieldCheck size={20}/>{tx.settingsHint}</div><p className="pa-muted">{tx.legacyNotice}</p></Box>}
        {page==="audit" && <Box><div className="pa-card-heading"><h2>{tx.audit}</h2></div>{(rows.logs||[]).length?<Table heads={[tx.updated,tx.action,tx.uid,tx.details]}>{rows.logs.map(log=><tr key={log.id}><td>{dateDisplay(log.createdAt,language)}</td><td>{log.action}</td><td>{log.actorUid?.slice(0,12)}</td><td>{log.reason||log.targetId||"—"}</td></tr>)}</Table>:<Empty tx={tx}/>}</Box>}
      </main>
      {editingUser && <div className="pa-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget) setEditingUser(null)}}><UserModal tx={tx} user={editingUser} busy={busy} close={()=>setEditingUser(null)} submit={(reason)=>run(()=>adminApi.setSuspended(editingUser.uid,!editingUser.disabled,reason),()=>setEditingUser(null))}/></div>}
      {editingOrder && <div className="pa-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setEditingOrder(null)}}><OrderModal tx={tx} lang={language} order={editingOrder} busy={busy} close={()=>setEditingOrder(null)} submit={(status,note)=>run(()=>adminApi.setOrderStatus(editingOrder.id,status,note),()=>setEditingOrder(null))}/></div>}
      {editingProduct && <div className="pa-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setEditingProduct(null)}}><ProductModal tx={tx} product={editingProduct} busy={busy} close={()=>setEditingProduct(null)} submit={(product)=>run(()=>adminApi.saveProduct(product),()=>setEditingProduct(null))}/></div>}
    </div>
  );
}

function CityBars({cities,tx,onSelect,selected}) {
  if(!cities?.length)return <Empty tx={tx} hint={tx.noCities}/>;
  const max = Math.max(1,...cities.map(x=>x.count));
  return <div className="pa-city-bars">{cities.map((city)=><button key={city.city} className={`pa-city-row ${selected===city.city?"pa-selected":""}`} type="button" onClick={()=>onSelect?.(city.city)} disabled={!onSelect}><span className="pa-city-label">{city.city}<strong>{city.count}</strong></span><span className="pa-city-track"><span style={{width:`${Math.max(2,city.count/max*100)}%`}}/></span></button>)}</div>;
}
function ModalShell({title,close,children}) {return <div role="dialog" aria-modal="true" aria-label={title} className="pa-modal"><div className="pa-modal-header"><h2>{title}</h2><button aria-label="Close" type="button" onClick={close}><X size={19}/></button></div>{children}</div>}
function UserModal({tx,user,close,submit,busy}) {const [reason,setReason]=useState("");return <ModalShell title={user.disabled?tx.restore:tx.suspend} close={close}><p className="pa-muted">{user.name||user.email} — {tx.confirmSuspend}</p><form onSubmit={e=>{e.preventDefault();if(reason.trim().length>=5)submit(reason.trim())}}><label className="pa-form-field">{tx.reason}<textarea required minLength={5} maxLength={300} rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="pa-modal-actions"><button className="pa-outline-button" type="button" onClick={close}>{tx.cancel}</button><button className="pa-primary-button" type="submit" disabled={busy||reason.trim().length<5}>{busy?"…":tx.confirm}</button></div></form></ModalShell>}
function OrderModal({tx,order,close,submit,busy,lang}) {const options=orderTransitions[order.status]||[];const [status,setStatus]=useState(options[0]||"");const [note,setNote]=useState("");return <ModalShell title={`${tx.order} #${order.id}`} close={close}><div className="pa-order-info"><p><b>{tx.customer}:</b> {order.customerName||order.userId||"—"}</p><p><b>{tx.amount}:</b> {money(order.total,lang)}</p><p><b>{tx.statusCurrent}:</b> {niceStatus(order.status)}</p><p><b>{tx.orderMethod}:</b> {order.fulfilment||"—"}</p><p><b>{tx.payment}:</b> {order.paymentStatus||"unpaid"}</p></div><h3 className="pa-mini-heading">{tx.orderHistory}</h3><div className="pa-history">{(order.history||[]).map((x,i)=><div key={i}><Check size={14}/><span>{niceStatus(x.status)}<small>{dateDisplay(x.at,lang)} {x.note||""}</small></span></div>)}</div>{options.length?<form onSubmit={e=>{e.preventDefault();submit(status,note)}}><label className="pa-form-field">{tx.status}<select value={status} onChange={e=>setStatus(e.target.value)}>{options.map(x=><option key={x} value={x}>{niceStatus(x)}</option>)}</select></label><label className="pa-form-field">{tx.notes}<textarea rows={2} value={note} maxLength={250} onChange={e=>setNote(e.target.value)}/></label><div className="pa-modal-actions"><button type="button" className="pa-outline-button" onClick={close}>{tx.cancel}</button><button type="submit" disabled={busy} className="pa-primary-button">{tx.save}</button></div></form>:<div className="pa-info-banner">{tx.complete}</div>}</ModalShell>}
function ProductModal({tx,product,close,submit,busy}) {const [p,setP]=useState({...product});const update=(key,value)=>setP(x=>({...x,[key]:value}));return <ModalShell title={product.id?tx.editProduct:tx.newProduct} close={close}><form className="pa-product-form" onSubmit={e=>{e.preventDefault();submit({...p,price:Number(p.price),stock:Number(p.stock)})}}><label className="pa-form-field">{tx.productName}<input required maxLength={120} value={p.name} onChange={e=>update("name",e.target.value)}/></label><div className="pa-fields-two"><label className="pa-form-field">{tx.price}<input required type="number" min="0" step="1" value={p.price} onChange={e=>update("price",e.target.value)}/></label><label className="pa-form-field">{tx.stock}<input required type="number" min="0" step="1" value={p.stock} onChange={e=>update("stock",e.target.value)}/></label></div><div className="pa-fields-two"><label className="pa-form-field">{tx.category}<select value={p.category} onChange={e=>update("category",e.target.value)}>{["Food","Treats","Toys","Grooming and care","Accessories","Beds and sleep","Training","Health and supplements","Cleaning and litter","Travel and carriers","Aquariums and habitats"].map(c=><option key={c}>{c}</option>)}</select></label><label className="pa-form-field">{tx.petType}<select value={p.petType} onChange={e=>update("petType",e.target.value)}>{["dog","cat","bird","fish","small"].map(c=><option key={c}>{c}</option>)}</select></label></div><label className="pa-form-field">{tx.description}<textarea rows={3} maxLength={1500} value={p.description||""} onChange={e=>update("description",e.target.value)}/></label><label className="pa-form-field">{tx.imageUrl}<input type="url" placeholder="https://…" value={p.imageUrl||""} onChange={e=>update("imageUrl",e.target.value)}/><small>{tx.imageHelp}</small></label><label className="pa-checkbox"><input type="checkbox" checked={Boolean(p.published)} onChange={e=>update("published",e.target.checked)}/>{tx.publishedLabel}</label><div className="pa-modal-actions"><button type="button" className="pa-outline-button" onClick={close}>{tx.cancel}</button><button type="submit" disabled={busy} className="pa-primary-button">{tx.save}</button></div></form></ModalShell>}
