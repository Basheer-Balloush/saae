/* One pictogram per SAAE community, sampled into the same dot buffer as the
 * tree and the fruit content.
 *
 * These carry no words. The card beside them names the community and says what
 * it does; asking a dot lattice to render "Quality Entrepreneurship" as well
 * would only produce the smeared type the fruit masks had to be rebuilt to
 * escape. One large, unambiguous mark is what this medium is good at.
 *
 * Drawn much heavier than fruit-content.js: a single icon has the whole frame
 * and the whole dot budget, so strokes are 16 to 20px where the fruit masks
 * use 7 to 9. Below roughly three dots per stroke a line stops reading as a
 * line, and at this scale that is the only rule that matters.
 *
 * The order matches the homepage card, software first: numbering, names and
 * sequence all come from there rather than from anything invented here. The
 * About page keeps its own nine-item order including Quality Entrepreneurship.
 */

const W = 960, H = 560;

export const COMMUNITY_ICONS = [
  "software", "data", "city", "healthcare",
  "research", "economy", "trainers", "media"
];

export function communityMask(index) {
  const key = typeof index === "string" ? index : (COMMUNITY_ICONS[index] || "data");
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext("2d", { willReadFrequently: true });
  c.strokeStyle = "#fff"; c.fillStyle = "#fff";
  c.lineWidth = 18; c.lineCap = "round"; c.lineJoin = "round";

  const line = pts => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
  const shut = pts => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.stroke(); };
  const box = (x, y, w, h, r = 22) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.stroke(); };
  const ell = (x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke(); };
  const arc = (x, y, r, a0, a1) => { c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); };
  const dot = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };

  const cx = W / 2, cy = H / 2;

  switch (key) {

    /* 01 Software -- brackets and a slash, the oldest sign there is. */
    case "software": {
      line([[cx - 118, cy - 150], [cx - 260, cy], [cx - 118, cy + 150]]);
      line([[cx + 118, cy - 150], [cx + 260, cy], [cx + 118, cy + 150]]);
      line([[cx + 44, cy - 168], [cx - 44, cy + 168]]);
      break;
    }

    /* 02 Data -- a stack of records. */
    case "data": {
      const rx = 150, ry = 52;
      for (let i = 0; i < 3; i++) ell(cx, cy - 118 + i * 118, rx, ry);
      line([[cx - rx, cy - 118], [cx - rx, cy + 118]]);
      line([[cx + rx, cy - 118], [cx + rx, cy + 118]]);
      break;
    }

    /* 03 Smart Urban -- a skyline that is clearly built, not drawn. */
    case "city": {
      const base = cy + 150;
      const towers = [[-230, 150], [-110, 250], [10, 190], [130, 300], [250, 170]];
      towers.forEach(([ox, h], i) => {
        const w = 92;
        shut([[cx + ox - w / 2, base], [cx + ox - w / 2, base - h],
              [cx + ox + w / 2, base - h], [cx + ox + w / 2, base]]);
        for (let r = 1; r <= Math.min(3, Math.floor(h / 78)); r++) {
          const y = base - h + r * 56;
          if (y < base - 26) line([[cx + ox - w / 2 + 22, y], [cx + ox + w / 2 - 22, y]]);
        }
        void i;
      });
      line([[cx - 320, base], [cx + 320, base]]);
      break;
    }

    /* 04 Healthcare -- a heart carrying a pulse. */
    case "healthcare": {
      c.beginPath();
      c.moveTo(cx, cy + 150);
      c.bezierCurveTo(cx - 300, cy - 20, cx - 170, cy - 210, cx, cy - 90);
      c.bezierCurveTo(cx + 170, cy - 210, cx + 300, cy - 20, cx, cy + 150);
      c.stroke();
      c.lineWidth = 16;
      line([[cx - 150, cy - 6], [cx - 66, cy - 6], [cx - 28, cy - 76],
            [cx + 22, cy + 62], [cx + 62, cy - 6], [cx + 150, cy - 6]]);
      break;
    }

    /* 05 Smart Research -- a flask, and what comes out of it. */
    case "research": {
      line([[cx - 70, cy - 175], [cx - 70, cy - 40], [cx - 175, cy + 135]]);
      line([[cx + 70, cy - 175], [cx + 70, cy - 40], [cx + 175, cy + 135]]);
      arc(cx, cy + 62, 205, 0.30, Math.PI - 0.30);
      line([[cx - 108, cy - 175], [cx - 32, cy - 175]]);
      line([[cx + 32, cy - 175], [cx + 108, cy - 175]]);
      dot(cx - 62, cy + 62, 20); dot(cx + 24, cy + 96, 15); dot(cx + 74, cy + 40, 11);
      break;
    }

    /* 06 Smart Economy -- growth, stated once. */
    case "economy": {
      /* The line crossed its own bars. Its four vertices sat at y = cy-40,
         -108, -82 and -190 while the bar tops were at cy+40, -30, -100 and
         -170: over the third bar the line was eighteen pixels BELOW the top it
         was supposed to be rising over, so it ran straight through it, and over
         the fourth the twenty pixels of clearance were less than the two
         strokes' combined width. The arrowhead was worse -- its return stroke
         dropped from cy-192 to cy-120, which is inside the tallest bar, and
         read as a notch bitten out of the corner.

         Redrawn so the reading is unambiguous: shorter bars, a line that clears
         every top by the same forty pixels, and the arrow carried past the last
         bar entirely, where an arrow saying "and onward" belongs. */
      const base = cy + 150;
      const cols = [[-210, 75], [-70, 130], [70, 185], [210, 240]];
      cols.forEach(([ox, h]) => box(cx + ox - 46, base - h, 92, h, 14));
      line([[cx - 300, base], [cx + 300, base]]);
      c.lineWidth = 16;
      /* The clearance that matters is at each bar's LEFT edge, not at the
         line's own vertices -- that is where a rising line is closest to the
         top it has just cleared. Measured across every bar: 55, 45, 45 and 42
         pixels centre to centre, which is 38, 28, 28 and 25 of daylight once
         both strokes are counted. Nothing touches. */
      line([[cx - 230, cy + 20], [cx - 90, cy - 35], [cx + 50, cy - 90], [cx + 280, cy - 175]]);
      /* Barbs struck at 32 degrees off the line's own heading, so the head
         points where the line is actually going. */
      line([[cx + 235, cy - 184], [cx + 280, cy - 175], [cx + 252, cy - 139]]);
      break;
    }

    /* 07 Trainers -- one person, and the board they are teaching from. */
    case "trainers": {
      box(cx - 60, cy - 200, 360, 250, 18);
      c.lineWidth = 15;
      line([[cx + 10, cy - 130], [cx + 240, cy - 130]]);
      line([[cx + 10, cy - 66], [cx + 190, cy - 66]]);
      line([[cx + 10, cy - 2], [cx + 226, cy - 2]]);
      c.lineWidth = 18;
      arc(cx - 190, cy - 96, 56, 0, Math.PI * 2);
      line([[cx - 190, cy - 34], [cx - 190, cy + 96]]);
      line([[cx - 264, cy + 16], [cx - 116, cy + 16]]);
      line([[cx - 190, cy + 96], [cx - 250, cy + 196]]);
      line([[cx - 190, cy + 96], [cx - 130, cy + 196]]);
      break;
    }

    /* 08 Media -- a mast, and the signal leaving it. */
    case "media": {
      /* The mask is this canvas and nothing crops it, so anything drawn past an
         edge is not scaled down -- it is cut off. The signal fan was emitted
         from cy-178 at radii 86, 152 and 218, which puts the top of the middle
         arc at y=-50 and the outer one at y=-116. Both were sliced away, and
         what survived of them were their two far ends: the pair of loose commas
         either side of the mast that looked like stray dots the sampler had
         dropped. Only the innermost arc was ever fully drawn.

         The whole mark is lower and tighter now, and every radius is checked
         against the frame: emitting from cy-85 at 66, 112 and 158 puts the
         highest point of the outermost arc at y=37, clear of the edge by more
         than two stroke widths.

         The second arc() in the old loop was also a duplicate. `PI*0.17 - PI`
         and `PI*0.83 - PI` are -0.83PI and -0.17PI, which are the first arc's
         own angles less a full turn -- it drew the same arc twice, in the same
         place, for every radius. */
      const mastTop = cy - 58, mastFoot = cy + 228, legHalf = 98;
      line([[cx, mastTop], [cx, mastFoot]]);
      line([[cx - legHalf, mastFoot], [cx, mastTop], [cx + legHalf, mastFoot]]);
      /* Two braces rather than one: a single crossbar makes a letter A, and the
         mark is meant to be a mast. Each is set on the legs at its own height. */
      for (const y of [cy + 70, cy + 150]) {
        const half = legHalf * (y - mastTop) / (mastFoot - mastTop) - 4;
        line([[cx - half, y], [cx + half, y]]);
      }
      line([[cx - 150, mastFoot], [cx + 150, mastFoot]]);
      dot(cx, cy - 85, 22);
      c.lineWidth = 15;
      for (const r of [66, 112, 158]) arc(cx, cy - 85, r, Math.PI * 1.17, Math.PI * 1.83);
      break;
    }
  }

  const d = c.getImageData(0, 0, W, H).data;
  const a = new Float32Array(W * H);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
  return { a, w: W, h: H, aspect: W / H };
}
