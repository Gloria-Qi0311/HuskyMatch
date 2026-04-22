import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Users, Sparkles, ShieldCheck, Clock,
  Link as LinkIcon, Star, ArrowRight
} from "lucide-react";

import { API_BASE } from "./lib/api";

// Single-file, production-ready landing page for "HuskyConnect - Smart Matching Platform for UW Students"
// Tech: React + TailwindCSS + lucide-react icons (no extra UI kit required)
// Drop into any React app. In Next.js, place as app/page.tsx (rename to TSX) or in src/pages/HuskyConnect.jsx and render it.
// Colors roughly follow UW brand (purple + gold). Adjust in Tailwind config if desired.

export default function HuskyConnectLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <Header />
      <main>
        <Hero />
        <LogosStrip />
        <Features />
        <RecommendationsPreview />
        <HowItWorks />
        <Testimonials />
        <SignUpSection />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function RecommendationsPreview() {
  const storedId = localStorage.getItem("user_id");
  const [userId, setUserId] = useState(storedId ? Number(storedId) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (storedId) fetchRecs(Number(storedId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TEST
async function fetchRecs(id) {
  setLoading(true);
  setError("");
  try {
    const base = API_BASE.replace(/\/$/, ""); // trim trailing slash
    const res = await fetch(`${base}/recommendations/${id}?limit=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setResults(data.results || []);
  } catch (e) {
    setError(e.message || "Failed to load recommendations");
  } finally {
    setLoading(false);
  }
}


  // async function fetchRecs(id) {
  //   setLoading(true);
  //   setError("");
  //   try {
  //     const res = await fetch(`http://localhost:8000/recommendations/${id}?limit=5`);
  //     if (!res.ok) {
  //       const msg = await res.text();
  //       throw new Error(msg || `HTTP ${res.status}`);
  //     }
  //     const data = await res.json();
  //     setResults(data.results || []);
  //   } catch (e) {
  //     setError(e.message || "Failed to load recommendations");
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold tracking-tight">Recommended connections</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={userId}
              onChange={(e) => setUserId(Number(e.target.value))}
              className="w-24 rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="User ID"
            />
            <button
              onClick={() => fetchRecs(userId)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-700 to-purple-600 px-4 py-2 rounded-xl shadow-sm hover:brightness-110"
            >
              Refresh
            </button>
          </div>
        </div>
        <p className="text-slate-600 mb-6">
          Based on shared interests and location overlap from your profile.
        </p>
        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
          {loading && <div className="text-sm text-slate-600">Loading...</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && results.length === 0 && (
            <div className="text-sm text-slate-600">No recommendations found.</div>
          )}
          <ul className="divide-y divide-slate-200">
            {results.map((r) => (
              <li key={r.user_id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.city || "Unknown city"}{r.country ? ` • ${r.country}` : ""}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {r.match || "You might make a great connection through HuskyConnect."}
                  </div>
                  <div className="flex gap-3 mt-2 text-xs font-semibold">
                    <Link to={`/students/${r.user_id}`} className="text-purple-700 hover:underline">
                      View profile
                    </Link>
                    <Link to={`/messages/${r.user_id}`} className="text-slate-700 hover:underline">
                      Message
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-slate-200/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group">
          <div className="size-8 rounded-xl bg-gradient-to-br from-purple-700 to-purple-500 grid place-items-center text-white shadow-md">
            <Sparkles className="size-5" />
          </div>
          <div className="font-semibold tracking-tight text-slate-900">
            Husky<span className="text-purple-700">Connect</span>
          </div>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#features" className="hover:text-purple-700">Features</a>
          <a href="#how" className="hover:text-purple-700">How it works</a>
          <a href="#faq" className="hover:text-purple-700">FAQ</a>
          <a href="/signin" className="hover:text-purple-700">Sign in</a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="https://readdy.link/preview/e04e7b28-5016-46fb-a946-9cddb7f60050/3926740"
            className="hidden sm:inline-block text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-100"
          >
            View demo
          </a>
          <a
            href="#signup"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-700 to-purple-600 px-4 py-2 rounded-xl shadow-sm hover:brightness-110"
          >
            Get started <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute -inset-x-20 -top-40 h-72 bg-gradient-to-b from-purple-100 to-transparent blur-2xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-medium bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full mb-4">
            <Sparkles className="size-3" /> Smart matching for UW students
          </p>
          <h1 className="text-4xl/tight sm:text-5xl/tight font-extrabold tracking-tight">
            Find the <span className="text-purple-700">right peers</span>, mentors, and teams—
            faster.
          </h1>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            HuskyConnect pairs students by goals, courses, and interests. Join study groups, project
            teams, and mentoring circles in minutes—not weeks.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#signup" className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-3 rounded-2xl font-semibold shadow hover:brightness-110">
              Try it free <ArrowRight className="size-4" />
            </a>
            <a href="#how" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold border border-slate-300 hover:bg-slate-50">
              How it works
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-500">No credit card. UW email required.</p>
        </div>
        <HeroCard />
      </div>
    </section>
  );
}

function HeroCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-purple-300 to-amber-200 opacity-60 blur-2xl" aria-hidden />
      <div className="relative rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-purple-100 text-purple-700 grid place-items-center">
            <Users className="size-5" />
          </div>
          <div>
            <div className="font-semibold">Live cohort: INFO 201</div>
            <div className="text-sm text-slate-500">128 students matching now</div>
          </div>
        </div>
        <ul className="mt-6 space-y-3">
          {[
            { name: "Project partners", detail: "JS / Python, evenings, Capstone-ready" },
            { name: "Study groups", detail: "2x weekly, Zoom + Suzzallo Library" },
            { name: "Mentor chats", detail: "Alum-led sessions, resume reviews" },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 size-5 rounded-full bg-green-100 text-green-700 grid place-items-center text-xs">✓</span>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-slate-500">{item.detail}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 p-3">
          <div>
            <div className="text-sm font-medium">Match quality</div>
            <div className="text-xs text-slate-500">Based on goals, skills, availability</div>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogosStrip() {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 text-center mb-4">Integrates with</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 opacity-70">
          {['Canvas', 'Google', 'Slack', 'Zoom', 'GitHub', 'Handshake'].map((name) => (
            <div key={name} className="h-12 rounded-xl border border-slate-200 grid place-items-center text-sm font-medium">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const list = [
    {
      icon: <Sparkles className="size-5" />, title: "Smart matching",
      desc: "Pair by goals, courses, skills, time and location preferences using a transparent scoring model."
    },
    {
      icon: <ShieldCheck className="size-5" />, title: "Privacy first",
      desc: "Students control what is shared. Requests require mutual consent; no spam or mass DMs."
    },
    {
      icon: <Clock className="size-5" />, title: "Quick onboarding",
      desc: "Two-minute quiz builds a profile; import from Canvas or LinkedIn to skip typing."
    },
    {
      icon: <LinkIcon className="size-5" />, title: "UW tools integration",
      desc: "Canvas rosters, Zoom scheduling, and Slack channels are created automatically."
    },
  ];
  return (
    <section id="features" className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">Everything you need to connect</h2>
        <p className="mt-3 text-center text-slate-600 max-w-2xl mx-auto">
          From project teaming to mentoring, HuskyConnect removes the friction so you can focus on learning.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {list.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-white hover:shadow-sm transition">
              <div className="size-9 rounded-xl bg-purple-100 text-purple-700 grid place-items-center mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Create your profile",
      body: "Tell us your goals, classes, skills, and schedule. Import from Canvas to prefill.",
    },
    { title: "Get matched", body: "See top matches with compatibility reasons you can trust." },
    { title: "Connect & schedule", body: "Open a Slack chat or auto-create a Zoom session at a shared time." },
  ];
  return (
    <section id="how" className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-purple-700 to-purple-600 text-white p-8 sm:p-12 shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold">How it works</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-5">
                <div className="size-8 rounded-lg bg-white/20 grid place-items-center font-semibold mb-3">{i + 1}</div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm/6 text-purple-50 mt-1">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            {
              quote: "I found a capstone partner in two days. The reasons for each match were spot on.",
              name: "Tina • INFO 490"
            },
            {
              quote: "Our study group boosted my grade from 3.2 to 3.7. Scheduling was painless.",
              name: "Luis • CSE 142"
            },
            {
              quote: "As a transfer student, this made it easy to meet peers with similar goals.",
              name: "Maya • iSchool"
            },
          ].map((t, i) => (
            <figure key={i} className="rounded-2xl border border-slate-200 p-6 bg-slate-50">
              <blockquote className="text-slate-700">“{t.quote}”</blockquote>
              <figcaption className="mt-3 text-sm text-slate-500">{t.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignUpSection() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasMinLength = password.length >= 8;
  const hasMaxLength = password.length <= 72;
  const hasNumber = /\d/.test(password);
  const noSpaces = !password.includes(" ");
  const isPasswordValid = hasMinLength && hasMaxLength && hasNumber && noSpaces;
  const passwordRules = [
    { label: "At least 8 characters", satisfied: hasMinLength },
    { label: "Must include a number", satisfied: hasNumber },
    { label: "No spaces", satisfied: noSpaces },
    { label: "Max 72 characters", satisfied: hasMaxLength },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName.trim() || !lastName.trim() || !gender || !dob || !password) {
      setError("Please fill in first name, last name, gender, date of birth, and password.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please ensure your password meets all requirements.");
      return;
    }

    setLoading(true);
    try {
      const base = API_BASE.replace(/\/$/, "");
      const payload = {
        name: `${firstName.trim()} ${lastName.trim()}`,
        gender,
        dob,
        password,
        major: major || "",
        year: year || "",
        school_name: schoolName || "",
      };

      const res = await fetch(`${base}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let message = `HTTP ${res.status}`;
        if (errorText) {
          try {
            const parsed = JSON.parse(errorText);
            if (parsed?.detail) {
              message = parsed.detail;
            } else if (typeof parsed === "string") {
              message = parsed;
            }
          } catch {
            message = errorText;
          }
        }
        throw new Error(message);
      }

      const data = await res.json();
      localStorage.setItem("huskyconnect_user_id", String(data.user_id));
      localStorage.setItem("huskyconnect_name", payload.name);
      setSuccess(`Account created! Your user ID is ${data.user_id}.`);
      setPassword("");
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white";

  const genderOptions = [
    { value: "", label: "Select" },
    { value: "Female", label: "Female" },
    { value: "Male", label: "Male" },
    { value: "Non-binary", label: "Non-binary" },
    { value: "Transgender", label: "Transgender" },
    { value: "Genderqueer / Gender non-conforming", label: "Genderqueer / Gender non-conforming" },
    { value: "Other", label: "Other" },
    { value: "Prefer not to say", label: "Prefer not to say" },
  ];

  const majorOptions = [
    { value: "", label: "Select" },
    "Pre-major / Undeclared",
    "Informatics",
    "Computer Science",
    "Computer Engineering",
    "Applied Math",
    "ACMS",
    "Data Science",
    "Electrical & Computer Engineering",
    "Human Centered Design & Engineering",
    "Information Systems",
    "Business (Finance)",
    "Business (Marketing)",
    "Economics",
    "Statistics",
    "Mathematics",
    "Physics",
    "Biology",
    "Psychology",
    "Neuroscience",
    "Design",
    "Education",
    "Social Work",
    "Other STEM",
    "Other non-STEM",
    "Other",
  ];

  const yearOptions = [
    { value: "", label: "Select" },
    "Freshman",
    "Sophomore",
    "Junior",
    "Senior",
    "Fifth year",
    "Graduate",
    "Post-bacc",
    "Exchange / Visiting",
    "Other",
  ];

  const schoolOptions = [
    { value: "", label: "Select" },
    "UW Seattle",
    "UW Bothell",
    "UW Tacoma",
    "Seattle Central College",
    "North Seattle College",
    "South Seattle College",
    "Green River College",
    "Bellevue College",
    "Tacoma Community College",
    "Other WA community college",
    "Other US university/college",
    "International university/college",
    "Other",
  ];

  const renderOptions = (options) =>
    options.map((option) =>
      typeof option === "string" ? (
        <option key={option} value={option}>
          {option}
        </option>
      ) : (
        <option key={option.value} value={option.value} disabled={option.value === ""}>
          {option.label}
        </option>
      )
    );

  return (
    <section id="signup" className="py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 sm:p-10">
          <div className="sm:flex sm:items-center sm:justify-between mb-6">
            <div>
              <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Beta access</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Create your HuskyConnect account</h2>
              <p className="mt-2 text-sm text-slate-600">Takes under a minute. You can add more details later.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-slate-700 mb-1">
                Gender
              </label>
              <select
                id="gender"
                className={inputClass}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
              >
                {renderOptions(genderOptions)}
              </select>
            </div>
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-slate-700 mb-1">
                Date of birth
              </label>
              <input
                id="dob"
                type="date"
                className={inputClass}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="major" className="block text-sm font-medium text-slate-700 mb-1">
                Major (optional)
              </label>
              <select
                id="major"
                className={inputClass}
                value={major}
                onChange={(e) => setMajor(e.target.value)}
              >
                {renderOptions(majorOptions)}
              </select>
            </div>
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1">
                Year (optional)
              </label>
              <select
                id="year"
                className={inputClass}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {renderOptions(yearOptions)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="schoolName" className="block text-sm font-medium text-slate-700 mb-1">
                School name (optional)
              </label>
              <select
                id="schoolName"
                className={inputClass}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              >
                {renderOptions(schoolOptions)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === " ") {
                    e.preventDefault();
                  }
                }}
                maxLength={72}
                required
              />
              <ul className="mt-2 space-y-1 text-sm">
                {passwordRules.map((rule) => (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-2 ${rule.satisfied ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${rule.satisfied ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="sm:col-span-2 bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="sm:col-span-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm p-3 rounded-xl">
                {success}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="inline-flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="get-started" className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to connect?</h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Join the beta with your UW email and start matching with classmates, mentors, and teammates today.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-700 text-white font-semibold hover:brightness-110"
              href="https://readdy.link/preview/e04e7b28-5016-46fb-a946-9cddb7f60050/3926740"
            >
              Open live demo <ArrowRight className="size-4" />
            </a>
            <a
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-300 font-semibold hover:bg-slate-50"
              href="#"
            >
              Request access
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-purple-700 to-purple-500 grid place-items-center text-white">
            <Sparkles className="size-4" />
          </div>
          <span className="font-semibold">Husky<span className="text-purple-700">Connect</span></span>
        </div>
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} HuskyConnect. Built for UW students.</p>
      </div>
    </footer>
  );
}
