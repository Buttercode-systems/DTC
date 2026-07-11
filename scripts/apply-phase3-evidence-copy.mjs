import { readFileSync, writeFileSync } from 'node:fs';

function replace(path, from, to, label) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Missing Phase 3 patch target: ${label}`);
  writeFileSync(path, source.replace(from, to));
}

replace(
  'app/assessment/AssessmentFlow.tsx',
  `          <h1 className="font-display text-2xl leading-tight">\n            Two things about your business, then we start.\n          </h1>`,
  `          <h1 className="font-display text-2xl leading-tight">\n            Two things about your business, then we start.\n          </h1>\n          <div className="mt-5 border border-rule bg-card p-4 text-sm text-faint leading-6">\n            <p className="font-semibold text-ink">Answer what actually happens in a normal week.</p>\n            <p className="mt-1">Use recent records where possible — not the policy, intention or software capability. If something is unknown, choose the closest conservative answer and verify it in the report.</p>\n          </div>`,
  'assessment evidence instruction'
);
replace(
  'app/assessment/AssessmentFlow.tsx',
  `placeholder="Email — your report link goes here"`,
  `placeholder="Email — used to identify your private report"`,
  'assessment email promise'
);
replace(
  'app/assessment/AssessmentFlow.tsx',
  `              Free. No card. Your answers stay yours.`,
  `              Your report opens immediately. Save or print the PDF. No card.`,
  'assessment report delivery note'
);
replace(
  'app/assessment/AssessmentFlow.tsx',
  `      <p className="mt-1 text-faint text-sm">{job.question}</p>`,
  `      <p className="mt-1 text-faint text-sm">{job.question}</p>\n      <p className="mt-3 border-l-2 border-ledger pl-3 text-xs text-faint">Choose the closest answer you could defend with recent records.</p>`,
  'job evidence reminder'
);

replace(
  'components/AssessmentReport.tsx',
  `      <section className="report-section">\n        <p className="eyebrow mb-1">Your first Today list</p>`,
  `      <section className="report-section">\n        <p className="eyebrow mb-1">Validate the diagnosis</p>\n        <h2 className="font-display text-2xl">Check the report against real work before changing the system</h2>\n        <div className="mt-5 grid gap-px bg-rule border border-rule sm:grid-cols-2">\n          {[\n            ["Pull a small sample", "Use 10 recent leads, quotes, jobs, invoices or admin items — never confidential data in a public tool."],\n            ["Check ownership and dates", "Confirm whether each open item really has one owner, a next action and a due date."],\n            ["Mark what was assumed", "Separate what the records prove from what was guessed or is still unknown."],\n            ["Take one baseline", "Record one current measure — response age, quote age, payment age or blocked-item count — before the fix."],\n          ].map(([title, detail]) => (\n            <div key={title} className="break-inside-avoid bg-card p-4">\n              <p className="font-semibold text-sm">{title}</p>\n              <p className="mt-1 text-sm text-faint">{detail}</p>\n            </div>\n          ))}\n        </div>\n      </section>\n\n      <section className="report-section">\n        <p className="eyebrow mb-1">Your first Today list</p>`,
  'report validation checklist'
);
replace(
  'components/AssessmentReport.tsx',
  `        Business Execution Framework v1.0 · This report is private. Share it only\n        with people you want to see it.`,
  `        Business Execution Framework v1.0 · This report reflects the answers supplied; it is not an independent audit. Keep it private and share it only with people you want to see it.`,
  'report evidence disclaimer'
);

console.log('Phase 3 evidence-copy improvements applied.');
