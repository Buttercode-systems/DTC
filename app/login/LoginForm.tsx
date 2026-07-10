export function LoginForm({
  next,
  error,
}: {
  next: string;
  error?: string;
}) {
  return (
    <form action="/auth/signin" method="post" className="mt-6 space-y-3">
      <input type="hidden" name="next" value={next} />
      <input name="email" type="email" required className="field" placeholder="Email" />
      <input name="password" type="password" required className="field" placeholder="Password" />
      {error && <p className="text-stuck text-sm">{error}</p>}
      <button className="btn-primary w-full">Sign in</button>
    </form>
  );
}
