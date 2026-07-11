export type ClientServiceResponse = {
  id: string;
  business_id: string;
  business_name: string;
  period_start: string;
  period_end: string;
  client_response: "continue" | "change" | "stop";
  client_response_note: string | null;
  client_responded_at: string;
};

export function ClientResponseSection({ responses }: { responses: ClientServiceResponse[] }) {
  return (
    <section id="client-responses" className="space-y-5 border-t border-rule pt-8">
      <div>
        <p className="eyebrow">Client review decisions</p>
        <h2 className="mt-1 font-display text-3xl">Continue, change or stop</h2>
        <p className="mt-2 max-w-3xl text-faint">
          These are the client’s recorded decisions on completed service periods. Change and stop responses should be reviewed before the next cycle is run.
        </p>
      </div>

      {responses.length === 0 ? (
        <div className="border border-dashed border-rule bg-card/40 p-8 text-center">
          <h3 className="font-display text-2xl">No client review response yet.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-faint">
            Responses appear after a client reviews a weekly report in the Service Desk.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {responses.map((response) => (
            <article key={response.id} className="border border-rule bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{response.period_start} — {response.period_end}</p>
                  <h3 className="mt-1 font-display text-2xl">{response.business_name}</h3>
                </div>
                <span className="border border-ledger/40 bg-ledger/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ledger">
                  {response.client_response}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-faint">
                {response.client_response_note || "No additional client note was supplied."}
              </p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-faint">
                Responded {new Date(response.client_responded_at).toLocaleString("en-ZA")}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
