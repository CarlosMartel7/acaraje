import { useEffect, useState } from "react";

export default function AcarajeCalls_dashboard() {
  const [stats, setStats] = useState<Dashboard.DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/acaraje/stats")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? r.statusText);
        return data;
      })
      .then((d) => setStats(d))
      .catch((err) => {
        console.error(err);
        setStats(null);
      });
  }, []);

  return { stats };
}
