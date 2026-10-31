/**
 * Don Report v1 — safe local skill collector.
 * Deliberately separate from greenbox.ts/main: never checks account pages,
 * sends Kmail, uploads profiles, alters character state or enables relay hooks.
 * run: call greenbox/don_greenbox_report.js skills_current [--quiet|--print|--diff]
 */
import {
  getPermedSkills,
  getProperty,
  haveSkill,
  myAscensions,
  myId,
  print,
  Skill,
  toInt,
  todayToString,
} from "kolmafia";

const SAFE = new Set(["skills_current", "help", "status"]);
const OPTIONS = new Set(["--quiet", "--print", "--diff", "--json"]);
export interface CurrentSkill {
  id: number;
  name: string;
  current: boolean;
  perm: "hardcore" | "softcore" | "none";
  level: number;
}
export function collectCurrentSkills(): CurrentSkill[] {
  const perm = getPermedSkills();
  return Skill.all()
    .filter((skill) => haveSkill(skill))
    .map((skill) => {
      const id = toInt(skill);
      const flag = perm[skill.toString()];
      const levelString = getProperty(`skillLevel${id}`);
      const parsedLevel = /^(0|[1-9][0-9]*)$/.test(levelString)
        ? Number(levelString)
        : 0;
      return {
        id,
        name: skill.toString(),
        current: true,
        perm: flag === true ? "hardcore" : flag === false ? "softcore" : "none",
        level: parsedLevel,
      };
    })
    .filter((skill) => skill.id > 0)
    .sort((a, b) => a.id - b.id);
}
export function main(command = "help"): void {
  const args = command.trim().split(/\s+/).filter(Boolean);
  const action = args.shift() || "help";
  if (!SAFE.has(action) || args.some((arg) => !OPTIONS.has(arg))) {
    print("Don Greenbox: unsupported command. No actions taken.", "red");
    return;
  }
  if (action === "help") {
    print(
      "call greenbox/don_greenbox_report.js skills_current [--quiet|--print|--diff|--json]",
    );
    return;
  }
  if (action === "status") {
    print(
      "Don Greenbox report v1: read-only and local; no Kmail or relay hook.",
    );
    return;
  }
  const skills = collectCurrentSkills();
  const scope = `${myId()}:${todayToString()}:${myAscensions()}`;
  if (args.includes("--diff"))
    print(
      "KNOWN_UNKNOWN: prior scoped skill receipt not loaded, no change claimed.",
      "orange",
    );
  if (args.includes("--json")) {
    // Deliberately a console export, not an automatic persisted record.
    print(
      JSON.stringify({
        schema: "don-skill-probe-v1",
        source: "greenbox",
        scope,
        skills,
      }),
    );
  } else if (!args.includes("--quiet") || args.includes("--print")) {
    for (const skill of skills) {
      print(
        `donstate:v1:${scope}:skills:skill/${skill.id}:current = true [${skill.perm}, level=${skill.level}]`,
      );
    }
  }
  print(
    `Greenbox read-only: ${skills.length} currently available skills, no network or player mutation.`,
  );
}
