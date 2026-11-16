import { auth } from "../firebase.js";

const BASE = (import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:10000").replace(/\/+$/, "");
async function request(path,{method="GET",body}={}){
  await auth.authStateReady();
  if(!auth.currentUser) throw Error("Sign in to manage your clinic.");
  const headers={Authorization:"Bearer "+await auth.currentUser.getIdToken()};
  if(body!==undefined) headers["Content-Type"]="application/json";
  let response;
  try{
    response=await fetch(BASE+path,{method,headers,cache:"no-store",
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
  }catch{throw Error("Clinic service is unreachable. Check the API deployment and network.");}
  const value=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(value.error||"Clinic service failed ("+response.status+").");
  return value;
}
const base="/api/clinics/mine";
export const clinicWorkspaceApi={
  snapshot:()=>request(base+"/workspace"),
  addStaff:(staff)=>request(base+"/staff",{method:"POST",body:{staff}}),
  updateStaff:(id,staff)=>request(base+"/staff/"+encodeURIComponent(id),{method:"PUT",body:{staff}}),
  removeStaff:(id)=>request(base+"/staff/"+encodeURIComponent(id),{method:"DELETE"}),
  addPatient:(patient)=>request(base+"/patients",{method:"POST",body:{patient}}),
  updatePatient:(id,patient)=>request(base+"/patients/"+encodeURIComponent(id),{method:"PUT",body:{patient}}),
  patientRecords:(id)=>request(base+"/patients/"+encodeURIComponent(id)+"/records"),
  addRecord:(id,record)=>request(base+"/patients/"+encodeURIComponent(id)+"/records",{method:"POST",body:{record}}),
  createAppointment:(appointment)=>request(base+"/manual-appointments",{method:"POST",body:{appointment}}),
  updateSettings:(settings)=>request(base+"/settings",{method:"PUT",body:{settings}}),
  markRead:(id)=>request(base+"/notifications/read",{method:"POST",body:{id}})
};