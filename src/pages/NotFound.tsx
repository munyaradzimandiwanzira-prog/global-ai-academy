import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container flex min-h-[55vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-6xl font-bold text-gold">404</p>
      <h1 className="mt-4 text-3xl font-bold">This page wandered off</h1>
      <p className="mt-2 max-w-md text-muted-fg">The link may be old or mistyped. Search for a lesson, or head back to the tutorials.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">Home</Link>
        <Link to="/tutorials" className="btn-outline">All tutorials</Link>
      </div>
    </div>
  );
}
