import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../src/pages/Auth.jsx",import.meta.url),"utf8");
const register=source.slice(source.indexOf("export function Register()"),source.indexOf("export function Forgot()"));
test("registration offers both Pet Owner and Clinic Branch Manager choices",()=>{
  assert.match(register,/name="accountType"/);
  assert.match(register,/value="pet-owner"/);
  assert.match(register,/value="clinic"/);
  assert.match(register,/>Pet Owner</);
  assert.match(register,/>Clinic Branch Manager</);
});
test("clinic selection redirects to portal while standard accounts continue home",()=>{
  assert.match(register,/nav\(accountType === "clinic" \? "\/clinic" : "\/"\)/);
  assert.match(register,/state=\{\{ from: accountType === "clinic" \? "\/clinic" : "\/" \}\}/);
  assert.match(register,/get\("next"\) === "\/clinic"/);
});
test("signup selection does not directly grant approval or admin privileges",()=>{
  assert.doesNotMatch(register,/petcareAdmin\s*:\s*true/);
  assert.match(register,/until approved by PetCare Admin/);
});