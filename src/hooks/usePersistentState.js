import { useCallback, useEffect, useState } from "react";

export default function usePersistentState(key, initialValue) {
  const [storageError, setStorageError] = useState("");
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return typeof initialValue === "function" ? initialValue() : initialValue;
      return JSON.parse(stored);
    } catch {
      try { window.localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
      return typeof initialValue === "function" ? initialValue() : initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setStorageError("");
    } catch {
      setStorageError("Could not save the photo, try a smaller image");
    }
  }, [key, value]);

  const update = useCallback((nextValue) => {
    setValue(nextValue);
  }, [key]);

  return [value, update, storageError, setStorageError];
}