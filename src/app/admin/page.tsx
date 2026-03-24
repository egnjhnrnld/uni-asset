import { Card } from "@/components/ui";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-2 text-sm text-zinc-400">
        MVP placeholder. Next steps: CRUD for departments/locations/status labels/models and bulk QR export.
      </p>

      <div className="mt-8 grid gap-6">
        <Card title="Planned admin features (from your plan)">
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            <li>Create/manage locations (lab rooms)</li>
            <li>Create/manage departments</li>
            <li>Create/manage status labels (Deployable, CheckedOut, Archived)</li>
            <li>Bulk QR export for a lab room</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}

