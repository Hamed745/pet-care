import { lazy, Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { Skeleton } from "./components/ui.jsx";

const Home = lazy(() => import("./pages/Home.jsx"));
const ServicesHome = lazy(() => import("./pages/Services.jsx").then((module) => ({ default: module.ServicesHome })));
const ServiceList = lazy(() => import("./pages/Services.jsx").then((module) => ({ default: module.ServiceList })));
const ServiceDetails = lazy(() => import("./pages/Services.jsx").then((module) => ({ default: module.ServiceDetails })));
const Store = lazy(() => import("./pages/Store.jsx").then((module) => ({ default: module.Store })));
const Cart = lazy(() => import("./pages/Store.jsx").then((module) => ({ default: module.Cart })));
const MyPets = lazy(() => import("./pages/Pets.jsx").then((module) => ({ default: module.MyPets })));
const AddPet = lazy(() => import("./pages/Pets.jsx").then((module) => ({ default: module.AddPet })));
const PetProfile = lazy(() => import("./pages/Pets.jsx").then((module) => ({ default: module.PetProfile })));
const Bookings = lazy(() => import("./pages/Bookings.jsx"));
const Adoption = lazy(() => import("./pages/Community.jsx").then((module) => ({ default: module.Adoption })));
const LostFound = lazy(() => import("./pages/Community.jsx").then((module) => ({ default: module.LostFound })));
const Emergency = lazy(() => import("./pages/Extras.jsx").then((module) => ({ default: module.Emergency })));
const AI = lazy(() => import("./pages/Extras.jsx").then((module) => ({ default: module.AI })));
const Login = lazy(() => import("./pages/Auth.jsx").then((module) => ({ default: module.Login })));
const Register = lazy(() => import("./pages/Auth.jsx").then((module) => ({ default: module.Register })));
const Forgot = lazy(() => import("./pages/Auth.jsx").then((module) => ({ default: module.Forgot })));
const Profile = lazy(() => import("./pages/Auth.jsx").then((module) => ({ default: module.Profile })));

function LoadingPage() {
  return <div role="status" aria-label="Loading page" aria-busy="true" className="space-y-6 py-8"><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-64 max-w-full" /><Skeleton className="h-5 w-96 max-w-full" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-56" /><Skeleton className="h-56" /><Skeleton className="hidden h-56 lg:block" /></div></div>;
}

export default function App() {
  return (
    <Layout>
        <Suspense fallback={<LoadingPage />}><Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<ServicesHome />} />
          <Route path="/services/:type" element={<ServiceList />} />
          <Route path="/services/:type/:id" element={<ServiceDetails />} />
          <Route path="/store" element={<Store />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/pets" element={<MyPets />} />
          <Route path="/pets/new" element={<AddPet />} />
          <Route path="/pets/:id" element={<PetProfile />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/adoption" element={<Adoption />} />
          <Route path="/lost-found" element={<LostFound />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<Forgot />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<div className="py-20 text-center"><h1 className="text-3xl font-extrabold">Page not found</h1><p className="mt-3 text-ink-500">We couldn’t find that page.</p><Link to="/" className="mt-6 inline-flex rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white">Back home</Link></div>} />
        </Routes></Suspense>
    </Layout>
  );
}
