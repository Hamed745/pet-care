import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase.js";
import { accountKey, defaultAccountData, readAccountData } from "../utils/accountStorage.js";
export { getStoredAccountProfile, transferGuestCart } from "../utils/accountStorage.js";

export default function useAccountPersistentState(uid, initialValue) {
  const key = uid === undefined ? null : accountKey(uid);
  const [snapshot, setSnapshot] = useState(() => ({
    key, value: key ? readAccountData(uid, initialValue) : defaultAccountData(initialValue, null),
  }));
  const [storageError, setStorageError] = useState("");

  // Never render one account's state when Firebase has switched identities.
  const value = snapshot.key === key
    ? snapshot.value
    : key ? readAccountData(uid, initialValue) : defaultAccountData(initialValue, null);

  useEffect(() => {
    if (key !== snapshot.key) {
      setSnapshot({ key, value });
    }
  }, [key, snapshot.key, value]);

  useEffect(() => {
    if (!snapshot.key || snapshot.key !== key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(snapshot.value));
      setStorageError("");
    } catch {
      setStorageError("Local data could not be saved. Check available browser storage.");
    }
  }, [key, snapshot]);

  const update = useCallback((nextValue) => {
    // Firebase Auth changes before React finishes updating its tree.
    // Use the current verified auth user, not a stale login form closure.
    const currentUid = auth.currentUser?.uid || null;
    const currentKey = accountKey(currentUid);
    setSnapshot((previous) => {
      const current = previous.key === currentKey
        ? previous.value : readAccountData(currentUid, initialValue);
      const next = typeof nextValue === "function" ? nextValue(current) : nextValue;
      return { key: currentKey, value: next };
    });
  }, [initialValue]);

  return [value, update, storageError, setStorageError];
}
