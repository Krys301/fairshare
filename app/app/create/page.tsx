import { createEventAction } from "./actions";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default async function CreateEventPage(props: PageProps<"/create">) {
  const { error } = await props.searchParams;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create an event</h1>
        <p className="mt-1 text-sm text-muted">
          Set your costs and margin — the price falls as more people join.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {Array.isArray(error) ? error[0] : error}
        </div>
      )}

      <form
        action={createEventAction}
        className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-5"
      >
        <Field label="Title">
          <input name="title" required className={inputClass} placeholder="Society trip" />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            required
            rows={2}
            className={inputClass}
            placeholder="Coach, hostel and a guided hike"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Organiser">
            <input name="organiser" required className={inputClass} />
          </Field>
          <Field label="Location">
            <input name="location" required className={inputClass} />
          </Field>
        </div>
        <Field label="Joins close">
          <input
            type="datetime-local"
            name="deadline"
            required
            className={inputClass}
          />
        </Field>

        <div className="h-px bg-card-border" />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fixed cost ($)">
            <input
              type="number"
              name="fixed"
              min="0"
              step="0.01"
              required
              defaultValue="2000"
              className={inputClass}
            />
          </Field>
          <Field label="Cost per head ($)">
            <input
              type="number"
              name="perHead"
              min="0"
              step="0.01"
              required
              defaultValue="5"
              className={inputClass}
            />
          </Field>
          <Field label="Margin (%)">
            <input
              type="number"
              name="marginPercent"
              min="0"
              step="0.1"
              required
              defaultValue="10"
              className={inputClass}
            />
          </Field>
          <Field label="Floor price ($)">
            <input
              type="number"
              name="pMin"
              min="0"
              step="0.01"
              required
              defaultValue="10"
              className={inputClass}
            />
          </Field>
          <Field label="Starting cap ($)">
            <input
              type="number"
              name="pMax"
              min="0"
              step="0.01"
              required
              defaultValue="50"
              className={inputClass}
            />
          </Field>
          <Field label="Minimum attendees">
            <input
              type="number"
              name="nMin"
              min="1"
              required
              defaultValue="50"
              className={inputClass}
            />
          </Field>
          <Field label="Capacity">
            <input
              type="number"
              name="nMax"
              min="1"
              required
              defaultValue="400"
              className={inputClass}
            />
          </Field>
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-xl bg-accent px-5 py-3 text-base font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          Create event
        </button>
      </form>
    </div>
  );
}
