"use client";

import { useEffect, useState } from "react";

export function ConnectionBadge() {
  const [provider, setProvider] = useState("postgresql");

  useEffect(() => {
    fetch("/api/acaraje/schemas")
      .then((r) => r.json())
      .then((d) => {
        if (d.datasource?.provider) setProvider(d.datasource.provider);
      })
      .catch(() => {});
  }, []);

  return <span>CONNECTED · {provider}</span>;
}
