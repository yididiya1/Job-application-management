"use client";

import { useState } from "react";
import ResumeForm, { ResumeData } from "./ResumeForm";
import ResumePDFBuilder from "./ResumePDFBuilder";

const initialData: ResumeData = {
  header: { name: "Yididiya Kebede Aga", email: "yididiyakebede@gmail.com", phone: "+1-207-408-2261", location: "Portland, ME (willing to relocate)", linkedin: "linkedin.com/in/yididiya-kebede", github: "github.com/yididiya1" },
  education: [
    { id: "1", school: "Northeastern University, Portland, ME", degree: "Candidate for Master of Science in Data Science", start: "Sep. 2025", end: "June 2027", location: "Portland, ME", gpa: "4.0" },
    { id: "2", school: "Addis Ababa University", degree: "Bachelor of Science in Software Engineering", start: "Sep. 2017", end: "June 2022", location: "Addis Ababa, ET", gpa: "" }
  ],
  experience: [
    { id: "1", company: "Hydrus.ai", title: "Front-end Developer", start: "Jan 2025", end: "July 2025", location: "Remote (San Francisco, CA)", notes: "- Built real-time carbon-emissions analytics and reporting dashboards using React.js + Redux\n- Improved ESG reporting workflows by reducing latency and boosting throughput by 30%", projectLinks: ["Project Link"] },
    { id: "2", company: "Africa to Silicon Valley", title: "Software Engineer", start: "Feb 2023", end: "Dec 2024", location: "Palo Alto, CA", notes: "- Built AI learning platform with personalized paths and adaptive quizzes\n- Onboarded 2,000 students in 8 weeks and increased engagement by 50%", projectLinks: ["Project 1 Link", "Project 2 Link"] }
  ],
  projects: [
    { id: "p1", title: "Subscriber Analytics for Maine Trust for Local News", description: "End-to-end ML pipeline to build subscriber churn models and visualizations.", link: "" }
  ],
  technical: "Python, JavaScript (ES6+), TypeScript, React, Next.js, FastAPI, Node.js, PostgreSQL, Redis, Docker, GCP, Machine Learning (scikit-learn, TensorFlow, PyTorch)",
  other: ""
};

export default function ResumeManager() {
  const [data, setData] = useState<ResumeData>(initialData);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      <div className="w-1/2 overflow-auto rounded-lg border border-neutral-200 bg-white">
        <ResumeForm data={data} onChange={(d) => setData(d)} />
      </div>

      <div className="w-1/2 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50">
        <ResumePDFBuilder data={data} />
      </div>
    </div>
  );
}
