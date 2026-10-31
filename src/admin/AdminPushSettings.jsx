import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, CheckCircle2, LoaderCircle, Volume2 } from "lucide-react";
import { adminApi } from "./adminApi.js";
import { isAdminPushSupported, registerAdminPush, sendAdminPushTest, unregisterAdminPush } from "./adminPush.js";

export default function AdminPushSettings() {
  const [supported, setSupported] = useState(null);
  const [permission, setPermission] = useState(() => "Notification" in window ? Notification.permission : "unsupported");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handlePush = () => setMessage("A new PetCare notification has arrived.");
    window.addEventListener("petcare:push-notification", handlePush);
    return () => window.removeEventListener("petcare:push-notification", handlePush);
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      await registerAdminPush();
      setEnabled(true);
      setPermission(Notification.permission);
      setMessage("Push notifications are enabled on this device.");
    } catch (error) {
      setMessage(error?.message || "Could not enable push notifications.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      await unregisterAdminPush();
      setEnabled(false);
      setMessage("Push notifications were disabled on this device.");
    } catch (error) {
      setMessage(error?.message || "Could not disable push notifications.");
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      await sendAdminPushTest();
      setMessage("Test notification sent. Check your browser or system notifications.");
    } catch (error) {
      setMessage(error?.message || "Test notification could not be sent.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    isAdminPushSupported().then((value) => {
      if (!active) return;
      setSupported(value);
      if (value && Notification.permission === "granted") {
        registerAdminPush().then(() => {
          if (active) setEnabled(true);
        }).catch(() => {});
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="pa-card mb-5" aria-labelledby="pa-push-title">
      <div className="pa-card-heading">
        <h2 id="pa-push-title"><BellRing size={19}/> Browser push notifications</h2>
        <span className={enabled ? "pa-pill pa-active" : "pa-pill pa-pending"}>{enabled ? "Enabled" : "Not enabled"}</span>
      </div>
      <p className="pa-card-caption">Receive new-order alerts even when the PetCare admin dashboard is not open. Your browser and operating system control the notification sound.</p>
      {supported === false && <div className="pa-info-banner">Push is unavailable. Check browser support, HTTPS, and the Firebase VAPID key configuration.</div>}
      {permission === "denied" && <div className="pa-info-banner">Notifications are blocked in browser settings. Allow notifications for this site, then reload this page.</div>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!enabled ? (
          <button type="button" className="pa-primary-button" disabled={busy || supported === false} onClick={enable}>
            {busy ? <LoaderCircle size={16} className="animate-spin"/> : <BellRing size={16}/>} Enable notifications
          </button>
        ) : (
          <>
            <button type="button" className="pa-outline-button" disabled={busy} onClick={test}>
              {busy ? <LoaderCircle size={16} className="animate-spin"/> : <Volume2 size={16}/>} Test notification
            </button>
            <button type="button" className="pa-outline-button" disabled={busy} onClick={disable}>
              <BellOff size={16}/> Disable on this device
            </button>
          </>
        )}
      </div>
      {message && <p className="mt-3 text-sm text-ink-600" role="status"><CheckCircle2 size={15} className="mr-1 inline"/>{message}</p>}
      <p className="mt-2 text-xs text-ink-500">Permission: {permission}. Enable this separately on each browser or device.</p>
    </section>
  );
}
