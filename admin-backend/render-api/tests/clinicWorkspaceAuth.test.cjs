"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { registerClinicWorkspace } = require("../clinicWorkspace.cjs");
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
function fakeEnvironment(){
  const routes=new Map(), calls=[];
  const list={docs:[],size:0,empty:true};
  const scope=(uid,name)=>({
    limit(n){calls.push([uid,name,"limit",n]);return{get:async()=>list}},
    where(field,op,value){calls.push([uid,name,"where",field,op,value]);return{limit:()=>({get:async()=>list})}},
    doc(id){calls.push([uid,name,"doc",id]);return{get:async()=>({exists:false}),update:async()=>{}}}
  });
  const db={collection(name){
    if(name==="clinicBranches")return{doc(uid){calls.push([uid,"branch"]);return{
      get:async()=>({exists:uid!=="unapproved",data:()=>({status:uid==="unapproved"?"pending":"approved"})}),
      collection:(part)=>scope(uid,part)
    }}};
    if(name==="clinicAppointments")return{
      where(field,op,uid){calls.push([uid,"appointments",field,op]);return{limit:()=>({get:async()=>list})}}
    };
    throw Error("Unexpected collection "+name);
  }};
  const app={};
  for(const method of ["get","post","put","delete"])app[method]=(path,...handlers)=>routes.set(method+" "+path,handlers.at(-1));
  registerClinicWorkspace({app,db,signedInRoute:(fn)=>[fn],HttpError,
    FieldValue:{serverTimestamp:()=>new Date()},audit:async()=>{}});
  return {calls,routes};
}
function res(){return{data:null,statusCode:200,set(){return this},json(v){this.data=v;return this},
  status(v){this.statusCode=v;return this}};}
test("approved manager sees only the records scoped to own UID",async()=>{
  const {calls,routes}=fakeEnvironment();
  const handler=routes.get("get /api/clinics/mine/workspace");
  const alice=res(),bob=res();
  await handler({authUser:{uid:"alice"}},alice);
  const ac=calls.slice();calls.length=0;
  await handler({authUser:{uid:"bob"}},bob);
  assert.ok(ac.some(x=>x[0]==="alice"&&x[1]==="patients"));
  assert.ok(ac.some(x=>x[0]==="alice"&&x[1]==="records"));
  assert.ok(ac.some(x=>x[0]==="alice"&&x[1]==="staff"));
  assert.ok(ac.every(x=>x[0]==="alice"));
  assert.ok(calls.every(x=>x[0]==="bob"));
  assert.deepEqual(alice.data.patients,[]);
  assert.deepEqual(bob.data.records,[]);
});
test("unapproved manager cannot fetch private workspace",async()=>{
  const {routes}=fakeEnvironment();
  await assert.rejects(
    routes.get("get /api/clinics/mine/workspace")({authUser:{uid:"unapproved"}},res()),
    e=>e.status===403&&/approved/i.test(e.message)
  );
});
test("cross-branch patient selection is not a supported public read path",()=>{
  const {routes}=fakeEnvironment();
  assert.equal(routes.has("get /api/clinics/:branchId/patients"),false);
  assert.equal(routes.has("get /api/admin/clinics/:id/medical-records"),false);
});
