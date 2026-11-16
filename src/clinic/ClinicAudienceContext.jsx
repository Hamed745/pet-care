import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../store.jsx";
import { clinicApi } from "../services/clinicApi.js";

// This hint preserves the clinic signup journey before the manager has saved a
// draft. It is NOT an authorization token: every clinic operation is still
// verified by Firebase Auth and the branch-scoped backend API.
const PREFIX = "petcare-clinic-signup-intent-v1:";
export function hasClinicIntent(uid) {
  if (!uid) return false;
  try { return localStorage.getItem(PREFIX + uid) === "clinic"; }
  catch { return false; }
}
export function rememberClinicIntent(uid) {
  if (!uid) return;
  try { localStorage.setItem(PREFIX + uid, "clinic"); }
  catch { /* Browsers may disable local storage. */ }
}

const Context = createContext(null);
export function ClinicAudienceProvider({ children }) {
  const { user } = useApp();
  const uid = user?.uid || null;
  const requestId = useRef(0);
  const [state, setState] = useState({ uid: null, checking: false, isClinic: false, clinic: null, error: "" });

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    if (!uid) {
      setState({ uid: null, checking: false, isClinic: false, clinic: null, error: "" });
      return;
    }
    // Prevent public owner navigation being shown while identifying a signed-in
    // manager. Never infer an approved role solely from a browser flag.
    setState((current) => ({
      uid, checking: true,
      isClinic: current.uid === uid ? current.isClinic : hasClinicIntent(uid),
      clinic: current.uid === uid ? current.clinic : null,
      error: "",
    }));
    try {
      const result = await clinicApi.mine();
      if (requestId.current !== id) return;
      if (result.clinic) rememberClinicIntent(uid);
      setState({
        uid, checking: false,
        isClinic: Boolean(result.clinic) || hasClinicIntent(uid),
        clinic: result.clinic || null,
        error: "",
      });
    } catch (error) {
      if (requestId.current !== id) return;
      // Fail closed when the API cannot tell whether this account belongs to a
      // clinic. A retry is safer than displaying another role's dashboard.
      setState((current) => ({
        uid, checking: false, isClinic: current.isClinic || hasClinicIntent(uid),
        clinic: current.clinic, error: error.message || "Unable to verify account type.",
      }));
    }
  }, [uid]);
  useEffect(() => {
    refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  const markClinic = useCallback((clinic = null) => {
    if (!uid) return;
    rememberClinicIntent(uid);
    setState((current) => ({
      uid, checking: false, isClinic: true,
      clinic: clinic || current.clinic,
      error: "",
    }));
  }, [uid]);

  const checking = Boolean(uid && (state.uid !== uid || state.checking));
  const value = useMemo(() => ({
    isClinic: Boolean(uid && state.uid === uid && state.isClinic),
    checking,
    error: uid && state.uid === uid ? state.error : "",
    clinic: uid && state.uid === uid ? state.clinic : null,
    refresh, markClinic,
  }), [uid, state, checking, refresh, markClinic]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useClinicAudience() {
  const value = useContext(Context);
  if (!value) throw new Error("ClinicAudienceProvider missing.");
  return value;
}
