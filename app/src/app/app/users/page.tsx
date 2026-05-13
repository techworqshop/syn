import { redirect } from "next/navigation";

export default function OldUsersRedirect() {
  redirect("/app/admin/users");
}
