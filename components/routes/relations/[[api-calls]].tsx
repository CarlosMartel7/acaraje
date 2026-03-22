import { useState, useEffect } from "react";

export default function AcarajeCalls_relations() {
  const [data, setData] = useState<{ relations: Relations.Relation[] } | null>(null);
  const allRelations = data?.relations || [];

  useEffect(() => {
    fetch("/api/acaraje/relations")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return {
    allRelations,
  };
}
