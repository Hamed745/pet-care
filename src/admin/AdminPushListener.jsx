import { useEffect } from "react";
import { listenForAdminPush } from "./adminPush.js";

export default function AdminPushListener() {
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    listenForAdminPush(() => {
      if (active) window.dispatchEvent(new CustomEvent("petcare:push-notification"));
    }).then((stop) => {
      unsubscribe = stop;
    }).catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return null;
}
