"use client";

import { useEffect, useState } from "react";

export default function AcarajeCalls_crudOverview() {
  const [models, setModels] = useState<Dashboard.DashboardStats["modelsOverview"] | null>(null);

  useEffect(() => {
    fetch("/api/acaraje/stats")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? r.statusText);
        return data as Dashboard.DashboardStats;
      })
      .then((d) => setModels(d.modelsOverview))
      .catch((err) => {
        console.error(err);
        setModels([]);
      });
  }, []);

  return { models };
}
