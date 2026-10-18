import fc from "fast-check";
import { DESIGNS, type Draft, type LinkConditions } from "@/lib/tool/model";
import { cable, lan, machine } from "./lab";

/**
 * fast-check generators for the editor model's property tests: the values the editor itself
 * writes, so a property holds for every lab someone can draw.
 */

/** A positive number up to `max`, as a field edit keeps one (see `withCondition`). */
const positive = (max: number) => fc.double({ min: 0, max, minExcluded: true, noNaN: true });

/** Conditions as the editor writes them: a delay (a jitter only varies one), a loss up to 100%, a rate in whole kbit/s. */
export const arbitraryConditions: fc.Arbitrary<LinkConditions> = fc.record(
  { delay: positive(1e6), jitter: positive(1e6), loss: positive(100), rate: fc.integer({ min: 1, max: 10_000_000 }).map((kbit) => kbit / 1000) },
  { requiredKeys: ["delay"] },
);

/** A node to draw: a LAN (with its conditions) or a machine. */
const arbitraryNode = fc.record({ id: fc.stringMatching(/^[a-z][a-z0-9-]{0,7}$/), lan: fc.boolean(), tc: fc.option(arbitraryConditions, { nil: undefined }) });

/** A cable between the `from`th and the `to`th node (modulo their count), with its ports and maybe conditions. */
const arbitraryCable = fc.record({ from: fc.nat(), to: fc.nat(), aPort: fc.string(), bPort: fc.string(), tc: fc.option(arbitraryConditions, { nil: undefined }) });

/** A lab as the editor draws one: LANs and machines, and cables between them, each colored for the canvas. */
export const arbitraryLab: fc.Arbitrary<Draft> = fc
  .record({
    name: fc.string(),
    design: fc.constantFrom(undefined, ...DESIGNS),
    nodes: fc.uniqueArray(arbitraryNode, { selector: (n) => n.id, minLength: 1, maxLength: 6 }),
    cables: fc.array(arbitraryCable, { maxLength: 8 }),
  })
  .map(({ name, design, nodes, cables }) => ({
    name,
    design,
    nodes: nodes.map((n) => (n.lan ? lan(n.id, { tc: n.tc }) : machine(n.id))),
    edges: cables.map((c, i) => {
      const [source, target] = [nodes[c.from % nodes.length].id, nodes[c.to % nodes.length].id];
      return cable(`c${String(i)}`, source, target, { aPort: c.aPort, bPort: c.bPort, tc: c.tc, color: "#000" });
    }),
  }));
