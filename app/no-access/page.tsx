import { SignOutButton } from "@clerk/nextjs";

export default function NoAccess() {
  return (
    <div className="center">
      <div className="panel pad stack" style={{ maxWidth: 420 }}>
        <h2>This account doesn&apos;t have access</h2>
        <p className="muted">Sign in with your company email, or ask your administrator to add you.</p>
        <SignOutButton>
          <button className="btn">Sign out</button>
        </SignOutButton>
      </div>
    </div>
  );
}
