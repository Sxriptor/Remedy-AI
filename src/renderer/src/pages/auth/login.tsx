import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./login.scss";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const session = await window.electron.getSupabaseSession();
        if (session?.user) {
          console.log("Already authenticated, redirecting...");
          navigate("/");
          return;
        }
      } catch (err) {
        console.error("Error checking auth:", err);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();

    // Listen for auth success from main process
    const unsubscribe = window.electron.onSupabaseAuthSuccess(() => {
      console.log("Auth success received!");
      setLoading(false);
      setError(null);
      navigate("/");
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electron.signInWithGitHub();
      
      if (!result.success) {
        setError(result.error || "Failed to sign in");
        setLoading(false);
      }
      // Loading will be cleared by auth success callback
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message || "Failed to initiate sign-in");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-spinner">
            <div className="spinner" />
            <p>Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="../../../resources/icon.png" alt="Remedy" className="login-logo" />
          <h1>Welcome to Remedy</h1>
          <p>Manage your productivity apps and development tools</p>
        </div>

        {error && (
          <div className="login-error">
            <p>{error}</p>
          </div>
        )}

        <div className="login-content">
          <button
            className="github-signin-button"
            onClick={handleGitHubSignIn}
            disabled={loading}
          >
            <svg className="github-icon" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                clipRule="evenodd"
              />
            </svg>
            {loading ? "Opening browser..." : "Sign in with GitHub"}
          </button>

          <p className="login-hint">
            This will open your browser to complete sign-in with GitHub.
          </p>
        </div>
      </div>
    </div>
  );
}


