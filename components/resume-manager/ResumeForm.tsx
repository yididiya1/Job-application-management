"use client";

import { useState } from "react";
import MarkdownEditor from "./MarkdownEditor";

export type Education = { id: string; school: string; degree: string; start?: string; end?: string; location?: string; gpa?: string };
export type Experience = { id: string; company: string; title: string; start?: string; end?: string; location?: string; notes?: string; projectLinks?: string[] };

type Props = {
  onChange: (data: ResumeData) => void;
  data: ResumeData;
};

export type ResumeData = {
  header: { name: string; email: string; phone: string; location?: string; linkedin?: string; github?: string };
  education: Education[];
  experience: Experience[];
  projects: { id: string; title: string; description: string; link?: string }[];
  technical: string;
  other: string;
};

export default function ResumeForm({ onChange, data }: Props) {
  const [local, setLocal] = useState<ResumeData>(data);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ header: false, education: false, experience: false, projects: false, technical: false, other: false });

  function toggle(section: string) {
    setCollapsed((c) => ({ ...c, [section]: !c[section] }));
  }

  function updateHeader(field: keyof typeof local.header, value: string) {
    const next = { ...local, header: { ...local.header, [field]: value } };
    setLocal(next);
    onChange(next);
  }

  function addEducation() {
    const next = {
      ...local,
      education: [...local.education, { id: Date.now().toString(), school: "", degree: "", start: "", end: "", location: "", gpa: "" }],
    };
    setLocal(next);
    onChange(next);
  }

  function updateEducation(idx: number, patch: Partial<Education>) {
    const copy = [...local.education];
    copy[idx] = { ...copy[idx], ...patch };
    const next = { ...local, education: copy };
    setLocal(next);
    onChange(next);
  }

  function removeEducation(idx: number) {
    const copy = local.education.filter((_, i) => i !== idx);
    const next = { ...local, education: copy };
    setLocal(next);
    onChange(next);
  }

  function addExperience() {
    const next = {
      ...local,
      experience: [...local.experience, { id: Date.now().toString(), company: "", title: "", start: "", end: "", location: "", notes: "", projectLinks: [] }],
    };
    setLocal(next);
    onChange(next);
  }

  function updateExperience(idx: number, patch: Partial<Experience>) {
    const copy = [...local.experience];
    copy[idx] = { ...copy[idx], ...patch };
    const next = { ...local, experience: copy };
    setLocal(next);
    onChange(next);
  }

  function removeExperience(idx: number) {
    const copy = local.experience.filter((_, i) => i !== idx);
    const next = { ...local, experience: copy };
    setLocal(next);
    onChange(next);
  }

  function addProject() {
    const next = { ...local, projects: [...local.projects, { id: Date.now().toString(), title: "", description: "", link: "" }] };
    setLocal(next);
    onChange(next);
  }

  function updateProject(idx: number, patch: Partial<{ id: string; title: string; description: string; link?: string }>) {
    const copy = [...local.projects];
    copy[idx] = { ...copy[idx], ...patch };
    const next = { ...local, projects: copy };
    setLocal(next);
    onChange(next);
  }

  function removeProject(idx: number) {
    const copy = local.projects.filter((_, i) => i !== idx);
    const next = { ...local, projects: copy };
    setLocal(next);
    onChange(next);
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Header</h3>
          <button className="text-sm text-neutral-600" onClick={() => toggle('header')}>{collapsed.header ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.header && (
          <>
            <input className="w-full border p-2 mt-2" placeholder="Name" value={local.header.name} onChange={(e) => updateHeader("name", e.target.value)} />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input className="border p-2" placeholder="Email" value={local.header.email} onChange={(e) => updateHeader("email", e.target.value)} />
              <input className="border p-2" placeholder="Phone" value={local.header.phone} onChange={(e) => updateHeader("phone", e.target.value)} />
              <input className="border p-2" placeholder="Location" value={local.header.location || ''} onChange={(e) => updateHeader("location", e.target.value)} />
              <input className="border p-2" placeholder="LinkedIn" value={local.header.linkedin || ''} onChange={(e) => updateHeader("linkedin", e.target.value)} />
              <input className="border p-2 col-span-2" placeholder="GitHub" value={local.header.github || ''} onChange={(e) => updateHeader("github", e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Education</h3>
          <button className="text-sm text-neutral-600" onClick={() => toggle('education')}>{collapsed.education ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.education && (
          <>
            {local.education.map((ed, idx) => (
              <div key={ed.id} className="border p-2 mt-2">
                <input className="w-full border p-1" placeholder="School" value={ed.school} onChange={(e) => updateEducation(idx, { school: e.target.value })} />
                <input className="w-full border p-1 mt-1" placeholder="Degree" value={ed.degree} onChange={(e) => updateEducation(idx, { degree: e.target.value })} />
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <input className="border p-1" placeholder="Start" value={ed.start || ''} onChange={(e) => updateEducation(idx, { start: e.target.value })} />
                  <input className="border p-1" placeholder="End" value={ed.end || ''} onChange={(e) => updateEducation(idx, { end: e.target.value })} />
                  <input className="border p-1" placeholder="Location" value={ed.location || ''} onChange={(e) => updateEducation(idx, { location: e.target.value })} />
                </div>
                <input className="w-full border p-1 mt-1" placeholder="GPA" value={ed.gpa || ''} onChange={(e) => updateEducation(idx, { gpa: e.target.value })} />
                <div className="mt-2 flex gap-2">
                  <button className="text-sm text-red-600" onClick={() => removeEducation(idx)}>Remove</button>
                </div>
              </div>
            ))}
            <button className="mt-2 px-3 py-1 bg-neutral-100" onClick={addEducation}>Add education</button>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Work Experience</h3>
          <button className="text-sm text-neutral-600" onClick={() => toggle('experience')}>{collapsed.experience ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.experience && (
          <>
            {local.experience.map((ex, idx) => (
          <div key={ex.id} className="border p-2 mt-2">
            <input className="w-full border p-1" placeholder="Company" value={ex.company} onChange={(e) => updateExperience(idx, { company: e.target.value })} />
            <input className="w-full border p-1 mt-1" placeholder="Title" value={ex.title} onChange={(e) => updateExperience(idx, { title: e.target.value })} />
            <div className="grid grid-cols-3 gap-2 mt-1">
              <input className="border p-1" placeholder="Start" value={ex.start || ''} onChange={(e) => updateExperience(idx, { start: e.target.value })} />
              <input className="border p-1" placeholder="End" value={ex.end || ''} onChange={(e) => updateExperience(idx, { end: e.target.value })} />
              <input className="border p-1" placeholder="Location" value={ex.location || ''} onChange={(e) => updateExperience(idx, { location: e.target.value })} />
            </div>
            <div className="mt-2">
              <label className="text-sm font-medium">Notes (Markdown)</label>
              <MarkdownEditor value={ex.notes || ''} onChange={(v) => updateExperience(idx, { notes: v })} />
            </div>
            <textarea className="w-full border p-1 mt-1" placeholder="Project links (comma separated)" value={(ex.projectLinks || []).join(', ')} onChange={(e) => updateExperience(idx, { projectLinks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            <div className="mt-2 flex gap-2">
              <button className="text-sm text-red-600" onClick={() => removeExperience(idx)}>Remove</button>
            </div>
          </div>
        ))}
        <button className="mt-2 px-3 py-1 bg-neutral-100" onClick={addExperience}>Add experience</button>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Projects</h3>
          <button className="text-sm text-neutral-600" onClick={() => toggle('projects')}>{collapsed.projects ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.projects && (
          <>
            {local.projects.map((p, idx) => (
          <div key={p.id} className="border p-2 mt-2">
            <input className="w-full border p-1" placeholder="Project title" value={p.title} onChange={(e) => updateProject(idx, { title: e.target.value })} />
            <div className="mt-2">
              <label className="text-sm font-medium">Description (Markdown)</label>
              <MarkdownEditor value={p.description || ''} onChange={(v) => updateProject(idx, { description: v })} />
            </div>
            <input className="w-full border p-1 mt-1" placeholder="Link" value={p.link} onChange={(e) => updateProject(idx, { link: e.target.value })} />
            <div className="mt-2 flex gap-2">
              <button className="text-sm text-red-600" onClick={() => removeProject(idx)}>Remove</button>
            </div>
          </div>
        ))}
        <button className="mt-2 px-3 py-1 bg-neutral-100" onClick={addProject}>Add project</button>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Technical Knowledge</h3>
          <button className="text-sm text-neutral-600" onClick={() => toggle('technical')}>{collapsed.technical ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.technical && (
          <textarea className="w-full border p-2 mt-2" placeholder="Comma separated tech list" value={local.technical || ''} onChange={(e) => {
            const next = { ...local, technical: e.target.value };
            setLocal(next);
            onChange(next);
          }} />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Other</h3>
          <button className="text-sm text-neutral-600" onClick={() => toggle('other')}>{collapsed.other ? 'Expand' : 'Collapse'}</button>
        </div>
        {!collapsed.other && (
          <div className="mt-2">
            <label className="text-sm font-medium">Personal Notes (Markdown)</label>
            <MarkdownEditor value={local.other || ''} onChange={(v) => {
              const next = { ...local, other: v };
              setLocal(next);
              onChange(next);
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
