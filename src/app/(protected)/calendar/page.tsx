import { redirect } from "next/navigation";

// El calendario antiguo se sustituyó por /dias (Días clave).
export default function CalendarPage() {
  redirect("/dias");
}
