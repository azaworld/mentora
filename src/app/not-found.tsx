import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
      <h2>Page not found</h2>
      <p className="muted">The page may have moved, or the profile is not public yet.</p>
      <Link className="btn btn-primary" href="/">Back to Mentora</Link>
    </div>
  );
}
