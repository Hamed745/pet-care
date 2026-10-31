import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldAlert, LoaderCircle } from "lucide-react";
import { onAdminAuth } from "./adminApi.js";

export default function AdminGate({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, user: null, isAdmin: false });
  useEffect(() => onAdminAuth(setState), []);
  if (state.loading) return <section className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center gap-3 text-ink-600" role="status"><LoaderCircle className="animate-spin"/> Verifying administration access…</section>;
  if (!state.user || !state.isAdmin) return (
    <section className="mx-auto my-12 max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <ShieldAlert className="mx-auto mb-3 text-primary-600" size={34}/>
      <h1 className="text-2xl font-extrabold">{!state.user ? "Sign in to continue" : "Admin access required"}</h1>
      <p className="mt-3 text-sm text-ink-500">{!state.user ? "Use the existing PetCare login with an authorized administrator account." : "This account is not authorized. Only an administrator with a verified Firebase custom claim can enter."}</p>
      <Link className="mt-5 inline-flex rounded-xl bg-primary-600 px-5 py-3 font-bold text-white" to={!state.user ? "/login" : "/"} state={!state.user ? {from:location.pathname} : undefined}>{!state.user ? "Sign in" : "Back to PetCare"}</Link>
    </section>
  );
  return children;
}
