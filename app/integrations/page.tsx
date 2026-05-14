"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type IntegrationConfig = {
  id: string;
  provider: "GREENHOUSE" | "LEVER" | "WORKDAY" | "BAMBOOHR" | "GENERIC_WEBHOOK";
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  lastSyncAt?: string | null;
};

const providers: IntegrationConfig["provider"][] = [
  "GREENHOUSE",
  "LEVER",
  "WORKDAY",
  "BAMBOOHR",
  "GENERIC_WEBHOOK",
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationConfig["provider"]>("GENERIC_WEBHOOK");
  const [status, setStatus] = useState<IntegrationConfig["status"]>("DISCONNECTED");
  const [apiEndpointHint, setApiEndpointHint] = useState("");

  useEffect(() => {
    void fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    const response = await fetch("/api/integrations");
    const data = await response.json();
    setIntegrations(data.integrations ?? []);
  }

  async function saveIntegration() {
    const response = await fetch("/api/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: selectedProvider,
        status,
        configJson: {
          endpointHint: apiEndpointHint,
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Failed to save integration config.");
      return;
    }
    toast.success("Integration configuration saved.");
    await fetchIntegrations();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>ATS Integrations</CardTitle>
          <CardDescription>
            Integration-ready configuration layer for Greenhouse, Lever, Workday, BambooHR, and generic webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Provider</Label>
            <Select value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value as IntegrationConfig["provider"])}>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onChange={(event) => setStatus(event.target.value as IntegrationConfig["status"])}>
              <option value="DISCONNECTED">DISCONNECTED</option>
              <option value="CONNECTED">CONNECTED</option>
              <option value="ERROR">ERROR</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Endpoint / Key Hint</Label>
            <Input
              placeholder="Connector endpoint hint"
              value={apiEndpointHint}
              onChange={(event) => setApiEndpointHint(event.target.value)}
            />
          </div>
          <Button onClick={saveIntegration}>Save Integration</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Providers</CardTitle>
          <CardDescription>Live integration status and last synchronization marker.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {integrations.length ? (
            integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{integration.provider}</p>
                  <p className="text-xs text-slate-500">
                    {integration.lastSyncAt
                      ? `Last sync: ${new Date(integration.lastSyncAt).toLocaleString()}`
                      : "No sync recorded"}
                  </p>
                </div>
                <Badge
                  variant={
                    integration.status === "CONNECTED"
                      ? "success"
                      : integration.status === "ERROR"
                        ? "danger"
                        : "default"
                  }
                >
                  {integration.status}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No providers configured yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Ingestion Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            Use provider-specific endpoint format:
            <span className="ml-1 rounded bg-slate-100 px-2 py-1 font-mono text-xs">
              /api/integrations/webhook/{`{provider}`}
            </span>
          </p>
          <p>
            Expected payload must include <code>organizationId</code>. This route stores raw payloads for
            secure downstream processing and auditability.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
