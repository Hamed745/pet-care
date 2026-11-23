import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UsersRound } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { Button, Card, Input, PageHeader, Select, Textarea } from "../components/ui.jsx";
import { clinicApi } from "../services/clinicApi.js";
import { clinicWorkspaceApi } from "../services/clinicWorkspaceApi.js";
import { clinicText } from "../clinic/clinicTranslations.js";

// Keep the default clinic workspace focused on daily work. Other older CRUD
// features remain in the codebase but are not linked from the clinic interface.
const menuItems=[
  ["dashboard","Dashboard","Главная"],
  ["requests","Booking requests","Заявки"],
  ["appointments","Appointments","Записи"],
  ["calendar","Calendar","Календарь"],
  ["services","Services & pricing","Услуги и цены"],
  ["team","Doctors & staff","Врачи и персонал"],
  ["settings","Settings","Настройки"],
];
const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const blankStaff={name:"",email:"",role:"veterinarian",status:"active",specialty:"",
  yearsExperience:"",workingDays:[0,1,2,3,4],shiftStart:"09:00",shiftEnd:"17:00"};
const blankPatient={name:"",species:"dog",breed:"",gender:"",ownerName:"",ownerPhone:"",
  birthDate:"",weight:"",bloodType:"",allergies:"",healthStatus:""};
const blankVisit={visitDate:new Date().toISOString().slice(0,10),doctorId:"",diagnosis:"",
  clinicalNotes:"",treatment:"",labReportNotes:"",durationMinutes:30};
const blankBooking={patientId:"",doctorId:"",serviceId:"",date:"",time:"09:00",notes:""};
const badge=(value)=>value==="approved"||value==="confirmed"||value==="completed"?"text-green-700 bg-green-50":
  value==="pending"?"text-amber-700 bg-amber-50":"text-stone-600 bg-stone-100";
function Pill({value}){const { language } = useLanguage();return <span className={"rounded-full px-2 py-1 text-xs font-bold "+badge(value)}>{clinicText(language,String(value||"unknown").replaceAll("_"," "))}</span>;}
function Metric({label,value}){return <Card className="p-4"><p className="text-xs font-bold text-ink-500">{label}</p><strong className="mt-2 block text-2xl text-ink-900">{value}</strong></Card>;}
function Field({label,value,onChange,type="text",required=false,min,max,step,disabled=false}){
  return <Input label={label} type={type} value={value??""} onChange={e=>onChange(e.target.value)}
    required={required} min={min} max={max} step={step} disabled={disabled}/>;
}
function Section({title,description,children}){
  return <Card className="space-y-4"><div><h2 className="text-lg font-extrabold">{title}</h2>{description&&<p className="text-sm text-ink-500">{description}</p>}</div>{children}</Card>;
}
const fmtDate=(date,language="en")=>date?new Date(date+"T00:00:00Z").toLocaleDateString(language==="ru"?"ru-RU":"en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}):"—";

export default function ClinicWorkspace({clinic,onSaved,core}){
  const { language } = useLanguage();
  const tr = english => clinicText(language,english);
  const [searchParams,setSearchParams]=useSearchParams();
  const menu=useMemo(()=>menuItems.map(([key,en,ru])=>[key,language==="ru"?ru:en]),[language]);
  const section=searchParams.get("section");
  const tab=menuItems.some(([key])=>key===section)?section:"dashboard";
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [search,setSearch]=useState("");
  const [staffForm,setStaffForm]=useState(blankStaff);
  const [editingStaff,setEditingStaff]=useState("");
  const [selectedStaff,setSelectedStaff]=useState("");
  const [patientForm,setPatientForm]=useState(blankPatient);
  const [editingPatient,setEditingPatient]=useState("");
  const [selectedPatient,setSelectedPatient]=useState("");
  const [recordForm,setRecordForm]=useState(blankVisit);
  const [bookingForm,setBookingForm]=useState(blankBooking);
  const [slotEdits,setSlotEdits]=useState({});
  const [calendarDate,setCalendarDate]=useState(new Date().toISOString().slice(0,10));
  const [settings,setSettings]=useState({notifyNewBookings:true,notifyMedicalRecords:true,privacyContactEmail:""});
  const reload=useCallback(async()=>{
    const result=await clinicWorkspaceApi.snapshot();
    setData(result);
    setSettings({notifyNewBookings:true,notifyMedicalRecords:true,privacyContactEmail:"",...result.settings});
  },[]);
  useEffect(()=>{let active=true;setLoading(true);
    clinicWorkspaceApi.snapshot().then(v=>{if(active){setData(v);setSettings({notifyNewBookings:true,notifyMedicalRecords:true,privacyContactEmail:"",...v.settings});setError("");}})
      .catch(e=>{if(active)setError(e.message)})
      .finally(()=>{if(active)setLoading(false)});
    return ()=>{active=false};
  },[]);
  async function run(work,message){
    setBusy(true);setError("");setNotice("");
    try{await work();await reload();setNotice(message||"Saved successfully.");return true;}
    catch(e){setError(e.message||"Operation failed.");return false}
    finally{setBusy(false)}
  }
  const staff=data?.staff||[],patients=data?.patients||[],records=data?.records||[],
    bookings=(data?.appointments||[]).slice().sort((a,b)=>(b.date+" "+b.time).localeCompare(a.date+" "+a.time));
  const serviceOptions=clinic.services||[];
  const currency=clinic.currency || (clinic.region ? "RUB" : "EGP");
  const selected=patients.find(p=>p.id===selectedPatient);
  const activeDoctor=staff.find(p=>p.id===selectedStaff);
  const matchingPatients=patients.filter(p=>[p.name,p.ownerName,p.breed].join(" ").toLowerCase().includes(search.toLowerCase()));
  const clinicCalendar=useMemo(()=>bookings.filter(b=>b.date===calendarDate).sort((a,b)=>a.time.localeCompare(b.time)),[bookings,calendarDate]);
  const pending=bookings.filter(b=>b.status==="pending");
  const totalVisits=records.length;
  const a=data?.analytics||{};
  const navigate=(to)=>{setSearchParams(to==="dashboard"?{}:{section:to});setError("");setNotice("");setSearch("");};
  const submitStaff=async(e)=>{e.preventDefault();
    const result=await run(()=>editingStaff?clinicWorkspaceApi.updateStaff(editingStaff,staffForm):clinicWorkspaceApi.addStaff(staffForm),"Team member saved.");
    if(result){setStaffForm(blankStaff);setEditingStaff("");}
  };
  const submitPatient=async(e)=>{e.preventDefault();
    const result=await run(()=>editingPatient?clinicWorkspaceApi.updatePatient(editingPatient,patientForm):clinicWorkspaceApi.addPatient(patientForm),"Patient saved.");
    if(result){setPatientForm(blankPatient);setEditingPatient("");}
  };
  const submitRecord=async(e)=>{e.preventDefault();
    if(!selectedPatient){setError("Choose a patient first.");return;}
    const done=await run(()=>clinicWorkspaceApi.addRecord(selectedPatient,recordForm),"Visit record added.");
    if(done){setRecordForm(blankVisit);navigate("records");}
  };
  const submitBooking=async(e)=>{e.preventDefault();
    const done=await run(()=>clinicWorkspaceApi.createAppointment(bookingForm),"Appointment created.");
    if(done)setBookingForm(blankBooking);
  };
  const visitList=(patientId)=>records.filter(x=>!patientId||x.patientId===patientId)
    .sort((x,y)=>String(y.visitDate).localeCompare(String(x.visitDate)));

  if(loading)return <p role="status" className="p-5 text-sm text-ink-500">{tr("Loading your clinic workspace…")}</p>;
  return <div className="grid gap-6 lg:grid-cols-[245px_minmax(0,1fr)]">
    <aside className="h-max rounded-2xl border border-stone-200 bg-white p-3 lg:sticky lg:top-24">
      <div className="mb-3 border-b border-stone-100 p-3"><p className="text-xs uppercase text-primary-700">{tr("Clinic Branch Manager")}</p>
        <h2 className="font-extrabold">{clinic.name}</h2><Pill value={clinic.status}/></div>
      <nav aria-label={tr("Clinic manager sections")} className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
        {menu.map(([key,label])=><button key={key} type="button" aria-current={tab===key?"page":undefined}
          className={"rounded-lg p-3 text-left text-xs font-bold "+(tab===key?"bg-primary-700 text-white":"text-ink-700 hover:bg-primary-50")}
          onClick={()=>navigate(key)}>{key==="team"&&<UsersRound size={16} className="mr-2 inline" aria-hidden="true"/>}{label}{key==="requests"&&pending.length>0?" ("+pending.length+")":""}</button>)}
      </nav>
    </aside>
    <div className="min-w-0 space-y-5">
      <PageHeader title={menu.find(x=>x[0]===tab)?.[1]||"Clinic"} eyebrow={"PetCare / "+clinic.name}
        description={tr("Private information is restricted to the signed-in approved branch manager.")}
        action={<Button size="sm" variant="secondary" disabled={busy} onClick={()=>run(()=>reload(),"Data refreshed.")}>{tr("Refresh")}</Button>}/>
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{tr(error)}</p>}
      {notice&&<p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{tr(notice)}</p>}
      {!data&&<Section title={tr("Unable to load workspace")}>{tr("Check the clinic API, Firebase login and permissions.")}</Section>}
      {data&&tab==="dashboard"&&<>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={language==="ru"?"Все записи":"Bookings"} value={a.bookings||0}/>
          <Metric label={language==="ru"?"Ожидают":"Pending requests"} value={a.pending||0}/>
          <Metric label={language==="ru"?"Подтверждены":"Confirmed"} value={a.confirmed||0}/>
          <Metric label={language==="ru"?"Завершены":"Completed"} value={a.completed||0}/>
        </div>
        <Section title={tr("Today at a glance")} description={tr("Live appointments and clinic activity")}>
          {bookings.filter(x=>x.date===new Date().toISOString().slice(0,10)).length===0?<p className="text-sm text-ink-500">{tr("No appointments today.")}</p>:
            bookings.filter(x=>x.date===new Date().toISOString().slice(0,10)).map(x=><div key={x.id} className="flex justify-between gap-3 border-b py-2 text-sm">
              <span>{x.time} · {x.petName} · {x.serviceName}</span><Pill value={x.status}/></div>)}
        </Section>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button onClick={()=>navigate("requests")}>{language==="ru"?"Рассмотреть заявки":"Review booking requests"}</Button>
          <Button variant="secondary" onClick={()=>navigate("appointments")}>{language==="ru"?"Все записи":"View appointments"}</Button>
          <Button variant="secondary" onClick={()=>navigate("services")}>{language==="ru"?"Управление услугами":"Manage services"}</Button>
          <Button variant="secondary" onClick={()=>navigate("team")}><UsersRound size={16}/>{language==="ru"?"Управление врачами":"Manage doctors"}</Button>
        </div>
      </>}
      {data&&tab==="requests"&&<Section title={tr("New booking requests")} description={tr("Approve or decline each request before a slot is confirmed.")}>
        {!pending.length?<p className="text-sm text-ink-500">{tr("No pending requests.")}</p>:pending.map(x=><div key={x.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong>{x.petName} · {x.serviceName}</strong><Pill value={x.status}/></div>
          <p className="mt-2 text-xs text-ink-500">{fmtDate(x.date,language)} · {x.time} · {currency} {x.price||0}</p>
          {x.doctorName && <p className="mt-2 text-sm font-semibold">{tr("Requested doctor:")} {x.doctorName}</p>}
          {x.contactPhone && <p className="mt-1 text-sm">{tr("Contact:")} {x.contactPhone}</p>}
          <p className="my-2 text-sm">{x.notes||""}</p>
          <p className="mb-3 text-xs text-ink-600">{tr("Choose the appointment day and time before accepting. The pet owner will see the confirmed slot.")}</p>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Field type="date" label={tr("Confirm date")} required value={slotEdits[x.id]?.date ?? x.date}
              onChange={date=>setSlotEdits(current=>({...current,[x.id]:{date,time:current[x.id]?.time ?? x.time}}))}/>
            <Field type="time" label={tr("Confirm time")} required value={slotEdits[x.id]?.time ?? x.time}
              onChange={time=>setSlotEdits(current=>({...current,[x.id]:{date:current[x.id]?.date ?? x.date,time}}))}/>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} size="sm" onClick={()=>run(()=>clinicApi.updateBooking(x.id,"confirmed","",{
              date:slotEdits[x.id]?.date ?? x.date, time:slotEdits[x.id]?.time ?? x.time
            }),"Appointment confirmed with selected date and time.")}>{tr("Accept & confirm time")}</Button>
            <Button disabled={busy} size="sm" variant="danger" onClick={()=>{const reason=window.prompt(tr("Reason for rejection (at least 5 characters):"));
              if(reason&&reason.trim().length>=5)run(()=>clinicApi.updateBooking(x.id,"rejected",reason.trim()),"Request rejected.");}}>{tr("Reject")}</Button></div>
        </div>)}
      </Section>}
      {data&&tab==="appointments"&&<>
        <Section title={tr("All clinic appointments")} description={tr("Pending, confirmed, completed, cancelled and rejected.")}>
          {!bookings.length?<p className="text-sm text-ink-500">{tr("No appointments recorded.")}</p>:bookings.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 text-sm">
            <div><strong>{x.petName||tr("Patient")} · {x.serviceName}</strong><p className="text-xs text-ink-500">{fmtDate(x.date,language)} · {x.time}{x.doctorName?" · "+x.doctorName:""}</p></div>
            <div className="flex gap-2"><Pill value={x.status}/>{x.status==="confirmed"&&<Button size="sm" disabled={busy} onClick={()=>run(()=>clinicApi.updateBooking(x.id,"completed"),"Visit completed.")}>{tr("Complete")}</Button>}</div>
          </div>)}
        </Section>
      </>}
      {data&&tab==="calendar"&&<Section title={tr("Clinic calendar")} description={tr("Times are shown in the clinic's configured local time zone.")}>
        <div className="max-w-xs"><Field label={tr("Choose day")} type="date" value={calendarDate} onChange={setCalendarDate}/></div>
        {!clinicCalendar.length?<p className="text-sm text-ink-500">{tr("No appointments on this day.")}</p>:clinicCalendar.map(x=><div key={x.id} className="flex items-center justify-between gap-3 border-b py-3 text-sm">
          <span>{x.time} — {x.petName} · {x.serviceName}</span><Pill value={x.status}/></div>)}
      </Section>}
      {data&&tab==="team"&&<div className="space-y-4" aria-label={language==="ru"?"Управление врачами и персоналом":"Clinic doctors and staff management"}>
        <p className="text-sm text-ink-600">{language==="ru"?"Добавляйте активных ветеринаров здесь: они появятся в списке врачей при записи в клинику.":"Add active veterinarians here: they will appear in the doctor selector when pet owners book."}</p>
        <div className="space-y-4">
        <Section title={tr(tab==="team"?"Doctors and receptionists":"Weekly shift availability")} description={tr("Staff profiles and shift schedules are managed by this clinic branch.")}>
          {!staff.length?<p className="text-sm text-ink-500">{tr("Add your first team member.")}</p>:staff.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
            <button type="button" className="text-left text-sm" onClick={()=>setSelectedStaff(s.id)}><strong>{s.name}</strong><p className="text-xs text-ink-500">{tr(s.role)} · {s.specialty||s.email}</p>
              <p className="text-xs text-ink-500">{s.workingDays?.map(n=>tr(days[n])).join(", ")} · {s.shiftStart}–{s.shiftEnd}</p></button>
            <div className="flex gap-2"><Pill value={s.status}/>
              <Button size="sm" variant="secondary" onClick={()=>{setStaffForm({...s});setEditingStaff(s.id);}}>{tr("Edit")}</Button></div>
          </div>)}
          {activeDoctor&&<div className="rounded-xl bg-primary-50 p-4 text-sm">
            <strong>{tr("Team member profile —")} {activeDoctor.name}</strong>
            <p>{tr(activeDoctor.role)} · {activeDoctor.specialty||tr("General care")} · {activeDoctor.yearsExperience||0} {tr("years experience")}</p>
            <p>{activeDoctor.email} · {tr(activeDoctor.status)}</p>
            <p className="mt-2 text-xs text-ink-500">{tr("Medical data access requires a separately approved staff account. A team listing alone does not grant login permissions.")}</p>
          </div>}
        </Section>
        <Section title={tr(editingStaff?"Edit team member":"Add team member")} description={tr("Assign a role and a weekly availability schedule.")}>
          <form onSubmit={submitStaff} className="grid gap-3 sm:grid-cols-2">
            <Field required label={tr("Full name")} value={staffForm.name} onChange={v=>setStaffForm({...staffForm,name:v})}/>
            <Field required label={tr("Work email")} type="email" value={staffForm.email} onChange={v=>setStaffForm({...staffForm,email:v})}/>
            <Select label={tr("Role")} value={staffForm.role} onChange={e=>setStaffForm({...staffForm,role:e.target.value})}>
              <option value="veterinarian">{tr("Veterinarian")}</option><option value="receptionist">{tr("Receptionist")}</option>
            </Select>
            <Select label={tr("Status")} value={staffForm.status} onChange={e=>setStaffForm({...staffForm,status:e.target.value})}>
              <option value="active">{tr("Active")}</option><option value="inactive">{tr("Inactive")}</option>
            </Select>
            <Field label={tr("Specialty")} value={staffForm.specialty} onChange={v=>setStaffForm({...staffForm,specialty:v})}/>
            <Field label={tr("Experience (years)")} type="number" min="0" max="70" value={staffForm.yearsExperience} onChange={v=>setStaffForm({...staffForm,yearsExperience:v})}/>
            <Field label={tr("Shift start")} type="time" value={staffForm.shiftStart} onChange={v=>setStaffForm({...staffForm,shiftStart:v})}/>
            <Field label={tr("Shift end")} type="time" value={staffForm.shiftEnd} onChange={v=>setStaffForm({...staffForm,shiftEnd:v})}/>
            <fieldset className="sm:col-span-2"><legend className="mb-2 text-xs font-bold">{tr("Working days")}</legend>
              <div className="flex flex-wrap gap-3">{days.map((d,i)=><label key={d} className="text-sm"><input type="checkbox" checked={staffForm.workingDays.includes(i)}
                onChange={e=>setStaffForm({...staffForm,workingDays:e.target.checked?[...staffForm.workingDays,i]:staffForm.workingDays.filter(v=>v!==i)})}/> {tr(d)}</label>)}</div>
            </fieldset>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>{tr(editingStaff?"Save changes":"Add member")}</Button>
              {editingStaff&&<Button type="button" variant="secondary" onClick={()=>{setStaffForm(blankStaff);setEditingStaff("");}}>{tr("Cancel edit")}</Button>}
              {editingStaff&&<Button type="button" variant="danger" disabled={busy} onClick={()=>{if(window.confirm(tr("Remove this team member?")))run(()=>clinicWorkspaceApi.removeStaff(editingStaff),"Team member removed.").then(ok=>{if(ok){setEditingStaff("");setStaffForm(blankStaff);}});}}>{tr("Remove")}</Button>}
            </div>
          </form>
        </Section>
        </div>
      </div>}
      {data&&(tab==="patients"||tab==="records"||tab==="newVisit")&&<>
        <Section title={tr("Patient directory")} description={tr("Medical data is private to your approved clinic branch.")}>
          <div className="max-w-sm"><Field label={tr("Search patient or owner")} value={search} onChange={setSearch}/></div>
          {!matchingPatients.length?<p className="text-sm text-ink-500">{tr("No patients match your search.")}</p>:matchingPatients.map(p=><button key={p.id} type="button"
            className={"block w-full border-b p-3 text-left text-sm hover:bg-primary-50 "+(selectedPatient===p.id?"bg-primary-50":"")}
            onClick={()=>setSelectedPatient(p.id)}><strong>{p.name}</strong> · {tr(p.species)} · {p.breed}
            <p className="text-xs text-ink-500">{tr("Owner:")} {p.ownerName} · {p.ownerPhone||tr("Phone not provided")}</p></button>)}
          {selected&&<div className="rounded-xl border bg-stone-50 p-4 text-sm">
            <h3 className="font-extrabold">{tr("Patient overview:")} {selected.name}</h3>
            <p>{selected.breed||selected.species} · {tr(selected.gender||"Gender not recorded")} · {tr("Birth date:")} {selected.birthDate||tr("Unknown")}</p>
            <p>{tr("Weight:")} {selected.weight??tr("Unknown")} kg · {tr("Blood type:")} {selected.bloodType||tr("Unknown")}</p>
            <p>{tr("Allergies:")} {selected.allergies||tr("None reported")} · {tr("Health:")} {selected.healthStatus||tr("Not assessed")}</p>
            <p>{tr("Last visit:")} {visitList(selected.id)[0]?.visitDate||tr("None")}</p>
            <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" onClick={()=>{setEditingPatient(selected.id);setPatientForm({...selected});navigate("patients");}}>{tr("Edit patient")}</Button>
              <Button size="sm" onClick={()=>navigate("newVisit")}>{tr("Record visit")}</Button></div>
          </div>}
        </Section>
        {tab==="patients"&&<Section title={tr(editingPatient?"Edit patient profile":"Register patient")}>
          <form onSubmit={submitPatient} className="grid gap-3 sm:grid-cols-2">
            <Field required label={tr("Pet name")} value={patientForm.name} onChange={v=>setPatientForm({...patientForm,name:v})}/>
            <Select label={tr("Species")} value={patientForm.species} onChange={e=>setPatientForm({...patientForm,species:e.target.value})}>
              {["dog","cat","bird","fish","rabbit","other"].map(x=><option key={x} value={x}>{tr(x)}</option>)}
            </Select>
            <Field label={tr("Breed")} value={patientForm.breed} onChange={v=>setPatientForm({...patientForm,breed:v})}/>
            <Field label={tr("Gender")} value={patientForm.gender} onChange={v=>setPatientForm({...patientForm,gender:v})}/>
            <Field required label={tr("Owner full name")} value={patientForm.ownerName} onChange={v=>setPatientForm({...patientForm,ownerName:v})}/>
            <Field label={tr("Owner phone")} type="tel" value={patientForm.ownerPhone} onChange={v=>setPatientForm({...patientForm,ownerPhone:v})}/>
            <Field label={tr("Birth date (optional)")} type="date" value={patientForm.birthDate} onChange={v=>setPatientForm({...patientForm,birthDate:v})}/>
            <Field label={tr("Weight (kg)")} type="number" step="0.1" min="0" max="1000" value={patientForm.weight} onChange={v=>setPatientForm({...patientForm,weight:v})}/>
            <Field label={tr("Blood type")} value={patientForm.bloodType} onChange={v=>setPatientForm({...patientForm,bloodType:v})}/>
            <Field label={tr("Health status")} value={patientForm.healthStatus} onChange={v=>setPatientForm({...patientForm,healthStatus:v})}/>
            <div className="sm:col-span-2"><Field label={tr("Allergies")} value={patientForm.allergies} onChange={v=>setPatientForm({...patientForm,allergies:v})}/></div>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>{tr(editingPatient?"Update patient":"Add patient")}</Button>
              {editingPatient&&<Button type="button" variant="secondary" onClick={()=>{setPatientForm(blankPatient);setEditingPatient("");}}>{tr("Cancel")}</Button>}</div>
          </form>
        </Section>}
        {tab==="records"&&<Section title={tr("Medical records and visit history")} description={tr("Clinic-only records, ordered by visit date.")}>
          {!visitList(selectedPatient).length?<p className="text-sm text-ink-500">{tr("No medical records available.")}</p>:
            visitList(selectedPatient).map(r=><div key={r.id} className="rounded-xl border p-4 text-sm">
              <strong>{fmtDate(r.visitDate,language)} · {r.patientName} · {r.diagnosis}</strong>
              <p className="mt-2">{tr("Clinical notes:")} {r.clinicalNotes||"—"}</p><p>{tr("Treatment:")} {r.treatment||"—"}</p>
              <p className="text-xs text-ink-500">{tr("Lab/report reference:")} {r.labReportNotes||tr("None")}</p>
            </div>)}
          <Button onClick={()=>navigate("newVisit")}>{tr("Add medical record")}</Button>
        </Section>}
        {tab==="newVisit"&&<Section title={tr("Add visit record")} description={tr("Select a patient, diagnosis, attending veterinarian and treatment.")}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitRecord}>
            <Select label={tr("Patient")} required value={selectedPatient} onChange={e=>setSelectedPatient(e.target.value)}>
              <option value="">{tr("Select patient")}</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name} — {p.ownerName}</option>)}
            </Select>
            <Select label={tr("Attending veterinarian")} value={recordForm.doctorId} onChange={e=>setRecordForm({...recordForm,doctorId:e.target.value})}>
              <option value="">{tr("Unassigned")}</option>{staff.filter(s=>s.role==="veterinarian"&&s.status==="active").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Field required label={tr("Visit date")} type="date" value={recordForm.visitDate} onChange={v=>setRecordForm({...recordForm,visitDate:v})}/>
            <Field label={tr("Appointment duration (minutes)")} type="number" min="5" max="480" value={recordForm.durationMinutes} onChange={v=>setRecordForm({...recordForm,durationMinutes:v})}/>
            <div className="sm:col-span-2"><Field required label={tr("Diagnosis")} value={recordForm.diagnosis} onChange={v=>setRecordForm({...recordForm,diagnosis:v})}/></div>
            <Textarea label={tr("Clinical notes")} value={recordForm.clinicalNotes} onChange={e=>setRecordForm({...recordForm,clinicalNotes:e.target.value})}/>
            <Textarea label={tr("Treatment / medication")} value={recordForm.treatment} onChange={e=>setRecordForm({...recordForm,treatment:e.target.value})}/>
            <div className="sm:col-span-2"><Field label={tr("Lab report reference / notes")} value={recordForm.labReportNotes} onChange={v=>setRecordForm({...recordForm,labReportNotes:v})}/>
              <p className="mt-1 text-xs text-ink-500">{tr("Actual medical-file attachment upload requires a separate private-scanning workflow; no medical images are sent from this form.")}</p></div>
            <Button type="submit" disabled={busy||!selectedPatient}>{tr("Save medical record")}</Button>
          </form>
        </Section>}
      </>}
      {data&&tab==="services"&&<>{core.services}
        <Section title={tr("Published services")}>{!serviceOptions.length?<p className="text-sm text-ink-500">{tr("No services yet.")}</p>:serviceOptions.map(s=><div key={s.id} className="flex items-center justify-between border-b py-2 text-sm">
          <span>{s.name} · {s.durationMinutes} min</span><span>{currency} {s.price} <Pill value={s.available!==false?"active":"inactive"}/></span></div>)}</Section></>}
      {data&&tab==="analytics"&&<>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label={tr("Appointments")} value={a.bookings||0}/>
          <Metric label={tr("Completed")} value={a.completed||0}/><Metric label={tr("Completion rate")} value={(a.completionRate||0)+"%"}/>
          <Metric label={tr("Completed revenue (") + currency + ")"} value={a.revenueRUB ?? a.revenueEGP ?? 0}/></div>
        <Section title={tr("Service distribution")}>{!a.serviceDistribution?.length?<p className="text-sm text-ink-500">{tr("No service activity yet.")}</p>:
          a.serviceDistribution.map(s=><div key={s.name} className="flex justify-between border-b py-2 text-sm"><span>{s.name}</span><strong>{s.count}</strong></div>)}
          <p className="text-xs text-ink-500">{tr("These statistics use actual clinic appointments. No sample ratings or revenue have been invented.")}</p>
        </Section>
      </>}
      {data&&tab==="settings"&&<Section title={tr("Notifications")} description={tr("Clinic activity and patient record updates.")}>
        {!data.notifications.length?<p className="text-sm text-ink-500">{tr("No notifications yet.")}</p>:data.notifications.slice().reverse().map(n=><div key={n.id} className="flex flex-wrap justify-between gap-3 border-b py-3 text-sm">
          <div><strong>{n.title}</strong><p>{n.body}</p></div>
          {!n.read&&<Button size="sm" variant="secondary" disabled={busy} onClick={()=>run(()=>clinicWorkspaceApi.markRead(n.id),"Marked as read.")}>{tr("Mark read")}</Button>}
        </div>)}
      </Section>}
      {data&&tab==="settings"&&<>
        {core.profile}{core.availability}
        <Section title={tr("Notifications and privacy settings")}>
          <form className="space-y-4" onSubmit={e=>{e.preventDefault();run(()=>clinicWorkspaceApi.updateSettings(settings),"Preferences saved.");}}>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.notifyNewBookings}
              onChange={e=>setSettings({...settings,notifyNewBookings:e.target.checked})}/>{tr("New booking alerts")}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.notifyMedicalRecords}
              onChange={e=>setSettings({...settings,notifyMedicalRecords:e.target.checked})}/>{tr("Medical record alerts")}</label>
            <Field label={tr("Privacy contact email")} type="email" value={settings.privacyContactEmail} onChange={v=>setSettings({...settings,privacyContactEmail:v})}/>
            <p className="text-xs text-ink-500">{tr("Changing staff roles here does not automatically grant Firebase access to medical records. Branch approval and user-level permissions remain enforced on the server.")}</p>
            <Button type="submit" disabled={busy}>{tr("Save branch settings")}</Button>
          </form>
        </Section>
      </>}
    </div>
  </div>;
}
