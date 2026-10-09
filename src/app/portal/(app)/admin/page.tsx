import { redirect } from "next/navigation";

export default function AdminIndex() {
  redirect("/portal/admin/staff");
}
