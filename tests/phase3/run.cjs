const assert = require('node:assert/strict');
const { JOBS, DIMENSIONS } = require('../../.phase3-build/lib/framework.js');
const { answerKey, scoreAssessment } = require('../../.phase3-build/lib/scoring.js');

function answersFromJobScores(jobScores) {
  const answers = {};
  for (const job of JOBS) {
    const value = jobScores[job.key];
    assert.ok([0, 25, 50, 75, 100].includes(value), `fixture score missing for ${job.key}`);
    for (const dimension of DIMENSIONS) {
      answers[answerKey(job.key, dimension.key)] = value;
    }
  }
  return answers;
}

function result(profile) {
  return scoreAssessment(answersFromJobScores(profile.scores), profile.industry);
}

const cases = {
  stuttaford: {
    industry: 'services',
    evidence: 'Published quote, survey, coordinator, inventory, reporting and supplier-control workflows.',
    unknown: 'Internal debtor routines and actual day-to-day compliance are not public.',
    scores: { acquire: 75, convert: 75, deliver: 100, collect: 50, control: 100, improve: 75, lead: 100 }
  },
  rentokil: {
    industry: 'services',
    evidence: 'Published survey, written risk, recurring service, account ownership and reporting workflows.',
    unknown: 'Internal collections and staff adherence are not public.',
    scores: { acquire: 75, convert: 75, deliver: 100, collect: 50, control: 100, improve: 75, lead: 75 }
  },
  trafalgar: {
    industry: 'property',
    evidence: 'Published property, finance, reporting, portal and consultation workflows.',
    unknown: 'Internal request ageing and approval performance are not public.',
    scores: { acquire: 75, convert: 75, deliver: 75, collect: 50, control: 100, improve: 75, lead: 100 }
  },
  zone: {
    industry: 'other',
    evidence: 'Published joining, membership, debit-order, cancellation and timetable workflows.',
    unknown: 'Actual member-risk follow-up, reporting and owner visibility are not public.',
    scores: { acquire: 75, convert: 50, deliver: 75, collect: 50, control: 50, improve: 50, lead: 50 }
  },
  sorbet: {
    industry: 'retail',
    evidence: 'Published booking, reminders, staff choice, loyalty and service-recovery workflows.',
    unknown: 'Internal reporting, collections and daily priority controls are not public.',
    scores: { acquire: 100, convert: 75, deliver: 100, collect: 50, control: 75, improve: 75, lead: 50 }
  }
};

for (const [name, profile] of Object.entries(cases)) {
  const scored = result(profile);
  assert.ok(scored.overall >= 0 && scored.overall <= 100, `${name}: overall is bounded`);
  assert.equal(scored.jobs.length, 7, `${name}: all seven jobs are scored`);
  assert.ok(scored.starterActions.length > 0, `${name}: a first Today list is generated`);
}

const stuttaford = result(cases.stuttaford);
for (const key of ['deliver', 'control', 'lead']) {
  assert.equal(stuttaford.jobs.find((job) => job.job === key).momentum, 'moving', `Stuttaford-like ${key} evidence stays moving`);
}

const rentokil = result(cases.rentokil);
assert.equal(rentokil.jobs.find((job) => job.job === 'deliver').momentum, 'moving', 'Rentokil-like service delivery stays moving');
assert.equal(rentokil.jobs.find((job) => job.job === 'control').momentum, 'moving', 'Rentokil-like documentation control stays moving');

const trafalgar = result(cases.trafalgar);
assert.equal(trafalgar.jobs.find((job) => job.job === 'control').momentum, 'moving', 'Trafalgar-like property control stays moving');
assert.equal(trafalgar.jobs.find((job) => job.job === 'lead').momentum, 'moving', 'Trafalgar-like reporting visibility stays moving');

const zone = result(cases.zone);
assert.ok(zone.bottlenecks.some((item) => item.job === 'convert'), 'Zone-like membership conversion uncertainty surfaces');
assert.ok(zone.bottlenecks.some((item) => item.job === 'lead'), 'Zone-like owner-visibility uncertainty surfaces');

const sorbet = result(cases.sorbet);
assert.equal(sorbet.jobs.find((job) => job.job === 'acquire').momentum, 'moving', 'Sorbet-like booking intake stays moving');
assert.equal(sorbet.jobs.find((job) => job.job === 'deliver').momentum, 'moving', 'Sorbet-like service delivery stays moving');

console.log('Phase 3 public-evidence workflow validation passed for five real-business anchors.');
