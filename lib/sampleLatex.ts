export const sampleLatex = String.raw`
% Minimal LaTeX resume template (MVP)
% Tip: later you can switch to a more complete template.

\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage{enumitem}
\setlist[itemize]{noitemsep, topsep=0pt}
\pagenumbering{gobble}

\begin{document}

{\LARGE Your Name}\\
Email | LinkedIn | GitHub\\

\section*{Summary}
%<BLOCK id="summary">
Motivated M.S. Data Science student with a software engineering background, building ML-driven products and scalable web apps.
%</BLOCK>

\section*{Skills}
%<BLOCK id="skills">
\textbf{Languages:} Python, TypeScript, SQL\\
\textbf{Frameworks:} Next.js, React, FastAPI\\
\textbf{Data/ML:} pandas, scikit-learn, PyTorch
%</BLOCK>

\section*{Experience}
\textbf{Software / Data Projects}\\
\begin{itemize}
%<BLOCK id="exp_project_bullets">
\item Built a full-stack analytics dashboard with role-based access and automated reporting.
\item Improved API latency by 30\% via caching and query optimization.
\item Integrated ML inference endpoints and logging for monitoring.
%</BLOCK>
\end{itemize}

\section*{Education}
Northeastern University, M.S. Data Science\\

\end{document}
`;
