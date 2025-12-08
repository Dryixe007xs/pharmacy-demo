// app/page.tsx

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="text-center p-10">
      <h1 className="text-3xl font-bold mb-4">Welcome to Pharmacy Workload System</h1>
      <p className="mb-6">Please set up your password or log in to continue.</p>
      
      <div className="space-x-4">
        <Link href="/auth/register" className="text-blue-500 hover:underline">
          Set Password
        </Link>
        <Link href="/auth/login" className="text-green-500 hover:underline">
          Log In
        </Link>
      </div>
    </div>
  );
}