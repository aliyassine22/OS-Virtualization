# Image placeholders

The decorative images still to be generated are listed below. The technical diagrams are already finished: they are drawn from code by `assets/build_diagrams.js`.

| ID | Used on | Suggested size | Prompt |
|---|---|---|---|
| `hero` | Title slide (PPT + React) | 800×1100 (portrait) | Abstract, clean illustration of one physical server splitting into several glowing, isolated translucent virtual machines; deep navy background (#1F2A44) with teal (#0F7C80) and amber (#E59A2B) light accents; no text, no logos. |
| `datacenter` | "What is virtualization?" | 900×900 | Photo-style modern data-center aisle with server racks, cool lighting, shallow depth of field; no brand names. |

## Where to put them

- **React deck:** save the file as `presentation/react-slides/public/images/<ID>.png` (`.jpg` and `.webp` also work). It replaces the dashed placeholder automatically.
- **PowerPoint:** each placeholder is a dashed shape named `IMG_PLACEHOLDER_<ID>`. In PowerPoint, select the shape and its label, delete them, then use *Insert → Picture* at the same position. Alternatively, insert the picture and use *Crop to Shape*.
