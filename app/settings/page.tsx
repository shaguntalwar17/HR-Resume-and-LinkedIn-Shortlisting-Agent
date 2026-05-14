"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type SettingPayload = {
  defaultWeights: Record<string, number>;
  minimumScoreThreshold: number;
  knockoutCriteria: {
    minimumMandatorySkillMatchPercentage?: number;
    minimumExperienceYears?: number;
    rejectOnMissingMandatorySkillsCount?: number;
  };
  aiEnhancementEnabled: boolean;
  reportBranding: Record<string, string | number | boolean>;
};

type OrganizationPayload = {
  id: string;
  name: string;
  industry?: string | null;
};

type UserPayload = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECRUITER" | "HIRING_MANAGER" | "VIEWER";
};

const defaultWeights = {
  mandatorySkills: 0.25,
  preferredSkills: 0.1,
  experience: 0.2,
  domain: 0.1,
  education: 0.1,
  projects: 0.1,
  communication: 0.08,
  semantic: 0.07,
};

const fallbackSetting: SettingPayload = {
  defaultWeights,
  minimumScoreThreshold: 70,
  knockoutCriteria: {},
  aiEnhancementEnabled: false,
  reportBranding: { productName: "HireWise AI" },
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setting, setSetting] = useState<SettingPayload>({
    ...fallbackSetting,
  });
  const [organization, setOrganization] = useState<OrganizationPayload | null>(null);
  const [users, setUsers] = useState<UserPayload[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [settingsResponse, orgResponse, usersResponse] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/organization"),
          fetch("/api/users"),
        ]);

        const settingsData = await settingsResponse.json();
        const orgData = await orgResponse.json();
        const usersData = await usersResponse.json();

        setSetting(settingsData.setting ?? fallbackSetting);
        setOrganization(orgData.organization ?? null);
        setUsers(usersData.users ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save settings.");
      }
      setSetting(data.setting);
      toast.success("Scoring and AI settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function saveOrganization() {
    if (!organization) return;
    setSaving(true);
    try {
      const response = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: organization.name,
          industry: organization.industry ?? "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save organization.");
      setOrganization(data.organization);
      toast.success("Organization profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Organization update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function updateUserRole(userId: string, role: UserPayload["role"]) {
    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to update user role.");
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
      toast.success("User role updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Scoring & AI Configuration</CardTitle>
          <CardDescription>
            Configure default scoring weights, thresholds, and knockout rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(setting.defaultWeights).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-slate-500">{key}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={value}
                  onChange={(event) =>
                    setSetting((prev) => ({
                      ...prev,
                      defaultWeights: {
                        ...prev.defaultWeights,
                        [key]: Number.parseFloat(event.target.value || "0"),
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Minimum Score Threshold">
              <Input
                type="number"
                min={0}
                max={100}
                value={setting.minimumScoreThreshold}
                onChange={(event) =>
                  setSetting((prev) => ({
                    ...prev,
                    minimumScoreThreshold: Number.parseInt(event.target.value || "0", 10),
                  }))
                }
              />
            </Field>
            <Field label="Mandatory Skill Match %">
              <Input
                type="number"
                min={0}
                max={100}
                value={setting.knockoutCriteria.minimumMandatorySkillMatchPercentage ?? ""}
                onChange={(event) =>
                  setSetting((prev) => ({
                    ...prev,
                    knockoutCriteria: {
                      ...prev.knockoutCriteria,
                      minimumMandatorySkillMatchPercentage: Number.parseFloat(event.target.value || "0"),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Minimum Experience (Years)">
              <Input
                type="number"
                min={0}
                value={setting.knockoutCriteria.minimumExperienceYears ?? ""}
                onChange={(event) =>
                  setSetting((prev) => ({
                    ...prev,
                    knockoutCriteria: {
                      ...prev.knockoutCriteria,
                      minimumExperienceYears: Number.parseFloat(event.target.value || "0"),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Reject on Missing Mandatory Skills >= ">
              <Input
                type="number"
                min={0}
                value={setting.knockoutCriteria.rejectOnMissingMandatorySkillsCount ?? ""}
                onChange={(event) =>
                  setSetting((prev) => ({
                    ...prev,
                    knockoutCriteria: {
                      ...prev.knockoutCriteria,
                      rejectOnMissingMandatorySkillsCount: Number.parseInt(event.target.value || "0", 10),
                    },
                  }))
                }
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="aiEnhancementEnabled"
              type="checkbox"
              checked={setting.aiEnhancementEnabled}
              onChange={(event) =>
                setSetting((prev) => ({
                  ...prev,
                  aiEnhancementEnabled: event.target.checked,
                }))
              }
            />
            <Label htmlFor="aiEnhancementEnabled">Enable AI enhancement where API key is available</Label>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Update organization details and report branding context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Organization Name">
              <Input
                value={organization?.name ?? ""}
                onChange={(event) =>
                  setOrganization((prev) =>
                    prev ? { ...prev, name: event.target.value } : prev
                  )
                }
              />
            </Field>
            <Field label="Industry">
              <Input
                value={organization?.industry ?? ""}
                onChange={(event) =>
                  setOrganization((prev) =>
                    prev ? { ...prev, industry: event.target.value } : prev
                  )
                }
              />
            </Field>
            <Button variant="secondary" onClick={saveOrganization} disabled={saving}>
              Save Organization
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Manage recruiter and hiring manager access levels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <Select
                  value={user.role}
                  onChange={(event) => updateUserRole(user.id, event.target.value as UserPayload["role"])}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="RECRUITER">RECRUITER</option>
                  <option value="HIRING_MANAGER">HIRING_MANAGER</option>
                  <option value="VIEWER">VIEWER</option>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
