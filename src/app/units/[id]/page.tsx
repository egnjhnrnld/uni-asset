import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import Link from "next/link";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { UnitActions } from "@/components/UnitActions";
import { AssetDetailTabs } from "@/components/AssetDetailTabs";
import { CategoryBadge, LocationKindBadge, StatusBadge } from "@/components/Badges";
import { WorkLogQuickAdd } from "@/components/WorkLogQuickAdd";
import { AuditNoteForm } from "@/components/AuditNoteForm";
import { MaintenanceFieldsForm } from "@/components/MaintenanceFieldsForm";
import { isCheckoutableCategory } from "@/lib/asset";
import { workLogActionLabel } from "@/lib/labels";
import { WorkOrderQuickCreate } from "@/components/WorkOrderQuickCreate";

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      department: true,
      location: true,
      status: true,
      assignedTo: true,
      auditEvents: { include: { actor: true }, orderBy: { createdAt: "desc" }, take: 100 },
      workOrders: {
        include: { requestedBy: true, assignedTo: true },
        orderBy: { openedAt: "desc" },
        take: 25,
      },
      workLogEntries: {
        include: { performedBy: true, workOrder: true },
        orderBy: { createdAt: "desc" },
        take: 150,
      },
    },
  });

  if (!asset) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Asset not found</h1>
        <div className="mt-4 text-sm">
          <Link href="/units">Back to assets</Link>
        </div>
      </main>
    );
  }

  const unitUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/u/${asset.assetTag}`;
  const qrDataUrl = await QRCode.toDataURL(unitUrl, { margin: 1, width: 240 });
  const title = asset.displayName ?? asset.assetTag;
  const sub = [asset.assetTag, asset.terminalNumber].filter(Boolean).join(" · ");
  const checkoutable = isCheckoutableCategory(asset.category);

  const merged = [
    ...asset.auditEvents.map((e) => ({
      kind: "audit" as const,
      id: e.id,
      at: e.createdAt,
      label: e.actionType,
      who: e.actor.email,
      text: e.note,
    })),
    ...asset.workLogEntries.map((w) => ({
      kind: "work" as const,
      id: w.id,
      at: w.createdAt,
      label: workLogActionLabel[w.actionType],
      who: w.performedBy.email,
      text: w.notes,
      wo: w.workOrder?.title,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const status = asset.status?.status ?? "DEPLOYABLE";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={asset.category} />
            <LocationKindBadge kind={asset.location.kind} />
            <StatusBadge status={status} />
            {asset.location.labNumber != null ? (
              <span className="text-[11px] text-zinc-500">Lab #{asset.location.labNumber}</span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight"> {title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {sub}
            {asset.hostname ? ` · ${asset.hostname}` : ""}
            {asset.ipAddress ? ` · ${asset.ipAddress}` : ""}
            {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {asset.department.name} · {asset.location.name}
            {asset.location.building ? ` · ${asset.location.building}` : ""}
            {asset.location.room ? ` · Room ${asset.location.room}` : ""}
          </p>
        </div>
        <UnitActions assetId={asset.id} checkoutable={checkoutable} />
      </div>

      <div className="mt-10">
        <AssetDetailTabs
          overview={
            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="QR (scan to open)">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="Asset QR" className="h-40 w-40 rounded bg-white p-2" />
                  <div className="text-xs text-zinc-400">
                    <div className="font-medium text-zinc-200">Public URL</div>
                    <div className="mt-1 break-all">{unitUrl}</div>
                  </div>
                </div>
              </Card>

              <Card title="Assignment">
                <div className="text-sm text-zinc-300">
                  <div>
                    Assigned:{" "}
                    <span className="text-zinc-100">{asset.assignedTo?.email ?? "—"}</span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    Last checkout: {asset.lastCheckout?.toISOString() ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Expected check-in: {asset.expectedCheckin?.toISOString() ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Last check-in: {asset.lastCheckin?.toISOString() ?? "—"}
                  </div>
                </div>
              </Card>

              <Card title="Specs">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-zinc-500">OS</dt>
                    <dd className="text-zinc-200">{asset.osVersion ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">CPU</dt>
                    <dd className="text-zinc-200">{asset.cpu ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">RAM (GB)</dt>
                    <dd className="text-zinc-200">{asset.ramGb ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Storage (GB)</dt>
                    <dd className="text-zinc-200">{asset.storageGb ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">GPU</dt>
                    <dd className="text-zinc-200">{asset.gpu ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">MAC</dt>
                    <dd className="text-zinc-200">{asset.macAddress ?? "—"}</dd>
                  </div>
                </dl>
              </Card>
            </div>
          }
          activity={
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Merged activity (newest first)">
                <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                  {merged.map((row) => (
                    <div
                      key={`${row.kind}-${row.id}`}
                      className="rounded-md border border-zinc-800 bg-zinc-950/30 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-zinc-200">
                          {row.kind === "audit" ? row.label : `Work: ${row.label}`}
                        </span>
                        <span className="text-zinc-500">{row.at.toISOString()}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {row.who}
                        {row.kind === "work" && row.wo ? ` · WO: ${row.wo}` : ""}
                      </div>
                      {row.text ? <div className="mt-2 text-xs text-zinc-300">{row.text}</div> : null}
                    </div>
                  ))}
                  {merged.length === 0 ? (
                    <div className="text-sm text-zinc-400">No activity yet.</div>
                  ) : null}
                </div>
              </Card>

              <div className="space-y-6">
                <Card title="Audit timeline (append-only)">
                  <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {asset.auditEvents.map((e) => (
                      <div key={e.id} className="rounded-md border border-zinc-800 bg-zinc-950/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-zinc-200">{e.actionType}</span>
                          <span className="text-zinc-500">{e.createdAt.toISOString()}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-500">{e.actor.email}</div>
                        {e.note ? <div className="mt-2 text-xs text-zinc-300">{e.note}</div> : null}
                      </div>
                    ))}
                    {asset.auditEvents.length === 0 ? (
                      <div className="text-sm text-zinc-400">No audit events yet.</div>
                    ) : null}
                  </div>
                </Card>

                <AuditNoteForm assetId={asset.id} />
              </div>
            </div>
          }
          maintenance={
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <MaintenanceFieldsForm
                  assetId={asset.id}
                  initial={{
                    displayName: asset.displayName,
                    internalNotes: asset.internalNotes,
                    purchaseDate: asset.purchaseDate?.toISOString() ?? null,
                    warrantyExpiresAt: asset.warrantyExpiresAt?.toISOString() ?? null,
                    lastServiceAt: asset.lastServiceAt?.toISOString() ?? null,
                    nextServiceDueAt: asset.nextServiceDueAt?.toISOString() ?? null,
                  }}
                />
                <WorkOrderQuickCreate assetId={asset.id} />
                <WorkLogQuickAdd assetId={asset.id} />
              </div>

              <div className="space-y-6">
                <Card title="Work orders">
                  <div className="space-y-2">
                    {asset.workOrders.map((w) => (
                      <div key={w.id} className="rounded-md border border-zinc-800 bg-zinc-950/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-zinc-100">{w.title}</span>
                          <span className="text-zinc-500">{w.status}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-400">
                          {w.type} · requested by {w.requestedBy.email}
                          {w.assignedTo ? ` · assigned to ${w.assignedTo.email}` : ""}
                        </div>
                        {w.description ? <div className="mt-2 text-xs text-zinc-300">{w.description}</div> : null}
                      </div>
                    ))}
                    {asset.workOrders.length === 0 ? (
                      <div className="text-sm text-zinc-400">No work orders yet.</div>
                    ) : null}
                  </div>
                </Card>

                <Card title="Work log (append-only)">
                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {asset.workLogEntries.map((w) => (
                      <div key={w.id} className="rounded-md border border-zinc-800 bg-zinc-950/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-zinc-200">{workLogActionLabel[w.actionType]}</span>
                          <span className="text-zinc-500">{w.createdAt.toISOString()}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {w.performedBy.email}
                          {w.workOrder ? ` · WO: ${w.workOrder.title}` : ""}
                        </div>
                        {w.notes ? <div className="mt-2 text-xs text-zinc-300">{w.notes}</div> : null}
                      </div>
                    ))}
                    {asset.workLogEntries.length === 0 ? (
                      <div className="text-sm text-zinc-400">No work log entries yet.</div>
                    ) : null}
                  </div>
                </Card>
              </div>
            </div>
          }
        />
      </div>

      <div className="mt-10 text-sm">
        <Link href="/units" className="text-zinc-400 hover:text-zinc-200">
          ← Back to all assets
        </Link>
        <span className="mx-3 text-zinc-700">|</span>
        <Link
          href={`/tickets/new?assetId=${asset.id}`}
          className="text-emerald-200 hover:text-emerald-300"
        >
          Create ticket for this asset →
        </Link>
      </div>
    </main>
  );
}
