"use strict";
const { randomUUID } = require("node:crypto");
const VALID_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const ROLES = ["veterinarian","receptionist"];
function txt(v,name,max=200,required=true) {
  if(typeof v!=="string" || (required && !v.trim()) || v.trim().length>max) throw Error("Invalid "+name+".");
  return v.trim();
}
function opt(v,name,max=200){return v===undefined||v===null||v===""?"":txt(v,name,max,false)}
function num(v,name,min,max) {
  const x=Number(v);if(v===null||v===undefined||v===""||!Number.isFinite(x)||x<min||x>max)throw Error("Invalid "+name+".");return x;
}
function date(v) {
  const x=txt(v,"date",10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(x)||!Number.isFinite(Date.parse(x))||
      new Date(x+"T00:00:00Z").toISOString().slice(0,10)!==x) throw Error("Invalid date.");
  return x;
}
function time(v) {
  const x=txt(v,"time",5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(x))throw Error("Invalid time.");return x;
}
function days(v) {
  if(!Array.isArray(v)||v.length>7||v.some(x=>!Number.isInteger(x)||x<0||x>6)||new Set(v).size!==v.length)throw Error("Invalid working days.");
  return v;
}
function staffData(o) {
  if(!o||typeof o!=="object"||Array.isArray(o))throw Error("Invalid team member.");
  const role=txt(o.role,"role",20);if(!ROLES.includes(role))throw Error("Invalid role.");
  const email=txt(o.email,"email",180).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("Invalid email.");
  const status=o.status===undefined?"active":txt(o.status,"status",20);
  if(!["active","inactive"].includes(status))throw Error("Invalid status.");
  const shiftStart=time(o.shiftStart||"09:00"),shiftEnd=time(o.shiftEnd||"17:00");
  if(shiftStart>=shiftEnd)throw Error("End of shift must follow its start.");
  return {name:txt(o.name,"name",120),email,role,status,
    specialty:opt(o.specialty,"specialty",120),
    yearsExperience:o.yearsExperience==null||o.yearsExperience===""?0:num(o.yearsExperience,"years of experience",0,70),
    workingDays:days(o.workingDays||[0,1,2,3,4]),shiftStart,shiftEnd};
}
function patientData(o) {
  if(!o||typeof o!=="object"||Array.isArray(o))throw Error("Invalid patient.");
  const species=txt(o.species,"species",30);
  if(!["dog","cat","bird","fish","rabbit","other"].includes(species))throw Error("Invalid species.");
  const birthDate=o.birthDate?date(o.birthDate):"";
  if(birthDate&&birthDate>new Date().toISOString().slice(0,10))throw Error("Birth date cannot be in the future.");
  const ownerPhone=opt(o.ownerPhone,"owner phone",32);
  if(ownerPhone&&!/^[+\d\s()-]{7,32}$/.test(ownerPhone))throw Error("Invalid phone.");
  return {name:txt(o.name,"patient name",120),species,breed:opt(o.breed,"breed",120),
    gender:opt(o.gender,"gender",20),ownerName:txt(o.ownerName,"owner name",120),
    ownerPhone,birthDate,weight:o.weight==null||o.weight===""?null:num(o.weight,"weight",0,1000),
    bloodType:opt(o.bloodType,"blood type",40),allergies:opt(o.allergies,"allergies",500),
    healthStatus:opt(o.healthStatus,"health",200)};
}
function recordData(o) {
  if(!o||typeof o!=="object"||Array.isArray(o))throw Error("Invalid medical record.");
  return {visitDate:date(o.visitDate),doctorId:opt(o.doctorId,"doctor",128),
    diagnosis:txt(o.diagnosis,"diagnosis",700),clinicalNotes:opt(o.clinicalNotes,"notes",3000),
    treatment:opt(o.treatment,"treatment",2000),labReportNotes:opt(o.labReportNotes,"lab report",500),
    durationMinutes:o.durationMinutes==null||o.durationMinutes===""?30:num(o.durationMinutes,"duration",5,480)};
}
function cleanDocument(doc){const data=doc.data()||{};return {id:doc.id,...Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v?.toDate?v.toDate().toISOString():v]))};}
function registerClinicWorkspace({app,db,signedInRoute,HttpError,FieldValue,audit}) {
  const root=db.collection("clinicBranches");
  const appointments=db.collection("clinicAppointments");
  function bad(message,status=400){throw new HttpError(status,message);}
  function parse(fn,x){try{return fn(x)}catch(e){bad(e.message)}}
  function id(x){if(!VALID_ID.test(String(x||"")))bad("Invalid record ID.");return x;}
  async function permitted(req){
    const snapshot=await root.doc(req.authUser.uid).get();
    if(!snapshot.exists||snapshot.data()?.status!=="approved")bad("Approved clinic manager access required.",403);
    return snapshot;
  }
  const section=(req,name)=>root.doc(req.authUser.uid).collection(name);
  async function getOwned(req,name,x){
    await permitted(req);const ref=section(req,name).doc(id(x)),snap=await ref.get();
    if(!snap.exists)bad("Record not found in your clinic.",404);
    return {ref,snap};
  }
  async function list(ref,count=200){const snapshot=await ref.limit(count).get();return snapshot.docs.map(cleanDocument);}
  const route=(handler)=>signedInRoute(async(req,res)=>{
    await permitted(req);res.set("Cache-Control","no-store, private");return handler(req,res);
  });
  const notification=async(uid,title,body)=>root.doc(uid).collection("notifications").add({
    title,body,read:false,createdAt:FieldValue.serverTimestamp()
  });
  app.get("/api/clinics/mine/workspace",...route(async(req,res)=>{
    const [staff,patients,records,bookings,notifications,branch]=await Promise.all([
      list(section(req,"staff"),40),list(section(req,"patients"),500),
      list(section(req,"records"),250),
      appointments.where("clinicId","==",req.authUser.uid).limit(250).get(),
      list(section(req,"notifications"),100),
      root.doc(req.authUser.uid).get()
    ]);
    const all=bookings.docs.map(cleanDocument), completed=all.filter(x=>x.status==="completed");
    const distribution={};for(const x of all){const n=x.serviceName||"Other";distribution[n]=(distribution[n]||0)+1;}
    res.json({staff,patients,records,appointments:all,notifications,
      settings:branch.data()?.clinicSettings||{},
      analytics:{bookings:all.length,pending:all.filter(x=>x.status==="pending").length,
        confirmed:all.filter(x=>x.status==="confirmed").length,
        completed:completed.length,cancelled:all.filter(x=>["cancelled","rejected"].includes(x.status)).length,
        patients:patients.length,staff:staff.filter(x=>x.status==="active").length,
        revenueEGP:completed.reduce((s,x)=>s+(Number(x.price)||0),0),
        completionRate:all.length?Math.round(completed.length*100/all.length):0,
        serviceDistribution:Object.entries(distribution).map(([name,count])=>({name,count}))}});
  }));
  app.post("/api/clinics/mine/staff",...route(async(req,res)=>{
    const data=parse(staffData,req.body?.staff);
    const col=section(req,"staff");
    if((await col.limit(40).get()).size>=40)bad("Maximum 40 staff members.",409);
    if(!(await col.where("email","==",data.email).limit(1).get()).empty)bad("Staff email already listed.",409);
    const ref=col.doc(randomUUID());await ref.set({...data,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    await audit(req.authUser.uid,"clinic.staff.add",ref.id);res.status(201).json({staff:cleanDocument(await ref.get())});
  }));
  app.put("/api/clinics/mine/staff/:id",...route(async(req,res)=>{
    const {ref}=await getOwned(req,"staff",req.params.id),data=parse(staffData,req.body?.staff);
    const existing=await section(req,"staff").where("email","==",data.email).limit(2).get();
    if(existing.docs.some(x=>x.id!==ref.id))bad("Email belongs to another staff member.",409);
    await ref.set({...data,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    await audit(req.authUser.uid,"clinic.staff.update",ref.id);res.json({staff:cleanDocument(await ref.get())});
  }));
  app.delete("/api/clinics/mine/staff/:id",...route(async(req,res)=>{
    const {ref}=await getOwned(req,"staff",req.params.id);
    await ref.delete();await audit(req.authUser.uid,"clinic.staff.remove",ref.id);res.json({ok:true});
  }));
  app.post("/api/clinics/mine/patients",...route(async(req,res)=>{
    const data=parse(patientData,req.body?.patient),col=section(req,"patients");
    if((await col.limit(500).get()).size>=500)bad("Patient limit reached.",409);
    const ref=col.doc(randomUUID());await ref.set({...data,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    await audit(req.authUser.uid,"clinic.patient.add",ref.id);res.status(201).json({patient:cleanDocument(await ref.get())});
  }));
  app.put("/api/clinics/mine/patients/:id",...route(async(req,res)=>{
    const {ref}=await getOwned(req,"patients",req.params.id);
    const data=parse(patientData,req.body?.patient);
    await ref.set({...data,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    await audit(req.authUser.uid,"clinic.patient.update",ref.id);res.json({patient:cleanDocument(await ref.get())});
  }));
  app.get("/api/clinics/mine/patients/:id/records",...route(async(req,res)=>{
    await getOwned(req,"patients",req.params.id);
    const snap=await section(req,"records").where("patientId","==",req.params.id).limit(100).get();
    res.json({records:snap.docs.map(cleanDocument)});
  }));
  app.post("/api/clinics/mine/patients/:id/records",...route(async(req,res)=>{
    const {snap}=await getOwned(req,"patients",req.params.id);
    const data=parse(recordData,req.body?.record);
    if(data.doctorId){
      const d=await section(req,"staff").doc(id(data.doctorId)).get();
      if(!d.exists||d.data()?.role!=="veterinarian"||d.data()?.status!=="active")bad("Select an active veterinarian.");
    }
    const ref=section(req,"records").doc(randomUUID());
    await ref.set({...data,patientId:snap.id,patientName:snap.data()?.name||"",createdBy:req.authUser.uid,
      createdAt:FieldValue.serverTimestamp()});
    await notification(req.authUser.uid,"Medical visit saved","A medical record was created.");
    await audit(req.authUser.uid,"clinic.record.add",ref.id);
    res.status(201).json({record:cleanDocument(await ref.get())});
  }));
  app.post("/api/clinics/mine/manual-appointments",...route(async(req,res)=>{
    const data=req.body?.appointment||{};
    const {snap:patient}=await getOwned(req,"patients",data.patientId);
    const branch=await permitted(req),service=(branch.data()?.services||[]).find(x=>x.id===data.serviceId&&x.available!==false);
    if(!service)bad("Choose an available clinic service.");
    const when=parse(date,data.date),at=parse(time,data.time);
    if(when<new Date().toISOString().slice(0,10))bad("Appointment must be future-dated.");
    const docId=opt(data.doctorId,"doctor ID",128);
    if(docId){
      const doctor=await section(req,"staff").doc(id(docId)).get();
      if(!doctor.exists||doctor.data()?.role!=="veterinarian"||doctor.data()?.status!=="active")bad("Choose an active veterinarian.");
    }
    const ref=appointments.doc(randomUUID());
    await ref.set({clinicId:req.authUser.uid,clinicName:branch.data()?.name||"",
      patientId:patient.id,petName:patient.data()?.name||"",ownerName:patient.data()?.ownerName||"",
      serviceId:service.id,serviceName:service.name,price:service.price,durationMinutes:service.durationMinutes,
      doctorId:docId,date:when,time:at,notes:opt(data.notes,"notes",500),
      source:"clinic_manual",status:"pending",createdBy:req.authUser.uid,
      createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    await notification(req.authUser.uid,"New clinic appointment","A booking was recorded.");
    await audit(req.authUser.uid,"clinic.appointment.add",ref.id);
    res.status(201).json({appointment:cleanDocument(await ref.get())});
  }));
  app.put("/api/clinics/mine/settings",...route(async(req,res)=>{
    const d=req.body?.settings;
    if(!d||typeof d!=="object"||Array.isArray(d)||
      Object.keys(d).some(x=>!["notifyNewBookings","notifyMedicalRecords","privacyContactEmail"].includes(x)))bad("Invalid settings.");
    const privacyContactEmail=opt(d.privacyContactEmail,"email",180);
    if(privacyContactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyContactEmail))bad("Invalid email.");
    const settings={notifyNewBookings:d.notifyNewBookings!==false,
      notifyMedicalRecords:d.notifyMedicalRecords!==false,privacyContactEmail};
    await root.doc(req.authUser.uid).update({clinicSettings:settings,updatedAt:FieldValue.serverTimestamp()});
    res.json({settings});
  }));
  app.post("/api/clinics/mine/notifications/read",...route(async(req,res)=>{
    const ref=section(req,"notifications").doc(id(req.body?.id));const snap=await ref.get();
    if(!snap.exists)bad("Notification not found.",404);
    await ref.update({read:true});res.json({ok:true});
  }));
}
module.exports={registerClinicWorkspace,staffData,patientData,recordData,date,time};
