import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorText, PageHeader, StatusBadge } from "../components/ui";
import { useProjectRole } from "../hooks/useProjectRole";
import { canManageProject } from "../lib/roles";

type GitHubView = {
  integration: {
    owner: string;
    repo: string;
    repositoryUrl: string;
    defaultBranch: string;
    enabled: boolean;
    lastWebhookReceivedAt?: string | null;
    lastWebhookSuccessAt?: string | null;
    lastWebhookFailureAt?: string | null;
    lastWebhookFailureMessage?: string | null;
    lastInboundDeliveryAt?: string | null;
  } | null;
  health: string;
  webhookUrl: string;
  webhookEvents: string[];
  signatureAlgorithm: string;
  secretConfigured: boolean;
};

export function GitHubIntegrationPage() {
  const { projectId = "" } = useParams();
  const { role } = useProjectRole(projectId);
  const qc = useQueryClient();
  const canEdit = canManageProject(role);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    owner: "",
    repo: "",
    defaultBranch: "main",
    enabled: true,
    webhookSecret: "",
    rotateSecret: "",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["github-integration", projectId],
    queryFn: () => api<GitHubView>(`/api/projects/${projectId}/integrations/github`),
    enabled: Boolean(projectId),
  });

  const save = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/integrations/github`, {
        method: "PUT",
        body: JSON.stringify({
          owner: form.owner,
          repo: form.repo,
          defaultBranch: form.defaultBranch,
          enabled: form.enabled,
          ...(form.webhookSecret ? { webhookSecret: form.webhookSecret } : {}),
        }),
      }),
    onSuccess: () => {
      setError(null);
      setSuccess("GitHub integration saved.");
      setForm((f) => ({ ...f, webhookSecret: "" }));
      void refetch();
      qc.invalidateQueries({ queryKey: ["github-integration", projectId] });
    },
    onError: (e: Error) => {
      setSuccess(null);
      setError(e.message);
    },
  });

  const rotate = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}/integrations/github/rotate-secret`, {
        method: "POST",
        body: JSON.stringify({ webhookSecret: form.rotateSecret }),
      }),
    onSuccess: () => {
      setError(null);
      setSuccess("Webhook secret rotated.");
      setForm((f) => ({ ...f, rotateSecret: "" }));
      void refetch();
    },
    onError: (e: Error) => {
      setSuccess(null);
      setError(e.message);
    },
  });

  if (isLoading) return <p className="text-faint text-[13px]">Loading GitHub integration…</p>;

  const integration = data?.integration;

  useEffect(() => {
    if (!integration) return;
    setForm((f) => ({
      ...f,
      owner: integration.owner,
      repo: integration.repo,
      defaultBranch: integration.defaultBranch,
      enabled: integration.enabled,
    }));
  }, [integration?.owner, integration?.repo, integration?.defaultBranch, integration?.enabled]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="GitHub integration"
        subtitle="Repository webhooks and CI ingestion for this project"
      />
      <ErrorText message={error} />
      {success ? <p className="text-[13px] text-emerald-700 dark:text-emerald-300">{success}</p> : null}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-heading">Integration health</h2>
          <StatusBadge value={data?.health ?? "NOT_CONFIGURED"} />
        </div>
        <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-faint">Webhook endpoint</dt>
            <dd className="mono-id break-all">{data?.webhookUrl}</dd>
          </div>
          <div>
            <dt className="text-faint">Events</dt>
            <dd>{data?.webhookEvents?.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-faint">Signature</dt>
            <dd>{data?.signatureAlgorithm}</dd>
          </div>
          <div>
            <dt className="text-faint">Secret stored</dt>
            <dd>{data?.secretConfigured ? "Yes (not shown)" : "Not configured"}</dd>
          </div>
          <div>
            <dt className="text-faint">Last webhook received</dt>
            <dd>{integration?.lastWebhookReceivedAt ? new Date(integration.lastWebhookReceivedAt).toLocaleString() : "—"}</dd>
          </div>
          <div>
            <dt className="text-faint">Last successful delivery</dt>
            <dd>{integration?.lastWebhookSuccessAt ? new Date(integration.lastWebhookSuccessAt).toLocaleString() : "—"}</dd>
          </div>
          <div>
            <dt className="text-faint">Last failed delivery</dt>
            <dd>
              {integration?.lastWebhookFailureAt
                ? `${new Date(integration.lastWebhookFailureAt).toLocaleString()} — ${integration.lastWebhookFailureMessage ?? ""}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-faint">Last inbound dedup record</dt>
            <dd>{integration?.lastInboundDeliveryAt ? new Date(integration.lastInboundDeliveryAt).toLocaleString() : "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium text-heading">Setup instructions</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-body-theme">
          <li>Save repository owner, name, and default branch below (Administrator only).</li>
          <li>Set a webhook secret here and use the same value in GitHub.</li>
          <li>In GitHub → Settings → Webhooks, add the payload URL above with content type JSON.</li>
          <li>Subscribe to <strong>Workflow runs</strong> events only.</li>
        </ol>
      </section>

      {!canEdit ? (
        <p className="text-[13px] text-faint">Only project administrators can change GitHub integration settings.</p>
      ) : (
        <>
          <section className="card space-y-3">
            <h2 className="font-medium text-heading">Repository configuration</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="input"
                placeholder="Owner"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
              <input
                className="input"
                placeholder="Repository name"
                value={form.repo}
                onChange={(e) => setForm({ ...form, repo: e.target.value })}
              />
              <input
                className="input"
                placeholder="Default branch"
                value={form.defaultBranch}
                onChange={(e) => setForm({ ...form, defaultBranch: e.target.value })}
              />
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                />
                Integration enabled
              </label>
            </div>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder={data?.secretConfigured ? "New webhook secret (optional on save)" : "Webhook secret (required)"}
              value={form.webhookSecret}
              onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
            />
            <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save configuration"}
            </button>
          </section>
          {data?.secretConfigured ? (
            <section className="card space-y-3">
              <h2 className="font-medium text-heading">Rotate webhook secret</h2>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="New secret (min 8 characters)"
                value={form.rotateSecret}
                onChange={(e) => setForm({ ...form, rotateSecret: e.target.value })}
              />
              <button type="button" className="btn-secondary" disabled={rotate.isPending} onClick={() => rotate.mutate()}>
                Rotate secret
              </button>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
