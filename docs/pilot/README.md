# First Managed-Service Pilot

This pack turns the first The Admin Department pilot into a controlled, measurable 14-day operating engagement inside DueToday.

## Pilot objective

Prove that TAD can install and operate one **Sales Admin / quote-follow-up workflow** for a real service business using protected real records, human approvals and measurable before/after evidence.

This is not a demo and not a simulated validation exercise. The client must consent to the pilot and authorise the use of the records supplied.

## Scope

Use one business, one workflow and one active workspace.

Minimum starting conditions:

- 10–30 active leads, enquiries or open quotes;
- one client owner or manager who can make decisions;
- one named TAD operator;
- authority to use the supplied records;
- no special-category personal information;
- no automatic external messaging, payments or account changes.

## Operating sequence

1. **Qualify the business** using `01-client-selection-and-consent.md`.
2. **Capture the baseline** in `02-baseline-endline-scorecard.csv`.
3. **Prepare the records** using `03-sales-admin-import-template.csv` and its data dictionary.
4. **Create the managed workspace** and install the Sales Admin workflow.
5. **Assign every active record** an owner, next action and due date.
6. **Run the operator queue every business day** and record work in `05-daily-operator-log.csv`.
7. **Record real outcomes** in DueToday for every completed action.
8. **Route decisions through the Service Desk**; never bypass an approval by marking its action complete.
9. **Review the service weekly** using `06-weekly-client-review.md`.
10. **Capture the endline and commercial decision** using `07-pilot-closeout.md`.

## Roles

### Client owner or manager

- authorises the records and users;
- decides approvals;
- responds to weekly reports;
- confirms whether the service should continue, change or stop.

### TAD operator

- cleans and imports records;
- runs the daily queue;
- prepares follow-ups;
- records outcomes and next dates;
- escalates blockers and decisions;
- logs time and exceptions.

### Founder / pilot lead

- protects the pilot boundary;
- reviews data quality and permissions;
- measures baseline and endline;
- fixes only blockers observed in real use;
- records commercial evidence without exaggeration.

## Daily operating standard

Every open record should have:

- a responsible owner;
- a specific next action;
- a due date;
- a current status;
- the latest real outcome;
- a clear blocker when progress is not possible.

A completed action must record what happened. `Done` without an outcome is not sufficient evidence.

## Pass criteria

The pilot passes only when all of the following are true:

- at least 10 real records are loaded;
- at least 80% of active records have owner, next action and due date by day 3;
- at least 10 real action outcomes are recorded;
- no client approval is bypassed;
- two weekly reports are generated and reviewed;
- the client submits a continue/change/stop response;
- at least one baseline metric improves;
- operator time is measured;
- the client gives a clear willingness-to-pay answer.

## Stop conditions

Stop and document the reason when:

- authority to use the data cannot be confirmed;
- the records contain data that should not be processed in this pilot;
- the client repeatedly fails to make required decisions;
- most work must be performed outside DueToday;
- the workflow cannot be measured consistently;
- the client withdraws consent.

## Build rule

Do not add broad features during the pilot. Fix only defects or missing controls that prevent the real workflow from being operated safely. Every requested change must reference an observed pilot record, exception or repeated operator cost.

## Evidence produced

The completed pilot must leave behind:

- signed/confirmed consent and scope;
- anonymised baseline and endline metrics;
- import-quality record set;
- daily operator time log;
- list of exceptions and blockers;
- two weekly reports;
- client continue/change/stop response;
- willingness-to-pay decision;
- ranked product changes tied to observed frequency and commercial impact.
