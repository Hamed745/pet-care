import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CalendarDays, Check, Eye, EyeOff, Heart, LoaderCircle, LockKeyhole, LogOut, Mail, MapPin, PawPrint, Phone, Save, Send, Settings2, ShoppingBag, Shield, UserRound } from "lucide-react";
import { useApp } from "../store.jsx";
import { btn, btn2, card, input } from "../ui.js";
import Media from "../components/Media.jsx";
import PhotoUpload from "../components/PhotoUpload.jsx";
import { Button, Modal } from "../components/ui.jsx";
import { getCurrentAuthUser, loginWithEmail, registerWithEmail, sendPasswordReset, updateAuthDisplayName } from "../services/authService.js";

function displayNameFromEmail(email) {
  const prefix = email.split("@")[0].replace(/\d+$/, "").replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
  return prefix.split(" ").filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`).join(" ") || "Pet parent";
}

function AuthShell({ title, eyebrow, children }) {
  return (
    <div className="mx-auto grid min-h-[560px] max-w-5xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm md:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative isolate hidden min-h-full flex-col justify-between overflow-hidden bg-primary-700 p-9 text-white md:flex">
        <Media src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1000&q=80" alt="A golden dog outdoors" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary-700 via-primary-700/55 to-primary-700/15" />
        <Link to="/" className="relative flex items-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-white/15"><Heart size={19} /></span>
          PetCare
        </Link>

        <div className="relative">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary-100">A little more peace of mind</p>
          <p className="mt-3 max-w-sm text-3xl font-bold leading-tight">Good care feels better when it’s all together.</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">Appointments, records, and everyday essentials for the pets you love.</p>
        </div>

        <span className="relative text-xs text-white/70">Care for every stage, close to home.</span>
      </aside>

      <section className="flex items-center p-5 sm:p-8 md:p-10">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-bold text-ink-500 hover:text-primary-700 md:hidden">
            <ArrowLeft size={15} /> PetCare home
          </Link>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary-700">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{title}</h1>
          {children}
        </div>
      </section>
    </div>
  );
}

function PasswordInput({ id, label, value, onChange, required = true, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <label htmlFor={id} className="block text-[11px] font-bold text-ink-700">
      {label}
      <span className="relative mt-2 block">
        <LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
        <input id={id} required={required} type={visible ? "text" : "password"} className={`${input} pl-10 pr-12`} placeholder={placeholder || label} value={value} onChange={onChange} />
        <button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-500 hover:bg-stone-100">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </span>
    </label>
  );
}

export function Login() {
  const { user, saveUser } = useApp();
  const nav = useNavigate();
  const location = useLocation();
  const [f, setF] = useState({ email: "", password: "", remember: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const loginErrorMessage = (error) => {
    switch (error?.code) {
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many login attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Unable to connect. Please check your internet connection.";
      default:
        return "Unable to sign in. Please try again.";
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setErr("");
    setSaving(true);
    try {
      const credential = await loginWithEmail(f.email, f.password, f.remember);
      const firebaseUser = credential.user;
      const savedProfile = user?.uid === firebaseUser.uid ? user : {};
      await saveUser({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "",
        email: firebaseUser.email || "",
        emailVerified: firebaseUser.emailVerified,
        photoURL: firebaseUser.photoURL || "",
        phone: savedProfile.phone || "",
        city: savedProfile.city || "",
        avatar: savedProfile.avatar || "",
      });
      nav(location.state?.from || "/");
    } catch (error) {
      if (!getCurrentAuthUser()) await saveUser(null);
      setErr(loginErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell title="Welcome back" eyebrow="Your pet's care, together">
      <form className="mt-7 space-y-5" onSubmit={submit}>
        <label htmlFor="login-email" className="block text-[11px] font-bold text-ink-700">
          Email address
          <span className="relative mt-2 block">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input id="login-email" required type="email" className={`${input} pl-10`} placeholder="you@example.com" value={f.email} onChange={(event) => setF({ ...f, email: event.target.value })} />
          </span>
        </label>

        <PasswordInput id="login-password" label="Password" value={f.password} onChange={(event) => setF({ ...f, password: event.target.value })} placeholder="••••••••" />

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 text-ink-600">
            <input type="checkbox" className="accent-primary-600" checked={f.remember} onChange={(event) => setF({ ...f, remember: event.target.checked })} />
            Remember me
          </label>
          <Link className="font-bold text-primary-700 hover:underline" to="/forgot-password">Forgot password?</Link>
        </div>

        {err && <p role="alert" className="text-sm font-semibold text-danger-600">{err}</p>}
        <Button disabled={saving} className="w-full">{saving ? "Signing in..." : "Log in"}</Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">New to PetCare? <Link className="font-bold text-primary-700" to="/register">Create an account</Link></p>
    </AuthShell>
  );
}

export function Register() {
  const { saveUser, showToast } = useApp();
  const nav = useNavigate();
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", city: "", password: "", confirm: "", terms: false });

  const set = (key) => (event) => setF({ ...f, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value });

  const registrationErrorMessage = (error) => {
    switch (error?.code) {
      case "auth/email-already-in-use":
        return "An account already exists with this email address.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/weak-password":
        return "Choose a stronger password with at least 6 characters.";
      case "auth/network-request-failed":
        return "Could not connect to the server. Check your internet connection and try again.";
      default:
        return "We couldn't create your account. Please try again.";
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setErr("");
    if (f.password.length < 6) return setErr("Password must be at least 6 characters.");
    if (f.password !== f.confirm) return setErr("Passwords do not match.");
    if (!f.city.trim()) return setErr("City is required.");
    setSaving(true);
    try {
      const credential = await registerWithEmail(f.email, f.password);
      let displayNameSaved = true;
      try {
        await updateAuthDisplayName(credential.user, f.name.trim());
      } catch {
        displayNameSaved = false;
      }
      await saveUser({
        uid: credential.user.uid,
        email: credential.user.email || f.email,
        name: f.name.trim(),
        phone: f.phone,
        city: f.city.trim(),
      });
      nav("/");
      if (!displayNameSaved) {
        showToast("Your account was created, but your display name could not be saved to Firebase.", "warning");
      }
    } catch (error) {
      setErr(registrationErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell title="Create your account" eyebrow="A better day for every pet">
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-[11px] font-bold text-ink-700">
          Full name
          <input required className={`${input} mt-2`} placeholder="Your name" value={f.name} onChange={set("name")} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[11px] font-bold text-ink-700">
            Email
            <input required type="email" className={`${input} mt-2`} placeholder="you@example.com" value={f.email} onChange={set("email")} />
          </label>
          <label className="block text-[11px] font-bold text-ink-700">
            Phone
            <input required type="tel" className={`${input} mt-2`} placeholder="Phone number" value={f.phone} onChange={set("phone")} />
          </label>
        </div>

        <label className="block text-[11px] font-bold text-ink-700">
          City
          <input required className={`${input} mt-2`} placeholder="Your city" value={f.city} onChange={set("city")} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput id="register-password" label="Password" value={f.password} onChange={set("password")} placeholder="••••••••" />
          <PasswordInput id="register-confirm" label="Confirm password" value={f.confirm} onChange={set("confirm")} placeholder="••••••••" />
        </div>

        <label className="flex items-start gap-2 text-xs leading-5 text-ink-700">
          <input required type="checkbox" className="mt-1 accent-primary-600" checked={f.terms} onChange={set("terms")} />
          I agree to the terms
        </label>

        {err && <p role="alert" className="text-sm font-semibold text-danger-600">{err}</p>}

        <Button disabled={saving} className="w-full">{saving ? "Creating account..." : "Create account"}</Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-500">Already registered? <Link className="font-bold text-primary-700" to="/login">Log in</Link></p>
    </AuthShell>
  );
}

export function Forgot() {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown === 0) return undefined;
    const timeout = window.setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  const submit = async (event) => {
    event.preventDefault();
    if (saving || cooldown > 0) return;
    setSaving(true);
    setError("");
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
      setCooldown(30);
    } catch (requestError) {
      if (requestError?.code === "auth/user-not-found") {
        setSent(true);
        setCooldown(30);
      } else {
        setError("We couldn’t send a reset email right now. Please wait a moment and try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#ECFDF5_0%,#DFF8EE_52%,#C7F3E6_100%)] px-4 py-8 sm:px-6">
      <PawPrint aria-hidden="true" className="pointer-events-none absolute left-5 top-8 size-9 -rotate-12 text-[#0F766E]/[0.07] sm:left-12 sm:top-10 sm:size-12" />
      <PawPrint aria-hidden="true" className="pointer-events-none absolute right-5 top-12 size-8 rotate-12 text-[#0F766E]/[0.07] sm:right-14 sm:top-14 sm:size-11" />
      <PawPrint aria-hidden="true" className="pointer-events-none absolute bottom-8 left-7 size-8 rotate-12 text-[#0F766E]/[0.07] sm:bottom-10 sm:left-16 sm:size-11" />
      <PawPrint aria-hidden="true" className="pointer-events-none absolute bottom-8 right-6 size-9 -rotate-12 text-[#0F766E]/[0.07] sm:right-14 sm:size-12" />

      <div className="relative z-10 w-full max-w-[460px] rounded-[20px] border border-white/80 bg-white/95 p-6 shadow-[0_16px_48px_rgba(15,118,110,0.09)] sm:p-8">
        <Link to="/" aria-label="PetCare home" className="mx-auto flex w-fit items-center gap-2 rounded-full text-[#0F766E]">
          <PawPrint size={18} fill="currentColor" strokeWidth={1.7} />
          <span className="text-base font-bold tracking-tight text-[#0F172A]">PetCare</span>
        </Link>

        {!sent ? (
          <>
            <div className="mt-5 text-center">
              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#0F172A] sm:text-[28px]">Forgot your password?</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-[#64748B]">Enter your email address and we&apos;ll send you a reset link so you can create a new password.</p>
            </div>

            <form className="mt-5 space-y-4" onSubmit={submit}>
              <label htmlFor="reset-email" className="block text-sm font-semibold text-[#0F172A]">
                Email address
                <span className="relative mt-1.5 block">
                  <Mail aria-hidden="true" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <input
                    id="reset-email"
                    required
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "reset-error" : undefined}
                    className="h-[49px] w-full rounded-[11px] border border-[#E2E8F0] bg-white pl-10 pr-4 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] hover:border-[#CBD5E1] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </span>
              </label>
              {error && <p id="reset-error" role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="flex h-[49px] w-full items-center justify-center gap-2 rounded-[11px] bg-[#0F766E] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#115E59] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]/30 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {saving ? <><LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> Sending...</> : <>Send Reset Link <Send aria-hidden="true" size={14} /></>}
              </button>
            </form>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-[#D8F1E7] bg-[#F2FBF5] p-4 text-center sm:p-5">
            <div className="relative mx-auto mb-3 grid size-[58px] place-items-center rounded-full bg-[#C7F3E6]">
              <span className="absolute -right-1 top-0 grid size-6 place-items-center rounded-full border-2 border-[#F2FBF5] bg-[#0F766E] text-white shadow-sm"><Check size={13} strokeWidth={3} /></span>
              <Mail aria-hidden="true" size={27} strokeWidth={1.8} className="text-[#0F766E]" />
              <span aria-hidden="true" className="absolute -bottom-0.5 -left-1 size-2 rounded-full bg-[#F6B84A]" />
              <span aria-hidden="true" className="absolute -right-2 bottom-2 size-1.5 rounded-full bg-[#F6B84A]" />
            </div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-[#0F172A]">Check your email</h1>
            <p role="status" className="mt-2 text-[13px] leading-[18px] text-[#64748B]">If an account exists for this email, we&apos;ve sent a password reset link. Check your inbox and follow the instructions.</p>
            <p className="mt-2 break-all text-xs font-semibold text-[#0F766E]">{email.trim()}</p>
            <button
              type="button"
              disabled={saving || cooldown > 0}
              onClick={submit}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#0F766E]/25 bg-white px-5 text-xs font-bold text-[#0F766E] transition hover:border-[#0F766E] hover:bg-[#F0FDFA] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle aria-hidden="true" size={15} className="animate-spin" />}
              {saving ? "Sending..." : cooldown > 0 ? `Resend Email · ${cooldown}s` : "Resend Email"}
            </button>
          </div>
        )}

        <Link to="/login" className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-[#0F766E] transition hover:text-[#115E59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]">
          <ArrowLeft aria-hidden="true" size={16} /> Back to Sign In
        </Link>
      </div>
    </section>
  );
}

export function Profile() {
  const { user, setUser, saveUser, savePreferences, clearDemoData, showToast } = useApp();
  const location = useLocation();
  const nav = useNavigate();
  const [f, setF] = useState(user || {});
  const [saved, setSaved] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setF(user || {});
  }, [user]);

  if (!user) {
    return (
      <div className={`${card} mx-auto max-w-lg py-14 text-center`}>
        <UserRound size={30} className="mx-auto text-primary-600" />
        <h1 className="mt-4 text-2xl font-extrabold">Your profile is waiting</h1>
        <p className="mt-2 text-sm text-ink-500">Log in to manage your account details.</p>
        <Link className={`${btn} mt-5`} to="/login">Log in</Link>
      </div>
    );
  }

  const updateField = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }));

  const savePassword = (event) => {
    event.preventDefault();
    setPasswordError("");
    if (passwords.current.length < 1) return setPasswordError("Enter your current password.");
    if (passwords.next.length < 6) return setPasswordError("New password must be at least 6 characters.");
    if (passwords.next !== passwords.confirm) return setPasswordError("New passwords do not match.");
    setPasswords({ current: "", next: "", confirm: "" });
    showToast("Password updated for this demo.");
  };

  const isSettings = location.pathname === "/settings";
  const notificationPreferences = {
    vaccinationReminders: true,
    medicationReminders: true,
    bookingReminders: true,
    orderUpdates: true,
    adoptionUpdates: true,
    lostFoundUpdates: true,
    ...(f.preferences || {}),
  };

  const updatePreference = async (key, value) => {
    setF((current) => ({ ...current, preferences: { ...(current.preferences || notificationPreferences), [key]: value } }));
    await savePreferences({ [key]: value });
  };
  const updateAccountSetting = async (key, value) => {
    setF((current) => ({ ...current, [key]: value }));
    await saveUser({ ...user, [key]: value });
  };

  const accountNav = [
    { key: "profile", label: "Profile", href: "/profile", icon: UserRound },
    { key: "pets", label: "My Pets", href: "/pets", icon: Heart },
    { key: "bookings", label: "My Bookings", href: "/bookings", icon: CalendarDays },
    { key: "orders", label: "My Orders", href: "/orders", icon: ShoppingBag },
    { key: "wishlist", label: "My Wishlist", href: "/wishlist", icon: Heart },
    { key: "calendar", label: "Calendar", href: "/calendar", icon: CalendarDays },
    { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
    { key: "settings", label: "Settings", href: "/settings", icon: Settings2 },
  ];

  const preferencePanels = (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <section aria-labelledby="notification-preferences-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><Bell size={18} /></span><div><h2 id="notification-preferences-title" className="font-extrabold">Notification Preferences</h2><p className="mt-0.5 text-xs text-ink-500">Choose the reminders and updates you receive.</p></div></div>
        <div className="mt-4 divide-y divide-stone-100">
          {Object.entries({ vaccinationReminders: "Vaccination reminders", medicationReminders: "Medication reminders", bookingReminders: "Booking reminders", orderUpdates: "Order updates", adoptionUpdates: "Adoption updates", lostFoundUpdates: "Lost & Found updates" }).map(([key, label]) => (
            <label key={key} className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2 text-sm text-ink-700">
              <span>{label}</span>
              <span className="relative inline-flex shrink-0">
                <input type="checkbox" role="switch" aria-label={label} checked={Boolean(notificationPreferences[key])} onChange={(event) => updatePreference(key, event.target.checked)} className="peer sr-only" />
                <span aria-hidden="true" className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-primary-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-600" />
                <span aria-hidden="true" className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          ))}
        </div>
      </section>
      <div className="space-y-4">
        <section aria-labelledby="privacy-settings-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><Shield size={18} /></span><div><h2 id="privacy-settings-title" className="font-extrabold">Privacy Settings</h2><p className="mt-0.5 text-xs text-ink-500">Control what appears on community reports.</p></div></div>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 text-sm text-ink-700">
            <span><span className="block font-semibold">Show my profile name</span><span className="mt-0.5 block text-xs text-ink-500">Allow your name to appear on community posts and reports.</span></span>
            <span className="relative inline-flex shrink-0">
              <input type="checkbox" role="switch" aria-label="Show my profile name on community posts" checked={f.profileVisible !== false} onChange={(event) => updateAccountSetting("profileVisible", event.target.checked)} className="peer sr-only" />
              <span aria-hidden="true" className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-primary-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-600" />
              <span aria-hidden="true" className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
        </section>
        <section aria-labelledby="language-settings-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><Settings2 size={18} /></span><div><h2 id="language-settings-title" className="font-extrabold">Language</h2><p className="mt-0.5 text-xs text-ink-500">Choose your preferred display language.</p></div></div>
          <label className="mt-4 block text-xs font-bold text-ink-700">Preferred language
            <select aria-label="Language" className={`${input} mt-2 min-h-10`} value={f.language || "English"} onChange={(event) => updateAccountSetting("language", event.target.value)}>
              <option>English</option>
              <option>العربية</option>
            </select>
          </label>
        </section>
      </div>
    </div>
  );

  const content = !isSettings ? (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-stone-200 bg-primary-100 text-3xl font-semibold text-primary-800">
              {f.avatar ? <img src={f.avatar} alt="Profile" className="size-full object-cover" /> : (f.name || user.name || "U").trim().slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary-700">Pet parent</p>
              <h2 className="mt-1 text-2xl font-extrabold">{f.name || user.name || "Pet parent"}</h2>
              <p className="mt-1 text-sm text-ink-500">{f.email || user.email}</p>
              {(f.phone || user.phone || f.city || user.city) && <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">{(f.phone || user.phone) && <span className="inline-flex items-center gap-1.5"><Phone size={13} />{f.phone || user.phone}</span>}{(f.city || user.city) && <span className="inline-flex items-center gap-1.5"><MapPin size={13} />{f.city || user.city}</span>}</p>}
            </div>
          </div>
          <button type="button" className={btn2} onClick={() => setEditing((current) => !current)}>
            {editing ? "Close editor" : "Edit profile"}
          </button>
        </div>
      </div>

      {editing ? (
        <form className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" onSubmit={async (event) => {
          event.preventDefault();
          await saveUser({ ...user, ...f });
          setSaved(true);
          setEditing(false);
          showToast("Profile saved.");
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[11px] font-bold text-ink-700">
              Full name
              <input required className={`${input} mt-2`} value={f.name || ""} onChange={updateField("name")} />
            </label>
            <label className="block text-[11px] font-bold text-ink-700">
              Email
              <input required type="email" className={`${input} mt-2`} value={f.email || ""} onChange={updateField("email")} />
            </label>
            <label className="block text-[11px] font-bold text-ink-700">
              Phone
              <input required type="tel" className={`${input} mt-2`} value={f.phone || ""} onChange={updateField("phone")} />
            </label>
            <label className="block text-[11px] font-bold text-ink-700">
              City
              <input required className={`${input} mt-2`} value={f.city || ""} onChange={updateField("city")} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit"><Save size={16} /> Save changes</Button>
            <button type="button" className={btn2} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Contact</p>
            <dl className="mt-4 space-y-3 text-sm text-ink-700">
              <div className="flex items-center gap-3"><Mail size={16} className="text-primary-700" /><dd>{f.email || user.email}</dd></div>
              <div className="flex items-center gap-3"><Phone size={16} className="text-primary-700" /><dd>{f.phone || user.phone || "Not added"}</dd></div>
              <div className="flex items-center gap-3"><MapPin size={16} className="text-primary-700" /><dd>{f.city || user.city || "Not added"}</dd></div>
            </dl>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Account image</p>
            <div className="mt-4">
              <PhotoUpload value={f.avatar || ""} showPreview={false} square label="Profile photo" onChange={(avatar) => updateAccountSetting("avatar", avatar)} />
            </div>
          </div>
        </div>
      )}

      {saved && <p className="text-sm font-semibold text-primary-700">Changes saved</p>}
      {preferencePanels}
    </div>
  ) : (
    <div className="space-y-5">
      {preferencePanels}

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">Security</h2>
        <p className="mt-1 text-sm text-ink-500">Demo only. Passwords are not stored.</p>

        <form className="mt-4 space-y-3" onSubmit={savePassword}>
          {[["current", "Current password"], ["next", "New password"], ["confirm", "Confirm new password"]].map(([key, label]) => (
            <label key={key} className="block text-[11px] font-bold text-ink-700">
              {label}
              <input aria-label={label} type="password" className={`${input} mt-2`} value={passwords[key]} onChange={(event) => setPasswords((current) => ({ ...current, [key]: event.target.value }))} />
            </label>
          ))}

          {passwordError && <p role="alert" className="text-xs font-semibold text-danger-600">{passwordError}</p>}

          <Button type="submit" variant="secondary" className="w-full"><LockKeyhole size={16} /> Update password</Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl py-6">
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <aside aria-label="Account sidebar" className="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:min-h-[520px]">
          <div className="mb-3 hidden px-3 pt-2 lg:block"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400">Account</p><h2 className="mt-1 font-extrabold text-ink-900">Your account</h2></div>
          <nav aria-label="Account navigation" className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {accountNav.map(({ key, label, href, icon: Icon }) => {
              const active = location.pathname === href;
              return (
                <Link key={key} to={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:w-full ${active ? "bg-primary-50 text-primary-800" : "text-ink-600 hover:bg-stone-50"}`}>
                  <Icon size={16} className="shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <button type="button" className="mt-3 flex min-h-10 shrink-0 items-center gap-3 rounded-xl border-t border-stone-100 px-3 py-2.5 text-left text-sm font-semibold text-danger-600 transition hover:bg-red-50 lg:mt-auto" onClick={() => { setUser(null); nav("/"); }}><LogOut size={16} />Log out</button>
        </aside>

        <main className="min-w-0">
          <header className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-700">{isSettings ? "Account preferences" : "Account"}</p><h1 className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">{isSettings ? "Settings" : "Profile Information"}</h1></header>
          {content}
          {isSettings && <section className="mt-5 rounded-2xl border border-red-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-extrabold text-ink-900">Demo data</h2><p className="mt-1 text-sm text-ink-500">Reset demo account, pets, bookings, and cart on this browser.</p></div><button type="button" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-danger-600 transition hover:bg-red-100" onClick={() => setClearOpen(true)}>Clear demo data</button></div></section>}
        </main>
      </div>

      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title="Clear demo data?">
        <p className="text-sm leading-6 text-ink-500">This removes the demo user, pets, bookings, and cart from this browser.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setClearOpen(false)}>Keep data</Button>
          <Button type="button" variant="danger" onClick={async () => { await clearDemoData(); setClearOpen(false); showToast("Demo data cleared."); nav("/"); }}>Clear demo data</Button>
        </div>
      </Modal>
    </div>
  );
}
