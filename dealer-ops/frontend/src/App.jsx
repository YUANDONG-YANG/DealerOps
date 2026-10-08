import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  LogIn,
  LogOut,
  Menu,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import { auth } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5180";

function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const navigate = (nextPage) => {
    setPage(nextPage);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const logout = async () => {
    await signOut(auth);
    navigate("home");
  };

  if (page === "login") {
    return <LoginPage onBack={() => navigate("home")} onLoggedIn={() => navigate("dashboard")} />;
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        user={user}
        onLogout={logout}
        onHome={() => navigate("home")}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="nav-wrap">
        <nav className="navbar container">
          <button className="brand" onClick={() => navigate("home")}>
            <span className="brand-mark"><CarFront size={22} /></span>
            <span>Dealer<span>Ops</span></span>
          </button>

          <div className={`nav-links ${mobileOpen ? "mobile-open" : ""}`}>
            <button onClick={() => navigate("home")}>Home</button>
            <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#vin-decoder" onClick={() => setMobileOpen(false)}>VIN Decoder</a>
            {user ? (
              <>
                <button className="nav-dashboard" onClick={() => navigate("dashboard")}>Dashboard</button>
                <button className="nav-login" onClick={logout}><LogOut size={16}/> Sign out</button>
              </>
            ) : (
              <button className="nav-login" onClick={() => navigate("login")}><LogIn size={16}/> Login</button>
            )}
          </div>

          <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </nav>
      </header>

      <main>
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15}/> Simple dealership operations</div>
            <h1>Run your dealership with <span>less work.</span></h1>
            <p>
              Dealer Ops gives your team one simple place to manage vehicles,
              customers, advertisements, and dealership information.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => navigate(user ? "dashboard" : "login")}>
                {user ? "Open Dashboard" : "Get Started"} <ArrowRight size={18}/>
              </button>
              <a className="secondary-btn" href="#vin-decoder">Try VIN Decoder</a>
            </div>
            <div className="trust-row">
              <span><CheckCircle2 size={16}/> Cloud-ready</span>
              <span><CheckCircle2 size={16}/> C# backend</span>
              <span><CheckCircle2 size={16}/> Secure login</span>
            </div>
          </div>

          <div className="hero-card">
            <div className="dashboard-preview-top">
              <span className="status-dot"></span>
              <span>Dealer Ops dashboard</span>
              <span className="preview-pill">Live preview</span>
            </div>
            <div className="preview-stat-grid">
              <div className="preview-stat"><span>Inventory</span><strong>128</strong><small>Vehicles</small></div>
              <div className="preview-stat"><span>Customers</span><strong>346</strong><small>Records</small></div>
              <div className="preview-stat"><span>Ads checked</span><strong>94%</strong><small>Passed</small></div>
            </div>
            <div className="vehicle-preview">
              <div className="vehicle-image"><CarFront size={76}/></div>
              <div>
                <span className="tiny-label">Recently added</span>
                <h3>Vehicle inventory</h3>
                <p>VIN decoding can pre-fill basic vehicle details.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="container">
            <div className="section-heading">
              <div className="eyebrow">Core features</div>
              <h2>Everything your team needs to get started.</h2>
              <p>Keep the first version focused, useful, and easy to demonstrate.</p>
            </div>
            <div className="feature-grid">
              <FeatureCard icon={<Database/>} title="Vehicle Inventory" text="Manage vehicles and automatically pre-fill basic information from a VIN." />
              <FeatureCard icon={<ClipboardCheck/>} title="Advertisement Checker" text="Prepare a foundation for checking listings against dealership requirements." />
              <FeatureCard icon={<ShieldCheck/>} title="Secure Access" text="Firebase Authentication provides the first layer of secure staff login." />
              <FeatureCard icon={<UserPlus/>} title="Customer Records" text="Keep customer information organized and ready to connect to vehicles." />
            </div>
          </div>
        </section>

        <VinDecoder />

        <section className="section light-section">
          <div className="container cta-card">
            <div>
              <div className="eyebrow">Built for the capstone</div>
              <h2>Start simple. Add depth as requirements become clear.</h2>
              <p>Dealer Ops is structured so your team can add inventory, CRM, compliance, audit, and AI features incrementally.</p>
            </div>
            <button className="primary-btn" onClick={() => navigate(user ? "dashboard" : "login")}>
              {user ? "Go to Dashboard" : "Login"} <ArrowRight size={18}/>
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="brand footer-brand"><span className="brand-mark"><CarFront size={18}/></span><span>Dealer<span>Ops</span></span></div>
          <p>Capstone starter application.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function VinDecoder() {
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState("");

  const decodeVin = async (event) => {
    event.preventDefault();
    setError("");
    setVehicle(null);

    const cleanVin = vin.trim().toUpperCase();

    if (cleanVin.length !== 17) {
      setError("Please enter a 17-character VIN.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/vin/${encodeURIComponent(cleanVin)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "VIN decoding failed.");
      }

      setVehicle(data);
    } catch (err) {
      setError(err.message || "Unable to decode this VIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section vin-section" id="vin-decoder">
      <div className="container">
        <div className="vin-layout">
          <div className="vin-copy">
            <div className="eyebrow"><ScanLine size={15}/> VIN smart entry</div>
            <h2>Scan or enter a VIN and let Dealer Ops do the first part.</h2>
            <p>
              VINs can identify basic vehicle information. This starter uses the
              NHTSA vPIC API to decode the VIN, then displays the returned
              information so staff can complete the remaining dealership fields.
            </p>
            <div className="vin-points">
              <span><CheckCircle2 size={17}/> Make, model and year</span>
              <span><CheckCircle2 size={17}/> Body and engine details when available</span>
              <span><CheckCircle2 size={17}/> Country of assembly when available</span>
            </div>
          </div>

          <div className="vin-tool">
            <form onSubmit={decodeVin}>
              <label htmlFor="vin">Vehicle Identification Number</label>
              <div className="vin-input-row">
                <input
                  id="vin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="Enter 17-character VIN"
                  maxLength={17}
                  autoComplete="off"
                />
                <button className="primary-btn" disabled={loading}>
                  {loading ? "Decoding..." : "Decode VIN"}
                </button>
              </div>
              <small>Starter API: NHTSA vPIC</small>
            </form>

            {error && <div className="error-box">{error}</div>}

            {vehicle && (
              <div className="vin-result">
                <div className="result-header">
                  <div>
                    <span className="tiny-label">Your VIN decode is ready</span>
                    <h3>{vehicle.year || "—"} {vehicle.make || "Vehicle"} {vehicle.model || ""}</h3>
                  </div>
                  <CheckCircle2 size={25}/>
                </div>
                <div className="result-grid">
                  <Result label="Make" value={vehicle.make} />
                  <Result label="Model" value={vehicle.model} />
                  <Result label="Year" value={vehicle.year} />
                  <Result label="Body class" value={vehicle.bodyClass} />
                  <Result label="Engine" value={vehicle.engineModel || vehicle.displacementL} />
                  <Result label="Country" value={vehicle.country} />
                </div>
                <div className="vin-code">{vehicle.vin}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Result({ label, value }) {
  return (
    <div className="result-item">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function LoginPage({ onBack, onLoggedIn }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "signup") {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(credentials.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoggedIn();
    } catch (err) {
      setError(getFirebaseError(err.code));
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLoggedIn();
    } catch (err) {
      setError(getFirebaseError(err.code));
    }
  };

  return (
    <div className="auth-page">
      <button className="auth-back" onClick={onBack}>← Back to Dealer Ops</button>
      <div className="auth-card">
        <div className="auth-logo"><CarFront size={28}/></div>
        <div className="eyebrow">{mode === "login" ? "Welcome back" : "Create an account"}</div>
        <h1>{mode === "login" ? "Sign in to Dealer Ops" : "Join Dealer Ops"}</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Access your dealership workspace." : "Create a starter staff account."}
        </p>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dealership.com" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="primary-btn full-btn" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="divider"><span>or</span></div>

        <button className="google-btn" onClick={googleLogin}>
          Continue with Google
        </button>

        <button className="switch-auth" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
          {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>

        <p className="auth-note">Firebase Authentication powers this starter login.</p>
      </div>
    </div>
  );
}

function getFirebaseError(code = "") {
  const messages = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/popup-closed-by-user": "The sign-in window was closed."
  };
  return messages[code] || "Authentication failed. Check your Firebase configuration and try again.";
}

function Dashboard({ user, onLogout, onHome }) {
  return (
    <div className="dashboard-page">
      <header className="nav-wrap">
        <nav className="navbar container">
          <button className="brand" onClick={onHome}>
            <span className="brand-mark"><CarFront size={22}/></span>
            <span>Dealer<span>Ops</span></span>
          </button>
          <button className="nav-login" onClick={onLogout}><LogOut size={16}/> Sign out</button>
        </nav>
      </header>

      <main className="container dashboard-main">
        <div className="dashboard-welcome">
          <div>
            <div className="eyebrow">Dealership workspace</div>
            <h1>Welcome{user?.displayName ? `, ${user.displayName}` : ""}.</h1>
            <p>This is the starting point for the Dealer Ops management dashboard.</p>
          </div>
          <div className="user-chip">{user?.email || "Signed in"}</div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card"><Database/><span>Inventory</span><strong>Coming next</strong></div>
          <div className="dashboard-card"><UserPlus/><span>Customers</span><strong>Coming next</strong></div>
          <div className="dashboard-card"><ClipboardCheck/><span>Ad Checker</span><strong>Coming next</strong></div>
          <div className="dashboard-card"><ScanLine/><span>VIN Decoder</span><strong>Available on Home</strong></div>
        </div>
      </main>
    </div>
  );
}

export default App;
