import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import Navigation from './components/Navigation';
import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop';
import Footer from './components/Footer';

// Route-based code splitting
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Membership = lazy(() => import('./pages/Membership'));
const Leadership = lazy(() => import('./pages/Leadership'));
const EventPayment = lazy(() => import('./pages/EventPayment'));
const MembershipPayment = lazy(() => import('./pages/MembershipPayment'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Sponsors = lazy(() => import('./pages/Sponsors'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));

function App() {
  return (
    <SettingsProvider>
      <Router future={{ v7_startTransition: true }}>
        <ScrollToTop />
        <div className="App">
          <Suspense fallback={<div className="route-loading">Loading...</div>}>
            <BackToTop />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/*" element={
                <>
                  <Navigation />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/membership" element={<Membership />} />
                    <Route path="/leadership" element={<Leadership />} />
                    <Route path="/event-payment/:id" element={<EventPayment />} />
                    <Route path="/membership-payment/:id" element={<MembershipPayment />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/sponsors" element={<Sponsors />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/payment/:type/:id" element={<PaymentPage />} />
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    <Route path="/payment/cancel" element={<PaymentCancel />} />
                  </Routes>
                  <Footer />
                </>
              } />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </SettingsProvider>
  );
}

export default App;
