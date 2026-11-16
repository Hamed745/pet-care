"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {staffData,patientData,recordData,date,time} = require("../clinicWorkspace.cjs");
const staff={name:"Dr Sara",email:"Sara@Example.com",role:"veterinarian",workingDays:[0,1,2],shiftStart:"09:00",shiftEnd:"17:00"};
const patient={name:"Luna",species:"dog",breed:"Golden Retriever",ownerName:"Omar",birthDate:"2020-01-01",weight:23.5};
const record={visitDate:"2026-11-01",diagnosis:"Routine checkup",clinicalNotes:"No abnormal symptoms"};
test("clinic staff role is validated and email normalized",()=>{
 const s=staffData(staff);assert.equal(s.email,"sara@example.com");assert.equal(s.role,"veterinarian");
});
test("arbitrary administrator and owner roles cannot be assigned",()=>{
 assert.throws(()=>staffData({...staff,role:"admin"}),/role/);
 assert.throws(()=>staffData({...staff,role:"branch_owner"}),/role/);
});
test("staff shifts cannot end before start",()=>{
 assert.throws(()=>staffData({...staff,shiftStart:"18:00",shiftEnd:"09:00"}),/End/);
});
test("working days cannot be duplicated or invalid",()=>{
 assert.throws(()=>staffData({...staff,workingDays:[0,0]}),/days/);
 assert.throws(()=>staffData({...staff,workingDays:[7]}),/days/);
});
test("clinic patient input does not grant ownership of another pet",()=>{
 const p=patientData(patient);assert.equal(p.name,"Luna");assert.equal(p.species,"dog");
 assert.equal("ownerUid" in p,false);
});
test("patient birth dates must not lie in the future",()=>{
 assert.throws(()=>patientData({...patient,birthDate:"2099-01-01"}),/future/);
});
test("patient and owner names are required",()=>{
 assert.throws(()=>patientData({...patient,name:""}),/name/);
 assert.throws(()=>patientData({...patient,ownerName:""}),/owner/);
});
test("patient phone and weight are validated",()=>{
 assert.throws(()=>patientData({...patient,ownerPhone:"bad"}),/phone/);
 assert.throws(()=>patientData({...patient,weight:-1}),/weight/);
});
test("medical record requires diagnosis and visit date",()=>{
 assert.equal(recordData(record).diagnosis,"Routine checkup");
 assert.throws(()=>recordData({...record,diagnosis:""}),/diagnosis/);
 assert.throws(()=>recordData({...record,visitDate:"2026-02-31"}),/date/);
});
test("clinical notes have a length limit",()=>{
 assert.throws(()=>recordData({...record,clinicalNotes:"a".repeat(3001)}),/notes/);
});
test("appointment date and time validation",()=>{
 assert.equal(date("2026-11-23"),"2026-11-23");
 assert.equal(time("09:30"),"09:30");
 assert.throws(()=>date("2026-02-30"),/date/);
 assert.throws(()=>time("25:00"),/time/);
});
