import { parseDisruptionScope } from "../disruption-scope"

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const school = parseDisruptionScope({})
assert(school.ok && school.scope === "SCHOOL", "empty is school")

const classes = parseDisruptionScope({ scope: "CLASSES", affectedClassIds: ["c1"] })
assert(classes.ok && classes.affectedClassIds[0] === "c1", "classes")

const bad = parseDisruptionScope({ scope: "TEACHER" })
assert(!bad.ok, "teacher needs id")

console.log("disruption-scope: ok")
