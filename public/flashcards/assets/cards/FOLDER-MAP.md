# Card Art — Folder Map

Card art is organized **by category, then by system**, so every card has an
obvious home and anyone can find or add art without guessing.

```
assets/cards/
├── <industry>/                     one folder per category (deck)
│   ├── README.md                   what this category holds + naming
│   ├── engine-mechanical/          ── one folder per system ──
│   ├── cooling/
│   ├── lubrication/
│   ├── fuel/
│   ├── ignition/
│   ├── air-intake/
│   ├── exhaust-emissions/
│   ├── electrical/
│   ├── drivetrain/                 (where applicable)
│   ├── steering-suspension/        (where applicable)
│   ├── brakes/                     (where applicable)
│   ├── hvac/                       (where applicable)
│   ├── diagnostics/
│   └── safety/
├── engine-id/                      Identify-the-Engine art (by engine)
└── template/                       placeholder reference
```

Categories: small-engine, automotive, motorcycle, heavy-duty, marine-inboard,
marine-outboard, agricultural, industrial. Each only contains the system folders
that actually apply to it (e.g. marine-outboard has no brakes/hvac).

## Where does a card's art go?

Put it in the folder for the card's **primary system**. Example: the
`auto-app-sensor` card (systems: electrical, fuel) lives in
`assets/cards/automotive/electrical/`.

Name the files by the **card id**:

```
<card-id>-front.png    front face   (recommended)
<card-id>-back.png     back face    (recommended)
<card-id>.png          combined (front left / back right) — auto-split
```

Then run `node tools/build-index.js`.

> Art is matched to cards by the **card id in the filename**, not by folder, so
> the folders are purely for tidy organization — a misfiled image still works,
> it's just in the wrong drawer. The build tool prints a per-system card count so
> you can see where coverage is thin.
