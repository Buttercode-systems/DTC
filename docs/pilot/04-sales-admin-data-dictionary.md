# Sales Admin Import Data Dictionary

Use `03-sales-admin-import-template.csv` to prepare 10–30 active leads, enquiries or open quotes before loading them into DueToday.

## Required fields

| Field | Rule |
|---|---|
| `record_type` | `lead` or `quote` |
| `external_reference` | Stable reference from the client's current system or spreadsheet |
| `customer_name` | Customer or business name used operationally |
| `service_requested` | Short description of the requested service |
| `received_date` | ISO date: `YYYY-MM-DD` |
| `current_status` | Current real status, not the desired future status |
| `assigned_owner` | Person responsible for the next step |
| `next_action` | Specific observable action, such as `Call to confirm scope` |
| `next_action_due` | ISO date: `YYYY-MM-DD` |
| `source` | Where the record came from, such as website, referral or phone |

## Conditionally required

| Field | Required when |
|---|---|
| `contact_name` | The customer is a business or there is a named decision-maker |
| `email` or `phone` | At least one authorised contact method is needed for follow-up |
| `quote_date` | `record_type` is `quote` |
| `quote_value` | A quote value exists |
| `currency` | `quote_value` is populated; use `ZAR` unless the real quote uses another currency |
| `last_contact_date` | Contact has already occurred |
| `last_contact_outcome` | `last_contact_date` is populated |
| `blocked_reason` | The record cannot progress |

## Quality rules

1. One row represents one operational lead or quote.
2. Do not paste email threads or WhatsApp histories into `notes`.
3. Keep notes limited to facts required for the next action.
4. Dates must use `YYYY-MM-DD`.
5. `quote_value` must contain numbers only, with no currency symbol.
6. Duplicate references must be resolved before import.
7. Closed, won or lost records may be included only when needed to establish the baseline; they must not enter the active queue.
8. Every active row must have an owner, next action and due date before day 3 of the pilot.
9. Remove passwords, banking information, identity documents and sensitive personal information.
10. The client must confirm any correction that materially changes a quote or customer commitment.

## Suggested status mapping

| Client wording | Pilot status |
|---|---|
| New / Unread | New |
| Contacted / Replied | Contacted |
| Needs quote | Quote required |
| Quote sent | Quote sent |
| Waiting / Thinking | Follow-up |
| Accepted | Won |
| Declined / Cancelled | Lost |
| Cannot proceed | Blocked |

Do not force a mapping that changes the meaning of the client's real workflow. Record exceptions in the operator log.
