import { readFileSync } from "fs"
import path from "path"
import {
  applyAnswerSectionOverrides,
  parseSekonicFmt,
  sekonicLayoutToDeviceTxtLayout,
} from "../sekonic-fmt-parser"
import { layoutFromJson, parseDeviceTxtContent } from "../device-txt-parser"

const fixtures = path.join(process.cwd(), "packages/exam-import-contract/fixtures")

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

function main() {
  const fmtBytes = new Uint8Array(readFileSync(path.join(fixtures, "EYOTEK_YKS_2022_1.fmt")))
  const layout = parseSekonicFmt({
    bytes: fmtBytes,
    fileName: "EYOTEK_YKS_2022_1.fmt",
    publisher: "EYOTEK",
  })

  assert(layout.type === "sekonic_fmt", "type")
  assert(layout.questionCount === 120, `questionCount ${layout.questionCount}`)
  assert(layout.identityMap.tcNumber === 5, "tc index")
  assert(layout.identityMap.firstName === 2, "firstName")
  assert(layout.answerSections.length === 4, "4 sections")
  assert(layout.answerSections[0]!.name === "TR", "TR")
  assert(layout.answerSections[0]!.activeLength === 40, "TR active")
  assert(layout.answerSections[1]!.activeLength === 20, "SOSYAL active")

  const overridden = applyAnswerSectionOverrides(layout, [
    { activeLength: 40 },
    { activeLength: 20 },
    { activeLength: 40 },
    { activeLength: 25 },
  ])
  assert(overridden.questionCount === 125, `override count ${overridden.questionCount}`)
  assert(overridden.answerSections[3]!.startQuestion === 101, "FEN start")
  assert(overridden.answerSections[3]!.endQuestion === 125, "FEN end")

  const device = sekonicLayoutToDeviceTxtLayout(layout)
  assert(device.fields.answerBlocks.length === 4, "device blocks")
  assert(layoutFromJson(layout).fields.answerBlocks[0]!.activeLength === 40, "layoutFromJson")

  // Sample TXT is different publisher — still parses 120 slots with EYOTEK map (misaligned but non-empty)
  const txtBytes = new Uint8Array(readFileSync(path.join(fixtures, "sample-markview-tyt.txt")))
  const parsed = parseDeviceTxtContent(
    { bytes: txtBytes, encoding: "windows-1254" },
    layoutFromJson(layout)
  )
  assert(parsed.rows.length >= 30, `rows ${parsed.rows.length}`)
  assert(parsed.rows[0]!.answers.length === 120, "answers len")

  // device-txt-v1 aligns with sample TXT
  const v1 = parseDeviceTxtContent(
    { bytes: txtBytes, encoding: "windows-1254" },
    layoutFromJson(JSON.parse(readFileSync(
      path.join(process.cwd(), "packages/exam-import-contract/templates/device-txt-v1.json"),
      "utf-8"
    )))
  )
  assert(v1.rows[1]!.studentNameRaw.includes("ERAY"), "name from v1")
  assert(v1.rows[1]!.bookletVariant === "A", `booklet ${v1.rows[1]!.bookletVariant}`)

  console.log("sekonic-fmt tests OK")
}

main()
