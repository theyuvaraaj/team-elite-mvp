import { useMemo, useState, type FormEvent } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { ApiError } from "../../lib/api";
import { AdminNav } from "./AdminNav";
import {
  useAdminCandidates,
  useAdminEmployees,
  useAdminUserMutations,
  type AdminEmployee,
  type CandidateInput,
  type EmployeeInput,
} from "./adminApi";
import type { EmployeeCandidate } from "../employee/employeeApi";

type UserType = "candidates" | "employees";
type Editor =
  | { type: "candidate"; record?: EmployeeCandidate }
  | { type: "employee"; record?: AdminEmployee };
type DisableTarget =
  | { type: "candidate"; id: string; name: string }
  | { type: "employee"; id: string; name: string };

const fieldClass =
  "mt-2 h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/15";

function optionalFields(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => Boolean(value)),
  );
}

function UserEditor({
  editor,
  pending,
  onClose,
  onSaveCandidate,
  onSaveEmployee,
}: {
  editor: Editor;
  pending: boolean;
  onClose: () => void;
  onSaveCandidate: (input: CandidateInput) => Promise<void>;
  onSaveEmployee: (input: EmployeeInput) => Promise<void>;
}) {
  const candidate = editor.type === "candidate" ? editor.record : undefined;
  const employee = editor.type === "employee" ? editor.record : undefined;
  const [name, setName] = useState(candidate?.user.name ?? employee?.user.name ?? "");
  const [email, setEmail] = useState(candidate?.user.email ?? employee?.user.email ?? "");
  const [employeeCode, setEmployeeCode] = useState(employee?.employeeCode ?? "");
  const [contactEmail, setContactEmail] = useState(candidate?.email ?? "");
  const [phone, setPhone] = useState(candidate?.phone ?? "");
  const [primaryRole, setPrimaryRole] = useState(candidate?.primaryRole ?? "");
  const [experience, setExperience] = useState(candidate?.experience ?? "");
  const [gender, setGender] = useState(candidate?.gender ?? "");
  const [address, setAddress] = useState(candidate?.address ?? "");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (editor.type === "employee") {
        await onSaveEmployee({
          name: name.trim(),
          email: email.trim(),
          employeeCode: employeeCode.trim(),
        });
      } else {
        await onSaveCandidate({
          name: name.trim(),
          email: email.trim(),
          ...optionalFields({ contactEmail, phone, primaryRole, experience, gender, address }),
        });
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The user could not be saved.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="user-editor-title" className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 id="user-editor-title" className="text-xl font-semibold">
          {editor.record ? "Edit" : "Invite"} {editor.type}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {editor.record ? "Update account and profile details." : "An invitation email will be sent after creation."}
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">Name<input required autoFocus value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-medium">Login email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} /></label>
          </div>
          {editor.type === "employee" ? (
            <label className="block text-sm font-medium">Employee code<input required value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} className={fieldClass} /></label>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium">Contact email<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className={fieldClass} /></label>
                <label className="text-sm font-medium">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} /></label>
                <label className="text-sm font-medium">Primary role<input value={primaryRole} onChange={(event) => setPrimaryRole(event.target.value)} className={fieldClass} /></label>
                <label className="text-sm font-medium">Experience<input value={experience} onChange={(event) => setExperience(event.target.value)} className={fieldClass} /></label>
                <label className="text-sm font-medium">Gender<input value={gender} onChange={(event) => setGender(event.target.value)} className={fieldClass} /></label>
                <label className="text-sm font-medium">Address<input value={address} onChange={(event) => setAddress(event.target.value)} className={fieldClass} /></label>
              </div>
            </>
          )}
          {error ? <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <button type="button" onClick={onClose} disabled={pending} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={pending} className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-strong disabled:opacity-60">
              {pending ? "Saving…" : editor.record ? "Save changes" : "Create and invite"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function AdminUsersPage() {
  const [type, setType] = useState<UserType>("candidates");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [disableTarget, setDisableTarget] = useState<DisableTarget | null>(null);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const candidatesQuery = useAdminCandidates();
  const employeesQuery = useAdminEmployees();
  const mutations = useAdminUserMutations();
  const query = search.trim().toLowerCase();
  const candidates = useMemo(
    () => (candidatesQuery.data?.candidates ?? []).filter((record) =>
      [record.user.name, record.user.email, record.primaryRole, record.phone].filter(Boolean).some((value) => value!.toLowerCase().includes(query))),
    [candidatesQuery.data?.candidates, query],
  );
  const employees = useMemo(
    () => (employeesQuery.data?.employees ?? []).filter((record) =>
      [record.user.name, record.user.email, record.employeeCode].some((value) => value.toLowerCase().includes(query))),
    [employeesQuery.data?.employees, query],
  );

  async function resetPassword(
    record: EmployeeCandidate | AdminEmployee,
    userType: "candidate" | "employee",
  ) {
    setMessage("");
    setActionError("");
    try {
      if (userType === "candidate") {
        await mutations.resetCandidatePassword.mutateAsync(record.id);
      } else {
        await mutations.resetEmployeePassword.mutateAsync(record.id);
      }
      setMessage(`Password reset email sent to ${record.user.email}.`);
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "The reset email could not be sent.");
    }
  }

  async function disableUser() {
    if (!disableTarget) return;
    setActionError("");
    try {
      if (disableTarget.type === "candidate") await mutations.disableCandidate.mutateAsync(disableTarget.id);
      else await mutations.disableEmployee.mutateAsync(disableTarget.id);
      setDisableTarget(null);
      setMessage(`${disableTarget.name} was disabled.`);
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "The user could not be disabled.");
      setDisableTarget(null);
    }
  }

  const loading = type === "candidates" ? candidatesQuery.isPending : employeesQuery.isPending;
  const failed = type === "candidates" ? candidatesQuery.isError : employeesQuery.isError;
  const pendingSave =
    mutations.createCandidate.isPending || mutations.updateCandidate.isPending ||
    mutations.createEmployee.isPending || mutations.updateEmployee.isPending;

  return (
    <AppShell title="Users" description="Invite and manage candidate and employee access.">
      <AdminNav />
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex rounded-lg border border-border bg-surface p-1">
          {(["candidates", "employees"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setType(value)} className={`rounded-md px-4 py-2 text-sm font-semibold capitalize ${type === value ? "bg-muted text-foreground" : "text-muted-foreground"}`}>{value}</button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${type}…`} className="h-10 rounded-lg border border-border bg-surface px-3.5 text-sm outline-none focus:border-accent focus:ring-3 focus:ring-accent/15 sm:w-64" />
          <button type="button" onClick={() => setEditor({ type: type === "candidates" ? "candidate" : "employee" })} className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-strong">+ Invite {type === "candidates" ? "candidate" : "employee"}</button>
        </div>
      </div>
      {message ? <p role="status" className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{message}</p> : null}
      {actionError ? <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{actionError}</p> : null}
      <div className="data-table-wrap">
        {loading ? (
          <div className="grid gap-3 p-5">{[1, 2, 3].map((row) => <div key={row} className="h-14 animate-pulse rounded bg-muted" />)}</div>
        ) : failed ? (
          <p role="alert" className="p-8 text-center text-danger">Users could not be loaded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-border bg-muted/45 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                {["Name", "Email", type === "candidates" ? "Primary role" : "Employee code", "Status", "Actions"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}
              </tr></thead>
              <tbody>
                {type === "candidates" ? candidates.map((record) => (
                  <tr key={record.id} className="border-b border-border/70 last:border-0">
                    <td className="px-5 py-4 font-semibold">{record.user.name}</td><td className="px-5 py-4 text-muted-foreground">{record.user.email}</td><td className="px-5 py-4 text-muted-foreground">{record.primaryRole || "—"}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.user.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{record.user.isActive ? "Active" : "Disabled"}</span></td>
                    <td className="whitespace-nowrap px-5 py-4"><button onClick={() => setEditor({ type: "candidate", record })} className="font-semibold text-accent hover:underline">Edit</button><button onClick={() => void resetPassword(record, "candidate")} className="ml-3 font-semibold text-accent hover:underline">Reset password / Resend invite</button>{record.user.isActive ? <button onClick={() => setDisableTarget({ type: "candidate", id: record.id, name: record.user.name })} className="ml-3 font-semibold text-danger hover:underline">Disable</button> : null}</td>
                  </tr>
                )) : employees.map((record) => (
                  <tr key={record.id} className="border-b border-border/70 last:border-0">
                    <td className="px-5 py-4 font-semibold">{record.user.name}</td><td className="px-5 py-4 text-muted-foreground">{record.user.email}</td><td className="px-5 py-4 text-muted-foreground">{record.employeeCode}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.user.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{record.user.isActive ? "Active" : "Disabled"}</span></td>
                    <td className="whitespace-nowrap px-5 py-4"><button onClick={() => setEditor({ type: "employee", record })} className="font-semibold text-accent hover:underline">Edit</button><button onClick={() => void resetPassword(record, "employee")} className="ml-3 font-semibold text-accent hover:underline">Reset password</button>{record.user.isActive ? <button onClick={() => setDisableTarget({ type: "employee", id: record.id, name: record.user.name })} className="ml-3 font-semibold text-danger hover:underline">Disable</button> : null}</td>
                  </tr>
                ))}
                {(type === "candidates" ? candidates : employees).length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">No matching {type}.</td></tr> : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editor ? (
        <UserEditor
          editor={editor}
          pending={pendingSave}
          onClose={() => setEditor(null)}
          onSaveCandidate={async (input) => {
            if (editor.type !== "candidate") return;
            if (editor.record) await mutations.updateCandidate.mutateAsync({ id: editor.record.id, input });
            else await mutations.createCandidate.mutateAsync(input);
            setEditor(null);
          }}
          onSaveEmployee={async (input) => {
            if (editor.type !== "employee") return;
            if (editor.record) await mutations.updateEmployee.mutateAsync({ id: editor.record.id, input });
            else await mutations.createEmployee.mutateAsync(input);
            setEditor(null);
          }}
        />
      ) : null}
      {disableTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="disable-title" className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h2 id="disable-title" className="text-xl font-semibold">Disable user?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{disableTarget.name} will no longer be able to sign in. This API does not currently support re-enabling accounts.</p>
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setDisableTarget(null)} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Cancel</button><button onClick={() => void disableUser()} disabled={mutations.disableCandidate.isPending || mutations.disableEmployee.isPending} className="h-10 rounded-lg bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50">Disable</button></div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
