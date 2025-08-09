export type ProgramCode = "PS" | "PR" | "LM" | "TE";

export interface Sede {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface Catedra {
  id: string; // e.g., PS-34
  program: ProgramCode;
  programName: string;
  catedraId: number;
  chairLabel: string;
  docenteTitular: string;
  materiaId: string;
  materiaCode: number;
  materiaName: string;
}

export interface SectionRequirement {
  tipo: "Teo" | "Sem";
  label: string;
}

export interface Section {
  id: string; // {term}_{program}_{catedraId}_{tipo}_{sectionLabel}
  termId: string;
  program: ProgramCode;
  programName: string;
  catedraId: number;
  materiaId: string;
  materiaCode: number;
  materiaName: string;
  tipo: "Teo" | "Sem" | "Prac";
  sectionLabel: string;
  docentes: string[];
  vacantes: number | null;
  oblig: string | null;
  requires: SectionRequirement[];
  sedes: string[];
  aulas: string[];
  meetsCount: number;
  updatedAt: number;
}

export interface Meet {
  id: string; // {sectionId}_{n}
  sectionId: string;
  termId: string;
  program: ProgramCode;
  catedraId: number;
  tipo: "Teo" | "Sem" | "Prac";
  sectionLabel: string;
  dayName: string; // lunes..sabado
  dayNum: number; // 1..6
  start: string; // HH:MM
  end: string; // HH:MM
  startMin: number;
  endMin: number;
  aulaCode: string; // e.g., HY-014
  sedeCode: string; // HY
  observ: string | null;
}




