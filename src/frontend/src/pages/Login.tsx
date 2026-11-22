import { useNavigate } from "@tanstack/react-router";
import { SignInOptions } from "../components/SignInOptions";
export default function Login() {
  const navigate = useNavigate();
  return <SignInOptions onClose={() => void navigate({ to: "/lobby" })} />;
}
export function LoginModal({ onClose }: { onClose: () => void }) {
  return <SignInOptions onClose={onClose} />;
}
