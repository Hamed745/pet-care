"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const region = "us-central1";
const useCall = (handler) => onCall({region, enforceAppCheck: false, cors: true, maxInstances: 10}, handler);
const checkAuth = (request) => {if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in first.");return request.auth.uid;};
const checkAdmin = (request) => {const uid=checkAuth(request);if(request.auth.token.petcareAdmin!==true)throw new HttpsError("permission-denied","Admin permissions required.");return uid;};
const sanitize = (value,max=200) => typeof value === "string" ? value.trim().slice(0,max) : "";
const stamp = (v) => {if (!v) return null;if(v.toDate) return v.toDate().toISOString();return String(v).slice(0,60);};
const numeric = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const safeTime = () => admin.firestore.FieldValue.serverTimestamp();
const audit = (actorUid, action, targetId, reason="") => db.collection("adminAuditLogs").add({actorUid,action,targetId,reason:sanitize(reason,300),createdAt:safeTime()});
const unwrap = (doc) => {const d=doc.data()||{};return {id:doc.id,...d,createdAt:stamp(d.createdAt),updatedAt:stamp(d.updatedAt),history:Array.isArray(d.history)?d.history.map(x=>({...x,at:stamp(x.at)})):[]};};
const count = async(name) => (await db.collection(name).count().get()).data().count;

exports.petcareAdminOverview = useCall(async(request)=> {
 checkAdmin(request);
 // Auth is the source of truth for the user count. Bound reads keep the dashboard responsive.
 let usersCount=0,disabledCount=0,pageToken,limitReached=false;
 do {const batch=await admin.auth().listUsers(1000,pageToken);usersCount+=batch.users.length;disabledCount+=batch.users.filter(u=>u.disabled).length;pageToken=batch.pageToken;} while(pageToken && usersCount<10000);
 if(pageToken) limitReached=true;
 const profilesSnap=await db.collection("adminUserProfiles").limit(10000).get();
 const cityCounts=new Map();let profilesWithCity=0;
 profilesSnap.forEach(doc=> {const city=sanitize(doc.data().city,100);if(city){profilesWithCity++;const key=city.toLocaleLowerCase("ru-RU");const existing=cityCounts.get(key);cityCounts.set(key,{city:existing?.city||city,count:(existing?.count||0)+1});}});
 const cities=[...cityCounts.values()].sort((a,b)=>b.count-a.count || a.city.localeCompare(b.city)).slice(0,100);
 const [petsCount,productsCount,ordersCount,activeSnap,recentSnap] = await Promise.all([
  count("adminPetSummaries"),count("adminProducts"),count("adminOrders"),
  db.collection("adminOrders").where("status","in",["pending","confirmed","preparing","out_for_delivery","ready_for_pickup"]).count().get(),
  db.collection("adminOrders").orderBy("createdAt","desc").limit(5).get(),
 ]);
 return {usersCount, disabledCount,petsCount,productsCount,ordersCount,activeOrders:activeSnap.data().count,profilesWithCity,cities,recentOrders:recentSnap.docs.map(unwrap),partial:limitReached||profilesSnap.size===10000};
});
exports.petcareAdminUsers=useCall(async(request)=>{
 checkAdmin(request);const token=sanitize(request.data?.pageToken,2000)||undefined;
 let list;try{list=await admin.auth().listUsers(100,token);}catch{throw new HttpsError("invalid-argument","Invalid pagination token.");}
 const refs=list.users.map(u=>db.doc(`adminUserProfiles/${u.uid}`));
 const profiles=refs.length ? await db.getAll(...refs):[];
 return {users:list.users.map((u,i)=>({uid:u.uid,email:u.email||"",name:profiles[i]?.data()?.name||u.displayName||"",city:profiles[i]?.data()?.city||"",disabled:u.disabled,createdAt:u.metadata?.creationTime||""})),nextPageToken:list.pageToken||""};
});
exports.petcareAdminPets=useCall(async(request)=>{checkAdmin(request);const docs=await db.collection("adminPetSummaries").limit(250).get();return {pets:docs.docs.map(unwrap),limited:docs.size===250};});
exports.petcareAdminOrders=useCall(async(request)=>{checkAdmin(request);const docs=await db.collection("adminOrders").orderBy("createdAt","desc").limit(250).get();return {orders:docs.docs.map(unwrap),limited:docs.size===250};});
exports.petcareAdminProducts=useCall(async(request)=>{checkAdmin(request);const docs=await db.collection("adminProducts").orderBy("updatedAt","desc").limit(300).get();return {products:docs.docs.map(unwrap),limited:docs.size===300};});
exports.petcareAdminActivity=useCall(async(request)=>{checkAdmin(request);const docs=await db.collection("adminAuditLogs").orderBy("createdAt","desc").limit(100).get();return {logs:docs.docs.map(unwrap)};});
exports.petcareAdminSuspendUser=useCall(async(request)=>{
 const actorUid=checkAdmin(request);const uid=sanitize(request.data?.uid,128),disabled=request.data?.disabled,reason=sanitize(request.data?.reason,300);
 if(!uid||uid===actorUid||typeof disabled!=="boolean"||reason.length<5) throw new HttpsError("invalid-argument","Specify a different user, action and reason (5+ chars).");
 let target;try{target=await admin.auth().getUser(uid);}catch{throw new HttpsError("not-found","Account not found.");}
 if(target.customClaims?.petcareAdmin===true)throw new HttpsError("failed-precondition","Another admin account cannot be suspended with this action.");
 await admin.auth().updateUser(uid,{disabled});
 if(disabled) await admin.auth().revokeRefreshTokens(uid);
 await audit(actorUid,disabled?"user.suspend":"user.restore",uid,reason);
 return {ok:true};
});
const transitions={pending:["confirmed","rejected","cancelled"],confirmed:["preparing","cancelled"],preparing:["out_for_delivery","ready_for_pickup","cancelled"],out_for_delivery:["delivered"],ready_for_pickup:["picked_up"],delivered:[],picked_up:[],cancelled:[],rejected:[]};
exports.petcareAdminOrderStatus=useCall(async(request)=>{
 const actorUid=checkAdmin(request),orderId=sanitize(request.data?.orderId,128),status=sanitize(request.data?.status,40),note=sanitize(request.data?.note,250);
 if(!orderId||!Object.hasOwn(transitions,status))throw new HttpsError("invalid-argument","Invalid order or status.");
 const ref=db.collection("adminOrders").doc(orderId);
 await db.runTransaction(async(trx)=> {const snap=await trx.get(ref);if(!snap.exists)throw new HttpsError("not-found","Order not found.");const record=snap.data();const previous=record.status||"pending";
 if(!(transitions[previous]||[]).includes(status))throw new HttpsError("failed-precondition",`Status transition ${previous} -> ${status} is not allowed.`);
 if(status==="out_for_delivery" && record.fulfilment==="pickup")throw new HttpsError("failed-precondition","Pickup orders cannot be shipped.");
 if(status==="ready_for_pickup" && record.fulfilment==="delivery")throw new HttpsError("failed-precondition","Delivery orders cannot use store pickup.");
 const history=[...(record.history||[]).slice(-99),{status,at:new Date().toISOString(),by:actorUid,note}];
 trx.update(ref,{status,history,updatedAt:safeTime()}); });
 await audit(actorUid,"order.status",orderId,`${status}${note?": "+note:""}`);return {ok:true};
});
exports.petcareAdminSaveProduct=useCall(async(request)=>{
 const actorUid=checkAdmin(request), p=request.data?.product||{};
 const name=sanitize(p.name,120), category=sanitize(p.category,100),petType=sanitize(p.petType,40),description=sanitize(p.description,1500),imageUrl=sanitize(p.imageUrl,1000);
 const price=Number(p.price),stock=Number(p.stock),published=p.published===true;
 if(!name||!category||!["dog","cat","bird","fish","small"].includes(petType)||!Number.isInteger(price)||price<0||price>10000000||!Number.isInteger(stock)||stock<0||stock>10000000)throw new HttpsError("invalid-argument","Invalid product fields.");
 if(imageUrl && !/^https:\/\//i.test(imageUrl))throw new HttpsError("invalid-argument","Product image must be an HTTPS URL.");
 const id = p.id ? sanitize(p.id,120) : db.collection("adminProducts").doc().id;
 const ref=db.collection("adminProducts").doc(id);if(p.id && !(await ref.get()).exists)throw new HttpsError("not-found","Product does not exist.");
 await ref.set({name,category,petType,description,imageUrl,price,stock,published,updatedAt:safeTime(),updatedBy:actorUid,...(!p.id?{createdAt:safeTime()}: {})},{merge:true});
 await audit(actorUid,p.id?"product.update":"product.create",id);return {ok:true,id};
});
// Self-service profile mirror. Only Firebase-authenticated users can update their OWN record.
exports.petcareSaveMyProfile=useCall(async(request)=>{
 const uid=checkAuth(request),p=request.data?.profile||{};const city=sanitize(p.city,100),name=sanitize(p.name,100),phone=sanitize(p.phone,30);
 // Do not erase an existing required city when an old browser has incomplete local state.
 const patch={updatedAt:safeTime()}; if(city)patch.city=city;if(name)patch.name=name;if(phone)patch.phone=phone;
 if(Object.keys(patch).length===1)return {ok:true,skipped:true};
 await db.collection("adminUserProfiles").doc(uid).set(patch,{merge:true});return {ok:true};
});
// Save only basic public pet metadata. No vaccinations, medications, notes or medical history.
exports.petcareSaveMyPetSummary=useCall(async(request)=>{
 const uid=checkAuth(request),pet=request.data?.pet||{};
 const petId=sanitize(String(pet.id||""),80),name=sanitize(pet.name,100),type=sanitize(pet.type,60),breed=sanitize(pet.breed,100);
 const age=Number(pet.age);
 if(!/^[\w-]{1,80}$/.test(petId)||!name||!type||!Number.isFinite(age)||age<0||age>120)throw new HttpsError("invalid-argument","Invalid pet data.");
 // Protect against demo pet records being uploaded as real accounts.
 if(petId==="1"&&name==="Luna")return {ok:true,skipped:true};
 const ownerDoc=await db.collection("adminUserProfiles").doc(uid).get();
 await db.collection("adminPetSummaries").doc(`${uid}_${petId}`).set({ownerUid:uid,ownerName:ownerDoc.data()?.name||"",name,type,breed,age,updatedAt:safeTime()},{merge:true});
 return {ok:true};
});
exports.petcareDeleteMyPetSummary=useCall(async(request)=>{
 const uid=checkAuth(request),petId=sanitize(String(request.data?.petId||""),80);
 if(!/^[\w-]{1,80}$/.test(petId))throw new HttpsError("invalid-argument","Invalid pet ID.");
 await db.collection("adminPetSummaries").doc(`${uid}_${petId}`).delete();return {ok:true};
});
