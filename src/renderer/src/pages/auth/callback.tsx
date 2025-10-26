import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./callback.scss";

export default function AuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full hash from URL (includes tokens)
        const hash = window.location.hash;

        if (!hash) {
          throw new Error("No authentication data received");
        }

        console.log("Processing auth callback...");

        // Send the hash to main process to handle
        const result = await window.electron.handleSupabaseCallback(hash);

        if (result.success) {
          setStatus("success");
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else {
          throw new Error(result.error || "Authentication failed");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        setStatus("error");

        // Redirect to login after showing error
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="auth-callback-page">
      <div className="auth-callback-container">
        {status === "processing" && (
          <>
            <div className="spinner" />
            <h2>Completing sign-in...</h2>
            <p>Please wait while we finish authenticating your account.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="success-icon">✓</div>
            <h2>Success!</h2>
            <p>You&apos;re now signed in. Redirecting to Remedy...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="error-icon">✗</div>
            <h2>Authentication Failed</h2>
            <p>{error || "Something went wrong. Please try again."}</p>
            <p className="redirect-hint">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
