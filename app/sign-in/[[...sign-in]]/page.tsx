import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="center">
      <div className="stack" style={{ alignItems: "center" }}>
        <div className="logo">
          <img src="/icon.png" alt="" />
          <b>Lumber<span>Offer</span></b>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
