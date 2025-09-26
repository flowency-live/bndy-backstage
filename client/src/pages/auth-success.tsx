import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SessionData {
  user?: any;
  bands?: any[];
  session?: any;
  error?: string;
}

export default function AuthSuccess() {
  const [cookies, setCookies] = useState<string>("");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie);

    // Call /api/me to verify auth
    fetch('/api/me', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setSessionData(data);
        } else {
          setSessionData({ error: `${res.status}: ${res.statusText}` });
        }
      })
      .catch((err) => {
        setSessionData({ error: err.message });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">🎉 Authentication Success</h1>

        <div className="space-y-6">
          {/* Cookies */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">🍪 Cookies</h2>
            <div className="bg-muted p-4 rounded font-mono text-sm overflow-auto">
              {cookies || "No cookies found"}
            </div>
          </div>

          {/* Session Data */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">👤 Session Data (/api/me)</h2>
            {loading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : (
              <div className="bg-muted p-4 rounded font-mono text-sm overflow-auto">
                <pre>{JSON.stringify(sessionData, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">✅ What This Proves</h2>
            <ul className="list-disc list-inside space-y-2 text-foreground">
              <li>If you see a <code className="bg-muted px-2 py-1 rounded">bndy_session</code> cookie, Lambda set it correctly</li>
              <li>If /api/me returns user data, cookie authentication works</li>
              <li>If /api/me returns 401, cookie is not being sent or Lambda can't read it</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={() => window.location.href = '/dashboard'}>
              Try Dashboard
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/login'}>
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}