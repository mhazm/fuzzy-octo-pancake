import { permanentRedirect } from "next/navigation";

export const metadata = {
  title: "Register",
};

export default function RegisterPage() {
  // Alihkan semua yang mengakses /register ke web karir
  permanentRedirect("https://career.nismara.web.id");
}
