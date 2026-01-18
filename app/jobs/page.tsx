"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type JobStatus = "Wishlist" | "Applied" | "Interview" | "Offer" | "Rejected";
type Priority = "Low" | "Med" | "High";

type Job = {
  id: string;
  company: string;
  title: string;
  location?: string;
  url?: string;
  status: JobStatus;
  priority: Priority;
  updatedAt: string; // ISO
  notes?: string;
  order: number; // ordering within a column
};

const STORAGE_KEY = "job-tracker.jobs";
const COLUMNS: JobStatus[] = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];

function nowISO() {
  return new Date().toISOString();
}

function genId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now());
}

function seedJobs(): Job[] {
  const t = nowISO();
  return [
    {
      id: "1",
      company: "Acme Corp",
      title: "Software Engineer (Intern)",
      location: "Remote",
      status: "Wishlist",
      priority: "High",
      updatedAt: t,
      notes: "",
      order: 0,
    },
    {
      id: "2",
      company: "Globex",
      title: "Data Scientist",
      location: "Boston, MA",
      status: "Applied",
      priority: "Med",
      updatedAt: t,
      notes: "Applied via referral",
      order: 0,
    },
    {
      id: "3",
      company: "Initech",
      title: "Full-Stack Engineer",
      location: "NYC",
      status: "Interview",
      priority: "High",
      updatedAt: t,
      notes: "Phone screen scheduled",
      order: 0,
    },
    {
      id: "4",
      company: "Umbrella",
      title: "ML Engineer",
      location: "Remote",
      status: "Offer",
      priority: "High",
      updatedAt: t,
      notes: "Offer received – review comp",
      order: 0,
    },
  ];
}

function normalizeOrders(jobs: Job[]): Job[] {
  // ensure order is 0..n-1 per column
  const byStatus: Record<JobStatus, Job[]> = {
    Wishlist: [],
    Applied: [],
    Interview: [],
    Offer: [],
    Rejected: [],
  };
  for (const j of jobs) byStatus[j.status].push(j);

  const updates = new Map<string, number>();
  for (const s of COLUMNS) {
    byStatus[s]
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((j, idx) => updates.set(j.id, idx));
  }

  return jobs.map((j) => ({ ...j, order: updates.get(j.id) ?? 0 }));
}

function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Job[];
        return normalizeOrders(parsed);
      }
    } catch {}
    return normalizeOrders(seedJobs());
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch {}
  }, [jobs]);

  function addJob() {
    const id = genId();
    setJobs((prev) =>
      normalizeOrders([
        {
          id,
          company: "New Company",
          title: "New Role",
          location: "",
          url: "",
          status: "Wishlist",
          priority: "Med",
          updatedAt: nowISO(),
          notes: "",
          order: -1,
        },
        ...prev,
      ])
    );
  }

  function updateJob(id: string, patch: Partial<Job>) {
    setJobs((prev) =>
      normalizeOrders(
        prev.map((j) =>
          j.id === id ? { ...j, ...patch, updatedAt: nowISO() } : j
        )
      )
    );
  }

  function removeJob(id: string) {
    setJobs((prev) => normalizeOrders(prev.filter((j) => j.id !== id)));
  }

  function setOrdering(next: { statusById?: Record<string, JobStatus>; orderIdsByStatus: Record<JobStatus, string[]> }) {
    setJobs((prev) => {
      const statusById = next.statusById ?? {};
      const orderIndex = new Map<string, number>();
      for (const s of COLUMNS) {
        next.orderIdsByStatus[s].forEach((id, idx) => orderIndex.set(id, idx));
      }
      const updated = prev.map((j) => {
        const newStatus = statusById[j.id] ?? j.status;
        const newOrder = orderIndex.get(j.id);
        return {
          ...j,
          status: newStatus,
          order: newOrder ?? j.order ?? 0,
          updatedAt: j.id in statusById || orderIndex.has(j.id) ? nowISO() : j.updatedAt,
        };
      });
      return normalizeOrders(updated);
    });
  }

  return { jobs, addJob, updateJob, removeJob, setOrdering };
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]">
      {children}
    </span>
  );
}

function JobCard({ job, onUpdate, onRemove }: { job: Job; onUpdate: (id: string, patch: Partial<Job>) => void; onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-white p-2 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{job.company}</div>
          <div className="text-sm text-neutral-600 truncate">{job.title}</div>
          {job.location ? (
            <div className="text-xs text-neutral-500 truncate">{job.location}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="text-xs text-neutral-500 hover:text-neutral-900"
            onClick={() => onRemove(job.id)}
            title="Delete"
          >
            ✕
          </button>
          <button
            className="cursor-grab active:cursor-grabbing rounded border px-2 py-0.5 text-xs"
            title="Drag"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{job.priority} priority</Badge>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          placeholder="Company"
          value={job.company}
          onChange={(e) => onUpdate(job.id, { company: e.target.value })}
        />
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          placeholder="Title"
          value={job.title}
          onChange={(e) => onUpdate(job.id, { title: e.target.value })}
        />
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          placeholder="Location"
          value={job.location ?? ""}
          onChange={(e) => onUpdate(job.id, { location: e.target.value })}
        />
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          placeholder="URL"
          value={job.url ?? ""}
          onChange={(e) => onUpdate(job.id, { url: e.target.value })}
        />

        <select
          className="w-full border rounded px-2 py-1 text-xs"
          value={job.priority}
          onChange={(e) => onUpdate(job.id, { priority: e.target.value as Priority })}
        >
          <option value="Low">Low</option>
          <option value="Med">Med</option>
          <option value="High">High</option>
        </select>

        <textarea
          className="w-full border rounded px-2 py-1 text-xs resize-none"
          rows={3}
          placeholder="Notes"
          value={job.notes ?? ""}
          onChange={(e) => onUpdate(job.id, { notes: e.target.value })}
        />
      </div>

      <div className="text-[11px] text-neutral-500">Updated: {new Date(job.updatedAt).toLocaleString()}</div>
    </div>
  );
}

function KanbanColumn({
  status,
  jobs,
  onUpdate,
  onRemove,
}: {
  status: JobStatus;
  jobs: Job[];
  onUpdate: (id: string, patch: Partial<Job>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">{status}</div>
        <div className="text-xs text-neutral-500">{jobs.length}</div>
      </div>

      <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 max-h-[75vh] overflow-auto pr-1" id={status}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
          {/* empty-state drop target feel */}
          {jobs.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-xs text-neutral-500">
              Drop here
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

export default function JobsPage() {
  const { jobs, addJob, updateJob, removeJob, setOrdering } = useJobs();
  const [view, setView] = useState<"board" | "list">("board");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const columns = useMemo(() => {
    const m: Record<JobStatus, Job[]> = {
      Wishlist: [],
      Applied: [],
      Interview: [],
      Offer: [],
      Rejected: [],
    };
    for (const j of jobs) m[j.status].push(j);
    for (const s of COLUMNS) m[s].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return m;
  }, [jobs]);

  function findContainer(id: string): JobStatus | null {
    if ((COLUMNS as string[]).includes(id)) return id as JobStatus;
    const j = jobs.find((x) => x.id === id);
    return j ? j.status : null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const active = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!over || active === over) return;

    const from = findContainer(active);
    const to = findContainer(over);
    if (!from || !to) return;

    const fromIds = columns[from].map((j) => j.id);
    const toIds = columns[to].map((j) => j.id);

    // Determine target index
    const isOverAColumn = (COLUMNS as string[]).includes(over);
    const overIndex = isOverAColumn ? toIds.length : toIds.indexOf(over);

    if (from === to) {
      const oldIndex = fromIds.indexOf(active);
      const newIndex = isOverAColumn ? fromIds.length - 1 : overIndex;
      const nextIds = arrayMove(fromIds, oldIndex, Math.max(0, newIndex));

      const orderIdsByStatus: Record<JobStatus, string[]> = {
        ...columns,
        [from]: nextIds.map((id) => id),
      } as any;

      // Convert columns record<JobStatus,Job[]> to ids record
      for (const s of COLUMNS) {
        if (s === from) continue;
        orderIdsByStatus[s] = columns[s].map((j) => j.id);
      }

      setOrdering({ orderIdsByStatus });
      return;
    }

    // Cross-column move
    const nextFrom = fromIds.filter((id) => id !== active);
    const nextTo = [
      ...toIds.slice(0, Math.max(0, overIndex)),
      active,
      ...toIds.slice(Math.max(0, overIndex)),
    ];

    const statusById: Record<string, JobStatus> = { [active]: to };

    const orderIdsByStatus: Record<JobStatus, string[]> = {
      Wishlist: columns.Wishlist.map((j) => j.id),
      Applied: columns.Applied.map((j) => j.id),
      Interview: columns.Interview.map((j) => j.id),
      Offer: columns.Offer.map((j) => j.id),
      Rejected: columns.Rejected.map((j) => j.id),
    };

    orderIdsByStatus[from] = nextFrom;
    orderIdsByStatus[to] = nextTo;

    setOrdering({ statusById, orderIdsByStatus });
  }

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Job Tracker</h1>
          <p className="text-sm text-neutral-500">Kanban board with drag-and-drop + list view (saved in localStorage)</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`rounded-md border px-3 py-1.5 text-sm ${view === "board" ? "bg-neutral-900 text-white" : "bg-white"}`}
            onClick={() => setView("board")}
          >
            Board
          </button>
          <button
            className={`rounded-md border px-3 py-1.5 text-sm ${view === "list" ? "bg-neutral-900 text-white" : "bg-white"}`}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button className="rounded-md border px-3 py-1.5 text-sm bg-white hover:bg-neutral-50" onClick={addJob}>
            + Add Job
          </button>
        </div>
      </div>

      {view === "board" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                jobs={columns[status]}
                onUpdate={updateJob}
                onRemove={removeJob}
              />
            ))}
          </div>

          <DragOverlay>
            {activeJob ? (
              <div className="rounded-md border bg-white p-2 w-[260px] shadow">
                <div className="font-semibold">{activeJob.company}</div>
                <div className="text-sm text-neutral-600">{activeJob.title}</div>
                <div className="mt-2"><Badge>{activeJob.priority} priority</Badge></div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="rounded-lg border overflow-auto bg-white">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-12 gap-2 border-b bg-neutral-50 p-2 text-xs font-semibold">
              <div className="col-span-2">Company</div>
              <div className="col-span-3">Title</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1">Actions</div>
            </div>

            {jobs
              .slice()
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((job) => (
                <div key={job.id} className="grid grid-cols-12 gap-2 border-b p-2 items-center">
                  <div className="col-span-2">
                    <input className="w-full border rounded px-2 py-1 text-xs" value={job.company} onChange={(e) => updateJob(job.id, { company: e.target.value })} />
                  </div>

                  <div className="col-span-3">
                    <input className="w-full border rounded px-2 py-1 text-xs" value={job.title} onChange={(e) => updateJob(job.id, { title: e.target.value })} />
                  </div>

                  <div className="col-span-2">
                    <select className="w-full border rounded px-2 py-1 text-xs" value={job.status} onChange={(e) => updateJob(job.id, { status: e.target.value as JobStatus })}>
                      {COLUMNS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <select className="w-full border rounded px-2 py-1 text-xs" value={job.priority} onChange={(e) => updateJob(job.id, { priority: e.target.value as Priority })}>
                      <option value="Low">Low</option>
                      <option value="Med">Med</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="col-span-2 text-xs text-neutral-500 whitespace-nowrap">{new Date(job.updatedAt).toLocaleString()}</div>

                  <div className="col-span-1">
                    <button className="text-xs text-neutral-500 hover:text-neutral-900" onClick={() => removeJob(job.id)}>
                      Delete
                    </button>
                  </div>

                  <div className="col-span-12">
                    <textarea className="w-full border rounded px-2 py-1 text-xs resize-none" rows={2} placeholder="Notes" value={job.notes ?? ""} onChange={(e) => updateJob(job.id, { notes: e.target.value })} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}