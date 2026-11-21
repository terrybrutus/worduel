import { useNavigate } from "@tanstack/react-router";
import { AppButton } from "../components/AppButton";
function GuestAccess({ onClose }: { onClose: () => void }) {
  return <section className="mx-auto max-w-md space-y-4 p-6">
    <h1 className="text-2xl font-bold">Worduel</h1>
    <p className="text-sm text-muted-foreground">Account sign-in is on hold during testing. You can play, save words, and review as a guest.</p>
    <AppButton className="btn-primary min-h-11 px-4" onClick={onClose}>Continue playing</AppButton>
  </section>;
}
export default function Login() {
  const navigate = useNavigate();
  return <GuestAccess onClose={() => void navigate({to:"/lobby"})} />;
}
export function LoginModal({onClose}:{onClose:()=>void}) { return <GuestAccess onClose={onClose} />; }
