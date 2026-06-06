import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [mode, setMode] = useState("user"); // 'user' or 'admin'
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirect =
    new URLSearchParams(location.search).get("redirect") || "/dashboard";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const credentials =
      mode === "user"
        ? { name: form.name }
        : { email: form.email, password: form.password };

    const response = await login(credentials);
    if (response.error) {
      setError(response.error);
      setSubmitting(false);
      return;
    }

    navigate(redirect, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          UrbanIQ Access
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Sign In</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          For demo use, sign in as a simple user by entering your{" "}
          <span className="font-semibold">Name</span>. Admin access is available
          via the{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "user" ? "admin" : "user")}
            className="ml-1 inline underline"
          >
            Admin Login
          </button>{" "}
          option.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "user" ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-600">Name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                placeholder="Your name"
              />
            </label>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Admin credentials:{" "}
                <span className="font-semibold">team19@urbaniq.com</span> /{" "}
                <span className="font-semibold">team19</span> or{" "}
                <span className="font-semibold">admin@urbaniq.com</span> /{" "}
                <span className="font-semibold">team19</span>
              </p>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-600">Email</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  placeholder="admin@urbaniq.com"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Password
                </span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  placeholder="Password"
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? "Signing in..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
