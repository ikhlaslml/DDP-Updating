type FamilyMemberOrderInput = {
  status_dalam_keluarga?: string | null;
  nama?: string | null;
  nik?: string | null;
  id?: string | null;
};

const collator = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" });

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

/**
 * Urutan operasional anggota dalam satu KK. Nilai hubungan keluarga tetap
 * disimpan apa adanya; peringkat ini hanya dipakai saat menampilkan data.
 */
export function familyRelationshipRank(value: string | null | undefined) {
  switch (normalized(value)) {
    case "kepala keluarga":
      return 0;
    case "istri":
      return 1;
    case "anak":
      return 2;
    default:
      return 3;
  }
}

export function compareFamilyMembers(left: FamilyMemberOrderInput, right: FamilyMemberOrderInput) {
  const rankDifference = familyRelationshipRank(left.status_dalam_keluarga)
    - familyRelationshipRank(right.status_dalam_keluarga);
  if (rankDifference) return rankDifference;

  const relationDifference = collator.compare(
    normalized(left.status_dalam_keluarga),
    normalized(right.status_dalam_keluarga)
  );
  if (relationDifference) return relationDifference;

  const nameDifference = collator.compare(normalized(left.nama), normalized(right.nama));
  if (nameDifference) return nameDifference;

  const nikDifference = collator.compare(normalized(left.nik), normalized(right.nik));
  if (nikDifference) return nikDifference;

  return collator.compare(normalized(left.id), normalized(right.id));
}

export function compareFamilyNkk(left: string, right: string) {
  return collator.compare(left, right);
}
