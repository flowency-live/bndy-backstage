import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { usersService } from "@/lib/services/users-service";

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
    // Check if session token is in URL
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get('session');

    if (sessionToken) {
      // Set cookie client-side
      document.cookie = `bndy_session=${sessionToken}; Max-Age=604800; Path=/; Secure; SameSite=Lax`;

      // Remove session param from URL
      window.history.replaceState({}, '', '/auth-success');
    }

    // Get all cookies
    setCookies(document.cookie);

    // Call /api/me to verify auth
    usersService.getProfile()
      .then((data) => {
        setSessionData(data);
      })
      .catch((err) => {
        setSessionData({ error: err.message });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <PageContainer>
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
    </PageContainer>
  );
}