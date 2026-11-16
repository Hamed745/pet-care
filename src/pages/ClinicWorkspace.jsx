import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { Button, Card, Input, PageHeader, Select, Textarea } from "../components/ui.jsx";
import { clinicApi } from "../services/clinicApi.js";
import { clinicWorkspaceApi } from "../services/clinicWorkspaceApi.js";

// Keep the default clinic workspace focused on daily work. Other older CRUD
// features remain in the codebase but are not linked from the clinic interface.
const menuItems=[
  ["dashboard","Dashboard","Главная"],
  ["requests","Booking requests","Заявки"],
  ["appointments","Appointments","Записи"],
  ["calendar","Calendar","Календарь"],
  ["services","Services & pricing","Услуги и цены"],
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
function Pill({value}){return <span className={"rounded-full px-2 py-1 text-xs font-bold "+badge(value)}>{String(value||"unknown").replaceAll("_"," ")}</span>;}
function Metric({label,value}){return <Card className="p-4"><p className="text-xs font-bold text-ink-500">{label}</p><strong className="mt-2 block text-2xl text-ink-900">{value}</strong></Card>;}
function Field({label,value,onChange,type="text",required=false,min,max,step,disabled=false}){
  return <Input label={label} type={type} value={value??""} onChange={e=>onChange(e.target.value)}
    required={required} min={min} max={max} step={step} disabled={disabled}/>;
}
function Section({title,description,children}){
  return <Card className="space-y-4"><div><h2 className="text-lg font-extrabold">{title}</h2>{description&&<p className="text-sm text-ink-500">{description}</p>}</div>{children}</Card>;
}
const fmtDate=(date)=>date?new Date(date+"T00:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}):"—";

export default function ClinicWorkspace({clinic,onSaved,core}){
  const { language } = useLanguage();
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

  if(loading)return <p role="status" className="p-5 text-sm text-ink-500">Loading your clinic workspace…</p>;
  return <div className="grid gap-6 lg:grid-cols-[245px_minmax(0,1fr)]">
    <aside className="h-max rounded-2xl border border-stone-200 bg-white p-3 lg:sticky lg:top-24">
      <div className="mb-3 border-b border-stone-100 p-3"><p className="text-xs uppercase text-primary-700">Clinic Branch Manager</p>
        <h2 className="font-extrabold">{clinic.name}</h2><Pill value={clinic.status}/></div>
      <nav aria-label="Clinic manager sections" className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
        {menu.map(([key,label])=><button key={key} type="button" aria-current={tab===key?"page":undefined}
          className={"rounded-lg p-3 text-left text-xs font-bold "+(tab===key?"bg-primary-700 text-white":"text-ink-700 hover:bg-primary-50")}
          onClick={()=>navigate(key)}>{label}{key==="requests"&&pending.length>0?" ("+pending.length+")":""}</button>)}
      </nav>
    </aside>
    <div className="min-w-0 space-y-5">
      <PageHeader title={menu.find(x=>x[0]===tab)?.[1]||"Clinic"} eyebrow={"PetCare / "+clinic.name}
        description="Private information is restricted to the signed-in approved branch manager."
        action={<Button size="sm" variant="secondary" disabled={busy} onClick={()=>run(()=>reload(),"Data refreshed.")}>Refresh</Button>}/>
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice&&<p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      {!data&&<Section title="Unable to load workspace">Check the clinic API, Firebase login and permissions.</Section>}
      {data&&tab==="dashboard"&&<>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={language==="ru"?"Все записи":"Bookings"} value={a.bookings||0}/>
          <Metric label={language==="ru"?"Ожидают":"Pending requests"} value={a.pending||0}/>
          <Metric label={language==="ru"?"Подтверждены":"Confirmed"} value={a.confirmed||0}/>
          <Metric label={language==="ru"?"Завершены":"Completed"} value={a.completed||0}/>
        </div>
        <Section title="Today at a glance" description="Live appointments and clinic activity">
          {bookings.filter(x=>x.date===new Date().toISOString().slice(0,10)).length===0?<p className="text-sm text-ink-500">No appointments today.</p>:
            bookings.filter(x=>x.date===new Date().toISOString().slice(0,10)).map(x=><div key={x.id} className="flex justify-between gap-3 border-b py-2 text-sm">
              <span>{x.time} · {x.petName} · {x.serviceName}</span><Pill value={x.status}/></div>)}
        </Section>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button onClick={()=>navigate("requests")}>{language==="ru"?"Рассмотреть заявки":"Review booking requests"}</Button>
          <Button variant="secondary" onClick={()=>navigate("appointments")}>{language==="ru"?"Все записи":"View appointments"}</Button>
          <Button variant="secondary" onClick={()=>navigate("services")}>{language==="ru"?"Управление услугами":"Manage services"}</Button>
        </div>
      </>}
      {data&&tab==="requests"&&<Section title="New booking requests" description="Approve or decline each request before a slot is confirmed.">
        {!pending.length?<p className="text-sm text-ink-500">No pending requests.</p>:pending.map(x=><div key={x.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong>{x.petName} · {x.serviceName}</strong><Pill value={x.status}/></div>
          <p className="mt-2 text-xs text-ink-500">{fmtDate(x.date)} · {x.time} · {currency} {x.price||0}</p>
          <p className="my-2 text-sm">{x.notes||""}</p>
          <p className="mb-3 text-xs text-ink-600">Choose the appointment day and time before accepting. The pet owner will see the confirmed slot.</p>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Field type="date" label="Confirm date" required value={slotEdits[x.id]?.date ?? x.date}
              onChange={date=>setSlotEdits(current=>({...current,[x.id]:{date,time:current[x.id]?.time ?? x.time}}))}/>
            <Field type="time" label="Confirm time" required value={slotEdits[x.id]?.time ?? x.time}
              onChange={time=>setSlotEdits(current=>({...current,[x.id]:{date:current[x.id]?.date ?? x.date,time}}))}/>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} size="sm" onClick={()=>run(()=>clinicApi.updateBooking(x.id,"confirmed","",{
              date:slotEdits[x.id]?.date ?? x.date, time:slotEdits[x.id]?.time ?? x.time
            }),"Appointment confirmed with selected date and time.")}>Accept & confirm time</Button>
            <Button disabled={busy} size="sm" variant="danger" onClick={()=>{const reason=window.prompt("Reason for rejection (at least 5 characters):");
              if(reason&&reason.trim().length>=5)run(()=>clinicApi.updateBooking(x.id,"rejected",reason.trim()),"Request rejected.");}}>Reject</Button></div>
        </div>)}
      </Section>}
      {data&&tab==="appointments"&&<>
        <Section title="All clinic appointments" description="Pending, confirmed, completed, cancelled and rejected.">
          {!bookings.length?<p className="text-sm text-ink-500">No appointments recorded.</p>:bookings.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 text-sm">
            <div><strong>{x.petName||"Patient"} · {x.serviceName}</strong><p className="text-xs text-ink-500">{fmtDate(x.date)} · {x.time}</p></div>
            <div className="flex gap-2"><Pill value={x.status}/>{x.status==="confirmed"&&<Button size="sm" disabled={busy} onClick={()=>run(()=>clinicApi.updateBooking(x.id,"completed"),"Visit completed.")}>Complete</Button>}</div>
          </div>)}
        </Section>
      </>}
      {data&&tab==="calendar"&&<Section title="Clinic calendar" description="Times are shown in the clinic's configured local time zone.">
        <div className="max-w-xs"><Field label="Choose day" type="date" value={calendarDate} onChange={setCalendarDate}/></div>
        {!clinicCalendar.length?<p className="text-sm text-ink-500">No appointments on this day.</p>:clinicCalendar.map(x=><div key={x.id} className="flex items-center justify-between gap-3 border-b py-3 text-sm">
          <span>{x.time} — {x.petName} · {x.serviceName}</span><Pill value={x.status}/></div>)}
      </Section>}
      {data&&(tab==="team"||tab==="shifts")&&<>
        <Section title={tab==="team"?"Doctors and receptionists":"Weekly shift availability"} description="Staff profiles and shift schedules are managed by this clinic branch.">
          {!staff.length?<p className="text-sm text-ink-500">Add your first team member.</p>:staff.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
            <button type="button" className="text-left text-sm" onClick={()=>setSelectedStaff(s.id)}><strong>{s.name}</strong><p className="text-xs text-ink-500">{s.role} · {s.specialty||s.email}</p>
              <p className="text-xs text-ink-500">{s.workingDays?.map(n=>days[n]).join(", ")} · {s.shiftStart}–{s.shiftEnd}</p></button>
            <div className="flex gap-2"><Pill value={s.status}/>
              <Button size="sm" variant="secondary" onClick={()=>{setStaffForm({...s});setEditingStaff(s.id);}}>Edit</Button></div>
          </div>)}
          {activeDoctor&&<div className="rounded-xl bg-primary-50 p-4 text-sm">
            <strong>Team member profile — {activeDoctor.name}</strong>
            <p>{activeDoctor.role} · {activeDoctor.specialty||"General care"} · {activeDoctor.yearsExperience||0} years experience</p>
            <p>{activeDoctor.email} · {activeDoctor.status}</p>
            <p className="mt-2 text-xs text-ink-500">Medical data access requires a separately approved staff account. A team listing alone does not grant login permissions.</p>
          </div>}
        </Section>
        <Section title={editingStaff?"Edit team member":"Add team member"} description="Assign a role and a weekly availability schedule.">
          <form onSubmit={submitStaff} className="grid gap-3 sm:grid-cols-2">
            <Field required label="Full name" value={staffForm.name} onChange={v=>setStaffForm({...staffForm,name:v})}/>
            <Field required label="Work email" type="email" value={staffForm.email} onChange={v=>setStaffForm({...staffForm,email:v})}/>
            <Select label="Role" value={staffForm.role} onChange={e=>setStaffForm({...staffForm,role:e.target.value})}>
              <option value="veterinarian">Veterinarian</option><option value="receptionist">Receptionist</option>
            </Select>
            <Select label="Status" value={staffForm.status} onChange={e=>setStaffForm({...staffForm,status:e.target.value})}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </Select>
            <Field label="Specialty" value={staffForm.specialty} onChange={v=>setStaffForm({...staffForm,specialty:v})}/>
            <Field label="Experience (years)" type="number" min="0" max="70" value={staffForm.yearsExperience} onChange={v=>setStaffForm({...staffForm,yearsExperience:v})}/>
            <Field label="Shift start" type="time" value={staffForm.shiftStart} onChange={v=>setStaffForm({...staffForm,shiftStart:v})}/>
            <Field label="Shift end" type="time" value={staffForm.shiftEnd} onChange={v=>setStaffForm({...staffForm,shiftEnd:v})}/>
            <fieldset className="sm:col-span-2"><legend className="mb-2 text-xs font-bold">Working days</legend>
              <div className="flex flex-wrap gap-3">{days.map((d,i)=><label key={d} className="text-sm"><input type="checkbox" checked={staffForm.workingDays.includes(i)}
                onChange={e=>setStaffForm({...staffForm,workingDays:e.target.checked?[...staffForm.workingDays,i]:staffForm.workingDays.filter(v=>v!==i)})}/> {d}</label>)}</div>
            </fieldset>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>{editingStaff?"Save changes":"Add member"}</Button>
              {editingStaff&&<Button type="button" variant="secondary" onClick={()=>{setStaffForm(blankStaff);setEditingStaff("");}}>Cancel edit</Button>}
              {editingStaff&&<Button type="button" variant="danger" disabled={busy} onClick={()=>{if(window.confirm("Remove this team member?"))run(()=>clinicWorkspaceApi.removeStaff(editingStaff),"Team member removed.").then(ok=>{if(ok){setEditingStaff("");setStaffForm(blankStaff);}});}}>Remove</Button>}
            </div>
          </form>
        </Section>
      </>}
      {data&&(tab==="patients"||tab==="records"||tab==="newVisit")&&<>
        <Section title="Patient directory" description="Medical data is private to your approved clinic branch.">
          <div className="max-w-sm"><Field label="Search patient or owner" value={search} onChange={setSearch}/></div>
          {!matchingPatients.length?<p className="text-sm text-ink-500">No patients match your search.</p>:matchingPatients.map(p=><button key={p.id} type="button"
            className={"block w-full border-b p-3 text-left text-sm hover:bg-primary-50 "+(selectedPatient===p.id?"bg-primary-50":"")}
            onClick={()=>setSelectedPatient(p.id)}><strong>{p.name}</strong> · {p.species} · {p.breed}
            <p className="text-xs text-ink-500">Owner: {p.ownerName} · {p.ownerPhone||"Phone not provided"}</p></button>)}
          {selected&&<div className="rounded-xl border bg-stone-50 p-4 text-sm">
            <h3 className="font-extrabold">Patient overview: {selected.name}</h3>
            <p>{selected.breed||selected.species} · {selected.gender||"Gender not recorded"} · Birth date: {selected.birthDate||"Unknown"}</p>
            <p>Weight: {selected.weight??"Unknown"} kg · Blood type: {selected.bloodType||"Unknown"}</p>
            <p>Allergies: {selected.allergies||"None reported"} · Health: {selected.healthStatus||"Not assessed"}</p>
            <p>Last visit: {visitList(selected.id)[0]?.visitDate||"None"}</p>
            <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" onClick={()=>{setEditingPatient(selected.id);setPatientForm({...selected});navigate("patients");}}>Edit patient</Button>
              <Button size="sm" onClick={()=>navigate("newVisit")}>Record visit</Button></div>
          </div>}
        </Section>
        {tab==="patients"&&<Section title={editingPatient?"Edit patient profile":"Register patient"}>
          <form onSubmit={submitPatient} className="grid gap-3 sm:grid-cols-2">
            <Field required label="Pet name" value={patientForm.name} onChange={v=>setPatientForm({...patientForm,name:v})}/>
            <Select label="Species" value={patientForm.species} onChange={e=>setPatientForm({...patientForm,species:e.target.value})}>
              {["dog","cat","bird","fish","rabbit","other"].map(x=><option key={x}>{x}</option>)}
            </Select>
            <Field label="Breed" value={patientForm.breed} onChange={v=>setPatientForm({...patientForm,breed:v})}/>
            <Field label="Gender" value={patientForm.gender} onChange={v=>setPatientForm({...patientForm,gender:v})}/>
            <Field required label="Owner full name" value={patientForm.ownerName} onChange={v=>setPatientForm({...patientForm,ownerName:v})}/>
            <Field label="Owner phone" type="tel" value={patientForm.ownerPhone} onChange={v=>setPatientForm({...patientForm,ownerPhone:v})}/>
            <Field label="Birth date (optional)" type="date" value={patientForm.birthDate} onChange={v=>setPatientForm({...patientForm,birthDate:v})}/>
            <Field label="Weight (kg)" type="number" step="0.1" min="0" max="1000" value={patientForm.weight} onChange={v=>setPatientForm({...patientForm,weight:v})}/>
            <Field label="Blood type" value={patientForm.bloodType} onChange={v=>setPatientForm({...patientForm,bloodType:v})}/>
            <Field label="Health status" value={patientForm.healthStatus} onChange={v=>setPatientForm({...patientForm,healthStatus:v})}/>
            <div className="sm:col-span-2"><Field label="Allergies" value={patientForm.allergies} onChange={v=>setPatientForm({...patientForm,allergies:v})}/></div>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>{editingPatient?"Update patient":"Add patient"}</Button>
              {editingPatient&&<Button type="button" variant="secondary" onClick={()=>{setPatientForm(blankPatient);setEditingPatient("");}}>Cancel</Button>}</div>
          </form>
        </Section>}
        {tab==="records"&&<Section title="Medical records and visit history" description="Clinic-only records, ordered by visit date.">
          {!visitList(selectedPatient).length?<p className="text-sm text-ink-500">No medical records available.</p>:
            visitList(selectedPatient).map(r=><div key={r.id} className="rounded-xl border p-4 text-sm">
              <strong>{fmtDate(r.visitDate)} · {r.patientName} · {r.diagnosis}</strong>
              <p className="mt-2">Clinical notes: {r.clinicalNotes||"—"}</p><p>Treatment: {r.treatment||"—"}</p>
              <p className="text-xs text-ink-500">Lab/report reference: {r.labReportNotes||"None"}</p>
            </div>)}
          <Button onClick={()=>navigate("newVisit")}>Add medical record</Button>
        </Section>}
        {tab==="newVisit"&&<Section title="Add visit record" description="Select a patient, diagnosis, attending veterinarian and treatment.">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitRecord}>
            <Select label="Patient" required value={selectedPatient} onChange={e=>setSelectedPatient(e.target.value)}>
              <option value="">Select patient</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name} — {p.ownerName}</option>)}
            </Select>
            <Select label="Attending veterinarian" value={recordForm.doctorId} onChange={e=>setRecordForm({...recordForm,doctorId:e.target.value})}>
              <option value="">Unassigned</option>{staff.filter(s=>s.role==="veterinarian"&&s.status==="active").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Field required label="Visit date" type="date" value={recordForm.visitDate} onChange={v=>setRecordForm({...recordForm,visitDate:v})}/>
            <Field label="Appointment duration (minutes)" type="number" min="5" max="480" value={recordForm.durationMinutes} onChange={v=>setRecordForm({...recordForm,durationMinutes:v})}/>
            <div className="sm:col-span-2"><Field required label="Diagnosis" value={recordForm.diagnosis} onChange={v=>setRecordForm({...recordForm,diagnosis:v})}/></div>
            <Textarea label="Clinical notes" value={recordForm.clinicalNotes} onChange={e=>setRecordForm({...recordForm,clinicalNotes:e.target.value})}/>
            <Textarea label="Treatment / medication" value={recordForm.treatment} onChange={e=>setRecordForm({...recordForm,treatment:e.target.value})}/>
            <div className="sm:col-span-2"><Field label="Lab report reference / notes" value={recordForm.labReportNotes} onChange={v=>setRecordForm({...recordForm,labReportNotes:v})}/>
              <p className="mt-1 text-xs text-ink-500">Actual medical-file attachment upload requires a separate private-scanning workflow; no medical images are sent from this form.</p></div>
            <Button type="submit" disabled={busy||!selectedPatient}>Save medical record</Button>
          </form>
        </Section>}
      </>}
      {data&&tab==="services"&&<>{core.services}
        <Section title="Published services">{!serviceOptions.length?<p className="text-sm text-ink-500">No services yet.</p>:serviceOptions.map(s=><div key={s.id} className="flex items-center justify-between border-b py-2 text-sm">
          <span>{s.name} · {s.durationMinutes} min</span><span>{currency} {s.price} <Pill value={s.available!==false?"active":"inactive"}/></span></div>)}</Section></>}
      {data&&tab==="analytics"&&<>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Appointments" value={a.bookings||0}/>
          <Metric label="Completed" value={a.completed||0}/><Metric label="Completion rate" value={(a.completionRate||0)+"%"}/>
          <Metric label={"Completed revenue (" + currency + ")"} value={a.revenueRUB ?? a.revenueEGP ?? 0}/></div>
        <Section title="Service distribution">{!a.serviceDistribution?.length?<p className="text-sm text-ink-500">No service activity yet.</p>:
          a.serviceDistribution.map(s=><div key={s.name} className="flex justify-between border-b py-2 text-sm"><span>{s.name}</span><strong>{s.count}</strong></div>)}
          <p className="text-xs text-ink-500">These statistics use actual clinic appointments. No sample ratings or revenue have been invented.</p>
        </Section>
      </>}
      {data&&tab==="settings"&&<Section title="Notifications" description="Clinic activity and patient record updates.">
        {!data.notifications.length?<p className="text-sm text-ink-500">No notifications yet.</p>:data.notifications.slice().reverse().map(n=><div key={n.id} className="flex flex-wrap justify-between gap-3 border-b py-3 text-sm">
          <div><strong>{n.title}</strong><p>{n.body}</p></div>
          {!n.read&&<Button size="sm" variant="secondary" disabled={busy} onClick={()=>run(()=>clinicWorkspaceApi.markRead(n.id),"Marked as read.")}>Mark read</Button>}
        </div>)}
      </Section>}
      {data&&tab==="settings"&&<>
        {core.profile}{core.availability}
        <Section title="Notifications and privacy settings">
          <form className="space-y-4" onSubmit={e=>{e.preventDefault();run(()=>clinicWorkspaceApi.updateSettings(settings),"Preferences saved.");}}>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.notifyNewBookings}
              onChange={e=>setSettings({...settings,notifyNewBookings:e.target.checked})}/> New booking alerts</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.notifyMedicalRecords}
              onChange={e=>setSettings({...settings,notifyMedicalRecords:e.target.checked})}/> Medical record alerts</label>
            <Field label="Privacy contact email" type="email" value={settings.privacyContactEmail} onChange={v=>setSettings({...settings,privacyContactEmail:v})}/>
            <p className="text-xs text-ink-500">Changing staff roles here does not automatically grant Firebase access to medical records. Branch approval and user-level permissions remain enforced on the server.</p>
            <Button type="submit" disabled={busy}>Save branch settings</Button>
          </form>
        </Section>
      </>}
    </div>
  </div>;
}
