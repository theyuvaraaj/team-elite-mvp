import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError, api } from "../../lib/api";
import { roleHomePath } from "../../app/paths";
import { useAuth, type UserRole } from "./useAuth";

interface ProfileDetails {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  gender?: string | null;
  address?: string | null;
  primaryRole?: string | null;
  experience?: string | null;
  contactEmail?: string | null;
  employeeCode?: string | null;
}

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [primaryRole, setPrimaryRole] = useState("");
  const [experience, setExperience] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api<ProfileDetails>("/api/auth/profile");
        if (cancelled) return;
        setProfile(data);
        setName(data.name);
        setPhone(data.phone ?? "");
        setGender(data.gender ?? "");
        setAddress(data.address ?? "");
        setPrimaryRole(data.primaryRole ?? "");
        setExperience(data.experience ?? "");
        setContactEmail(data.contactEmail ?? "");
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Unable to load profile.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api<ProfileDetails>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          ...(user?.role === "CANDIDATE"
            ? {
                phone,
                gender,
                address,
                primaryRole,
                experience,
                contactEmail,
              }
            : {}),
        }),
      });
      setProfile(updated);
      setSuccess("Profile updated.");
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to save profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const home = user ? roleHomePath(user.role) : "/";

  return (
    <AppShell
      title="Edit profile"
      description="Update how you appear in Team Elite Portal."
    >
      <div className="mx-auto max-w-5xl">
        <Link
          to={home}
          className="mb-6 inline-flex font-mono text-[11px] uppercase tracking-[0.1em] text-brand hover:underline"
        >
          ← Back to dashboard
        </Link>

        {loading ? (
          <div className="h-64 animate-pulse rounded-[6px] bg-muted" />
        ) : error && !profile ? (
          <div
            role="alert"
            className="rounded-[6px] border border-danger/25 bg-danger/5 p-6 text-sm text-danger"
          >
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-8">
            <aside className="h-max rounded-[6px] border border-border bg-surface p-6 lg:sticky lg:top-24">
              <span
                aria-hidden="true"
                className="mb-4 grid size-11 place-items-center rounded-[5px] bg-accent font-mono text-sm font-semibold text-accent-foreground"
              >
                {(name || profile?.name || "").slice(0, 2).toUpperCase()}
              </span>
              <p className="text-base font-semibold text-foreground">
                {name || profile?.name}
              </p>
              <p className="eyebrow mt-1.5">{profile?.role.toLowerCase()}</p>

              <dl className="mt-5 grid gap-3 border-t border-border pt-5">
                <div>
                  <dt className="eyebrow">Login email</dt>
                  <dd className="mt-1 break-all font-mono text-[12px] text-muted-foreground">
                    {profile?.email}
                  </dd>
                </div>
                {profile?.employeeCode ? (
                  <div>
                    <dt className="eyebrow">Employee code</dt>
                    <dd className="mt-1 font-mono text-[12px] text-muted-foreground">
                      {profile.employeeCode}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                Changes apply everywhere you appear across Team Elite Portal.
              </p>
            </aside>

            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="grid h-max gap-6 rounded-[6px] border border-border bg-surface p-6 sm:p-7"
            >
              <Input
                label="Display name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              {user?.role === "CANDIDATE" ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="Contact email"
                      name="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                    />
                    <Input
                      label="Phone"
                      name="phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="Gender"
                      name="gender"
                      value={gender}
                      onChange={(event) => setGender(event.target.value)}
                    />
                    <Input
                      label="Primary role"
                      name="primaryRole"
                      value={primaryRole}
                      onChange={(event) => setPrimaryRole(event.target.value)}
                    />
                  </div>
                  <Input
                    label="Experience"
                    name="experience"
                    value={experience}
                    onChange={(event) => setExperience(event.target.value)}
                  />
                  <label className="grid gap-2 text-sm font-medium">
                    Address
                    <textarea
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      rows={3}
                      className="rounded-[4px] border border-border bg-surface px-3.5 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/18"
                    />
                  </label>
                </>
              ) : null}

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p role="status" className="text-sm text-success">
                  {success}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Link
                  to={home}
                  className="inline-flex h-11 items-center rounded-[4px] border border-border px-4 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
