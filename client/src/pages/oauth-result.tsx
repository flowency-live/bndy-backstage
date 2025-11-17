import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PageContainer } from "@/components/layout/PageContainer";
import { usersService } from "@/lib/services/users-service";

interface FlowStep {
  step: string;
  timestamp: number;
  location: string;
  data?: any;
}

export default function OAuthResult() {
  const [, setLocation] = useLocation();
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [cookies, setCookies] = useState<string>("");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [urlParams, setUrlParams] = useState<any>({});

  useEffect(() => {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const paramsObj: any = {};
    params.forEach((value, key) => {
      paramsObj[key] = value;
    });
    setUrlParams(paramsObj);

    // Get flow steps from localStorage
    const storedSteps = localStorage.getItem('oauth_flow_steps');
    const steps: FlowStep[] = storedSteps ? JSON.parse(storedSteps) : [];

    // Add this page load as a step
    steps.push({
      step: 'oauth_result_page_loaded',
      timestamp: Date.now(),
      location: window.location.href,
      data: { urlParams: paramsObj }
    });

    setFlowSteps(steps);

    // Get all cookies
    setCookies(document.cookie || "No cookies found");

    // Try to call /api/me
    usersService.getProfile()
      .then((data) => {
        setApiResponse({
          status: 200,
          statusText: 'OK',
          headers: {},
          body: data
        });

        steps.push({
          step: 'api_me_called',
          timestamp: Date.now(),
          location: window.location.href,
          data: { status: 200, response: data }
        });
        setFlowSteps([...steps]);
        localStorage.setItem('oauth_flow_steps', JSON.stringify(steps));
      })
      .catch((err) => {
        setApiResponse({
          error: err.message,
          stack: err.stack
        });

        steps.push({
          step: 'api_me_error',
          timestamp: Date.now(),
          location: window.location.href,
          data: { error: err.message }
        });
        setFlowSteps([...steps]);
        localStorage.setItem('oauth_flow_steps', JSON.stringify(steps));
      });
  }, []);

  const flowStart = localStorage.getItem('oauth_flow_start');
  const totalTime = flowStart ? Date.now() - parseInt(flowStart) : 0;

  return (
    <PageContainer variant="wide">
      <h1 className="text-4xl font-bold text-foreground mb-8">🔍 OAUTH FLOW RESULT</h1>

        {/* Summary */}
        <div className="bg-green-500/10 border border-green-500 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-green-500 mb-2">✅ OAuth Flow Completed</h2>
          <p className="text-foreground">Total time: {totalTime}ms</p>
          <p className="text-foreground">Total hops: {flowSteps.length}</p>
        </div>

        {/* Flow Steps */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">📋 Flow Steps</h2>
          <div className="space-y-3">
            {flowSteps.map((step, index) => (
              <div key={index} className="bg-muted p-4 rounded">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-foreground">
                    {index + 1}. {step.step}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(step.timestamp).toISOString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  <strong>Location:</strong> {step.location}
                </div>
                {step.data && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Data</summary>
                    <pre className="bg-background p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(step.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* URL Parameters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">🔗 URL Parameters</h2>
          <pre className="bg-muted p-4 rounded font-mono text-sm overflow-auto">
            {Object.keys(urlParams).length > 0
              ? JSON.stringify(urlParams, null, 2)
              : "No URL parameters"}
          </pre>
        </div>

        {/* Cookies */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">🍪 Cookies</h2>
          <pre className="bg-muted p-4 rounded font-mono text-sm overflow-auto whitespace-pre-wrap break-all">
            {cookies}
          </pre>
        </div>

        {/* API Response */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">🔌 /api/me Response</h2>
          <pre className="bg-muted p-4 rounded font-mono text-sm overflow-auto">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              localStorage.removeItem('oauth_flow_start');
              localStorage.removeItem('oauth_flow_steps');
              setLocation('/login');
            }}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90"
          >
            Clear & Try Again
          </button>
          <button
            onClick={() => setLocation('/dashboard')}
            className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/90"
          >
            Go to Dashboard
          </button>
        </div>
    </PageContainer>
  );
}