import LoginForm from "@/features/auth/LoginForm";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  // Redirect if already logged in or if it's a linked terminal
  useEffect(() => {
    if (localStorage.getItem("pinpos_user_id")) {
        navigate("/dashboard");
    } else if (localStorage.getItem("pinpos_terminal_store_id")) {
        navigate("/terminal");
    }
  }, [navigate]);

  return <LoginForm />;
}
